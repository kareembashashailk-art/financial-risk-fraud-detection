from datetime import datetime, timezone
from decimal import Decimal
from app.models import db, Transaction, Alert, AlertStatus, ReviewDecision, AlertReviewHistory
from app.services.alert_service import AlertService

def test_alert_generation_and_deduplication(client, app):
    with app.app_context():
        # High risk transaction
        tx = Transaction(
            id='TX-ALERT-TEST-1',
            account_id='ACC-TEST-001',
            amount=Decimal('15000.00'),
            timestamp=datetime.now(timezone.utc),
            merchant_category='retail'
        )
        db.session.add(tx)
        db.session.commit()

        score_summary = {
            'final_score': 75,
            'risk_level': 'HIGH',
            'reasons': ['Transaction amount exceeds limit', 'High velocity']
        }

        # 1. First alert generation
        alert1 = AlertService.process_transaction_alert(tx, score_summary)
        assert alert1 is not None
        assert alert1.risk_score == 75
        assert alert1.status == AlertStatus.NEW
        alert1_id = alert1.id

        # 2. Duplicate generation attempt for same transaction
        alert2 = AlertService.process_transaction_alert(tx, score_summary)
        assert alert2.id == alert1_id
        # Confirm in DB only 1 alert exists for this transaction
        count = Alert.query.filter_by(transaction_id=tx.id).count()
        assert count == 1

def test_reviewer_decision_workflow(client, app, auth_headers):
    with app.app_context():
        tx = Transaction(
            id='TX-ALERT-REV-1',
            account_id='ACC-TEST-001',
            amount=Decimal('8000.00'),
            timestamp=datetime.now(timezone.utc)
        )
        db.session.add(tx)
        db.session.commit()

        alert = Alert(
            id='ALT-REV-001',
            transaction_id=tx.id,
            account_id=tx.account_id,
            risk_score=70,
            risk_level='HIGH',
            status=AlertStatus.NEW
        )
        db.session.add(alert)
        db.session.commit()

    headers = auth_headers('risk_analyst')

    # Analyst marks under review and adds note
    res = client.put('/api/alerts/ALT-REV-001/review', headers=headers, json={
        'status': 'under_review',
        'note': 'Initial analyst review started.'
    })
    assert res.status_code == 200
    data = res.get_json()['alert']
    assert data['status'] == 'under_review'
    assert 'Initial analyst review started.' in data['reviewer_notes']

    # Analyst records final decision: confirmed_suspicious
    res_dec = client.put('/api/alerts/ALT-REV-001/review', headers=headers, json={
        'decision': 'confirmed_suspicious',
        'note': 'Fraud confirmed. Account notified.'
    })
    assert res_dec.status_code == 200
    data_dec = res_dec.get_json()['alert']
    assert data_dec['final_decision'] == 'confirmed_suspicious'
    assert data_dec['status'] == 'closed'
    assert len(data_dec['review_history']) >= 2

def test_read_only_cannot_review_alert(client, auth_headers):
    headers = auth_headers('read_only')
    res = client.put('/api/alerts/ALT-REV-001/review', headers=headers, json={
        'status': 'closed',
        'decision': 'false_positive'
    })
    assert res.status_code == 403
