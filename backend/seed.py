import os
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from app import create_app
from app.models import (
    db, User, Account, Transaction, DetectionRule,
    RuleEvaluationResult, Alert, AlertStatus, ReviewDecision,
    AlertReviewHistory, AuditLog, SystemSetting, RuleType
)
from app.services.rule_engine import FraudRuleEngine
from app.services.alert_service import AlertService
from app.services.audit_service import AuditService, AuditAction

def seed_database():
    app = create_app()
    with app.app_context():
        print("Initializing database tables...")
        db.create_all()

        # 1. System Settings
        print("Seeding System Settings...")
        SystemSetting.set_setting('risk_thresholds', {
            'low_max': 29,
            'medium_max': 59,
            'high_min': 60
        }, 'Default risk scoring tiers (Low: 0-29, Medium: 30-59, High: 60-100)')
        SystemSetting.set_setting('alert_threshold', 60, 'Minimum composite risk score required to automatically raise an alert')
        db.session.commit()

        # 2. Users (Super Admin, Risk Analyst, Read-Only Viewer)
        print("Seeding Users...")
        users_data = [
            {
                'username': 'admin',
                'email': 'admin@demo-fraud-detection.local',
                'password': 'AdminPassword123!',
                'role': 'super_admin',
                'full_name': 'Eleanor Vance (Chief Risk Admin)'
            },
            {
                'username': 'analyst',
                'email': 'analyst@demo-fraud-detection.local',
                'password': 'AnalystPassword123!',
                'role': 'risk_analyst',
                'full_name': 'Marcus Brody (Senior Fraud Reviewer)'
            },
            {
                'username': 'viewer',
                'email': 'viewer@demo-fraud-detection.local',
                'password': 'ViewerPassword123!',
                'role': 'read_only',
                'full_name': 'Claire Redfield (Compliance Auditor - Read Only)'
            }
        ]

        user_objects = {}
        for ud in users_data:
            existing = User.query.filter_by(username=ud['username']).first()
            if not existing:
                user = User(
                    username=ud['username'],
                    email=ud['email'],
                    role=ud['role'],
                    full_name=ud['full_name'],
                    is_active=True
                )
                user.set_password(ud['password'])
                db.session.add(user)
                db.session.flush()
                user_objects[ud['username']] = user
            else:
                user_objects[ud['username']] = existing

        db.session.commit()

        # 3. Detection Rules
        print("Seeding Detection Rules...")
        rules_data = [
            {
                'id': 'RULE_HIGH_AMOUNT',
                'name': 'High Transaction Amount',
                'description': 'Flags transactions where the amount meets or exceeds the defined single-transaction limit.',
                'rule_type': RuleType.HIGH_AMOUNT,
                'is_enabled': True,
                'weight': 60,
                'severity': 'HIGH',
                'parameters': {'threshold_amount': 5000.00}
            },
            {
                'id': 'RULE_RAPID_VELOCITY',
                'name': 'Multiple Transactions in Short Window',
                'description': 'Flags accounts executing multiple rapid transactions within a narrow time window.',
                'rule_type': RuleType.RAPID_VELOCITY,
                'is_enabled': True,
                'weight': 35,
                'severity': 'HIGH',
                'parameters': {'max_count': 3, 'window_seconds': 300}
            },
            {
                'id': 'RULE_TX_FREQUENCY',
                'name': 'Unusual Transaction Frequency',
                'description': 'Flags accounts generating unusually high cumulative transaction frequency within an hour.',
                'rule_type': RuleType.UNUSUAL_FREQUENCY,
                'is_enabled': True,
                'weight': 25,
                'severity': 'MEDIUM',
                'parameters': {'max_count': 5, 'window_hours': 1}
            },
            {
                'id': 'RULE_REPEATED_FAILED',
                'name': 'Repeated Failed Transactions',
                'description': 'Detects brute-force authorization attempts or repeated declined transactions.',
                'rule_type': RuleType.REPEATED_FAILED,
                'is_enabled': True,
                'weight': 30,
                'severity': 'HIGH',
                'parameters': {'max_failed_attempts': 2, 'window_minutes': 30}
            },
            {
                'id': 'RULE_UNUSUAL_LOCATION',
                'name': 'Unusual Location & Impossible Velocity',
                'description': 'Flags transactions matching sanctioned/high-risk jurisdictions or impossible geographical travel between consecutive transactions.',
                'rule_type': RuleType.UNUSUAL_LOCATION,
                'is_enabled': True,
                'weight': 35,
                'severity': 'HIGH',
                'parameters': {
                    'high_risk_locations': ['Unknown Proxy', 'Sanctioned Region', 'Offshore Tax Haven', 'Tor Exit Node'],
                    'check_velocity': True,
                    'impossible_travel_hours': 2
                }
            },
            {
                'id': 'RULE_RESTRICTED_CATEGORY',
                'name': 'High-Risk Merchant Category',
                'description': 'Flags transactions initiated in elevated-risk industries such as offshore gambling or unregulated crypto exchanges.',
                'rule_type': RuleType.CUSTOM,
                'is_enabled': True,
                'weight': 25,
                'severity': 'MEDIUM',
                'parameters': {
                    'restricted_categories': ['crypto', 'gambling', 'unregistered_wire', 'luxury_watch_broker']
                }
            }
        ]

        for rd in rules_data:
            existing = DetectionRule.query.get(rd['id'])
            if not existing:
                rule = DetectionRule(
                    id=rd['id'],
                    name=rd['name'],
                    description=rd['description'],
                    rule_type=rd['rule_type'],
                    is_enabled=rd['is_enabled'],
                    weight=rd['weight'],
                    severity=rd['severity']
                )
                rule.parameters = rd['parameters']
                db.session.add(rule)
        db.session.commit()

        # 4. Fictional Accounts
        print("Seeding Fictional Accounts...")
        accounts_data = [
            {
                'id': 'ACC-001',
                'account_number': '1000889211',
                'customer_name': 'Sarah Jenkins (Normal Retail User)',
                'customer_email': 'sarah.j@example.com',
                'account_type': 'checking',
                'risk_segment': 'low',
                'balance': Decimal('14500.00'),
                'currency': 'USD'
            },
            {
                'id': 'ACC-002',
                'account_number': '1000889222',
                'customer_name': 'Apex Global Trading LLC (Corporate)',
                'customer_email': 'operations@apex-global.example',
                'account_type': 'business',
                'risk_segment': 'standard',
                'balance': Decimal('285000.00'),
                'currency': 'USD'
            },
            {
                'id': 'ACC-003',
                'account_number': '1000889233',
                'customer_name': 'David Miller (Flagged for High Amount)',
                'customer_email': 'david.miller@example.com',
                'account_type': 'savings',
                'risk_segment': 'high_risk',
                'balance': Decimal('75000.00'),
                'currency': 'USD'
            },
            {
                'id': 'ACC-004',
                'account_number': '1000889244',
                'customer_name': 'Elena Rostova (Velocity & Card Testing)',
                'customer_email': 'elena.rostova@example.com',
                'account_type': 'checking',
                'risk_segment': 'standard',
                'balance': Decimal('8400.00'),
                'currency': 'USD'
            },
            {
                'id': 'ACC-005',
                'account_number': '1000889255',
                'customer_name': 'Liam Chen (Multi-Rule Suspicious Incident)',
                'customer_email': 'liam.chen@example.com',
                'account_type': 'checking',
                'risk_segment': 'high_risk',
                'balance': Decimal('42000.00'),
                'currency': 'USD'
            }
        ]

        for ad in accounts_data:
            existing = Account.query.get(ad['id'])
            if not existing:
                account = Account(
                    id=ad['id'],
                    account_number=ad['account_number'],
                    customer_name=ad['customer_name'],
                    customer_email=ad['customer_email'],
                    account_type=ad['account_type'],
                    risk_segment=ad['risk_segment'],
                    balance=ad['balance'],
                    currency=ad['currency']
                )
                db.session.add(account)
        db.session.commit()

        # 5. Transactions (Past 14 Days including deterministic test cases)
        print("Seeding Synthetic Transactions and running Fraud Engine...")
        now = datetime.now(timezone.utc)

        # Baseline normal transactions over past 10 days
        historical_normal = [
            ('ACC-001', Decimal('42.50'), 'Trader Joe Groceries', 'groceries', 'in_store', 'completed', 'Seattle, US', now - timedelta(days=9, hours=4)),
            ('ACC-001', Decimal('18.75'), 'Starbucks Coffee', 'food_beverage', 'in_store', 'completed', 'Seattle, US', now - timedelta(days=8, hours=2)),
            ('ACC-001', Decimal('129.99'), 'Target Superstore', 'retail', 'in_store', 'completed', 'Seattle, US', now - timedelta(days=7, hours=6)),
            ('ACC-001', Decimal('85.00'), 'Chevron Gas', 'fuel', 'in_store', 'completed', 'Seattle, US', now - timedelta(days=5, hours=3)),
            ('ACC-001', Decimal('64.20'), 'Amazon.com Online Store', 'online_retail', 'online', 'completed', 'Seattle, US', now - timedelta(days=3, hours=5)),
            ('ACC-001', Decimal('12.50'), 'Subway Sandwiches', 'food_beverage', 'in_store', 'completed', 'Seattle, US', now - timedelta(days=1, hours=1)),
            ('ACC-002', Decimal('1200.00'), 'Cloud Hosting Services AWS', 'software', 'online', 'completed', 'New York, US', now - timedelta(days=9, hours=1)),
            ('ACC-002', Decimal('3450.00'), 'Office Tech Equipment', 'electronics', 'online', 'completed', 'New York, US', now - timedelta(days=6, hours=4)),
            ('ACC-002', Decimal('890.00'), 'SaaS Business Subscription', 'software', 'online', 'completed', 'New York, US', now - timedelta(days=4, hours=2)),
            ('ACC-002', Decimal('2100.00'), 'Logistics Freight Courier', 'travel', 'wire', 'completed', 'New York, US', now - timedelta(days=2, hours=7)),
        ]

        tx_counter = 1
        for acc_id, amount, merchant, cat, channel, status, loc, ts in historical_normal:
            tx_id = f"TXN-NORM-{tx_counter:04d}"
            tx_counter += 1
            if not Transaction.query.get(tx_id):
                tx = Transaction(
                    id=tx_id,
                    account_id=acc_id,
                    amount=amount,
                    currency='USD',
                    timestamp=ts,
                    merchant_name=merchant,
                    merchant_category=cat,
                    channel=channel,
                    status=status,
                    location=loc,
                    created_at=ts
                )
                db.session.add(tx)
                db.session.flush()
                all_evals, score_summary = FraudRuleEngine.evaluate_transaction(tx)
                tx.risk_score = score_summary['final_score']
                tx.risk_level = score_summary['risk_level']
                tx.triggered_rules = score_summary['breakdown']
                for ev in all_evals:
                    db.session.add(RuleEvaluationResult(
                        transaction_id=tx.id,
                        rule_id=ev['rule_id'],
                        rule_name=ev['rule_name'],
                        is_triggered=ev['is_triggered'],
                        weight_contributed=ev['weight_contributed'],
                        reason=ev['reason'],
                        details_json=json.dumps(ev['details']),
                        evaluated_at=ts
                    ))
                AlertService.process_transaction_alert(tx, score_summary)

        # 6. Specific Demonstration Scenarios (as requested by prompt)
        
        # Scenario A: Normal low-value transaction (Risk: LOW)
        tx_a_id = "TXN-SCENARIO-A"
        if not Transaction.query.get(tx_a_id):
            tx_a = Transaction(
                id=tx_a_id,
                account_id='ACC-001',
                amount=Decimal('35.20'),
                currency='USD',
                timestamp=now - timedelta(hours=8),
                merchant_name='Local Pharmacy & Wellness',
                merchant_category='pharmacy',
                channel='in_store',
                status='completed',
                location='Seattle, US',
                created_at=now - timedelta(hours=8)
            )
            db.session.add(tx_a)
            db.session.flush()
            evals, summary = FraudRuleEngine.evaluate_transaction(tx_a)
            tx_a.risk_score = summary['final_score']
            tx_a.risk_level = summary['risk_level']
            tx_a.triggered_rules = summary['breakdown']
            for ev in evals:
                db.session.add(RuleEvaluationResult(
                    transaction_id=tx_a.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_a.timestamp
                ))
            AlertService.process_transaction_alert(tx_a, summary)

        # Scenario B: High Transaction Amount Exceeding Threshold ($18,500 >= $5,000 threshold)
        tx_b_id = "TXN-SCENARIO-B"
        if not Transaction.query.get(tx_b_id):
            tx_b = Transaction(
                id=tx_b_id,
                account_id='ACC-003',
                amount=Decimal('18500.00'),
                currency='USD',
                timestamp=now - timedelta(hours=6),
                merchant_name='Luxury Watch & Gold Exchange',
                merchant_category='luxury_retail',
                channel='online',
                status='completed',
                location='New York, US',
                created_at=now - timedelta(hours=6)
            )
            db.session.add(tx_b)
            db.session.flush()
            evals, summary = FraudRuleEngine.evaluate_transaction(tx_b)
            tx_b.risk_score = summary['final_score']
            tx_b.risk_level = summary['risk_level']
            tx_b.triggered_rules = summary['breakdown']
            for ev in evals:
                db.session.add(RuleEvaluationResult(
                    transaction_id=tx_b.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_b.timestamp
                ))
            alt_b = AlertService.process_transaction_alert(tx_b, summary)
            if alt_b and user_objects.get('analyst'):
                # Simulate reviewer triage
                AlertService.update_alert_review(
                    alt_b, user_objects['analyst'],
                    new_status=AlertStatus.UNDER_REVIEW,
                    note="High amount transaction flagged. Contacting account holder for transaction verification."
                )

        # Scenario C: Rapid Velocity (Multiple transactions within 5 minutes)
        # 3 rapid transactions for ACC-004
        base_velo_time = now - timedelta(hours=4)
        for i, (amt, merchant) in enumerate([
            (Decimal('450.00'), 'BestBuy Tech Store Online'),
            (Decimal('490.00'), 'Apple Retail Store'),
            (Decimal('499.00'), 'GameStop Digital Card')
        ]):
            tx_v_id = f"TXN-SCENARIO-C{i+1}"
            if not Transaction.query.get(tx_v_id):
                tx_v = Transaction(
                    id=tx_v_id,
                    account_id='ACC-004',
                    amount=amt,
                    currency='USD',
                    timestamp=base_velo_time + timedelta(seconds=i * 60), # 1 minute apart
                    merchant_name=merchant,
                    merchant_category='electronics',
                    channel='online',
                    status='completed',
                    location='Chicago, US',
                    created_at=base_velo_time + timedelta(seconds=i * 60)
                )
                db.session.add(tx_v)
                db.session.flush()
                evals, summary = FraudRuleEngine.evaluate_transaction(tx_v)
                tx_v.risk_score = summary['final_score']
                tx_v.risk_level = summary['risk_level']
                tx_v.triggered_rules = summary['breakdown']
                for ev in evals:
                    db.session.add(RuleEvaluationResult(
                        transaction_id=tx_v.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                        is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                        reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_v.timestamp
                    ))
                AlertService.process_transaction_alert(tx_v, summary)

        # Scenario D: Repeated Failed Transactions (Card testing pattern)
        base_fail_time = now - timedelta(hours=3)
        for i in range(3):
            tx_f_id = f"TXN-SCENARIO-D{i+1}"
            if not Transaction.query.get(tx_f_id):
                tx_f = Transaction(
                    id=tx_f_id,
                    account_id='ACC-004',
                    amount=Decimal(f"{150 + i * 50}.00"),
                    currency='USD',
                    timestamp=base_fail_time + timedelta(minutes=i * 5),
                    merchant_name='Online Crypto Checkout Gateway',
                    merchant_category='crypto',
                    channel='online',
                    status='failed',
                    location='Miami, US',
                    created_at=base_fail_time + timedelta(minutes=i * 5)
                )
                db.session.add(tx_f)
                db.session.flush()
                evals, summary = FraudRuleEngine.evaluate_transaction(tx_f)
                tx_f.risk_score = summary['final_score']
                tx_f.risk_level = summary['risk_level']
                tx_f.triggered_rules = summary['breakdown']
                for ev in evals:
                    db.session.add(RuleEvaluationResult(
                        transaction_id=tx_f.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                        is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                        reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_f.timestamp
                    ))
                AlertService.process_transaction_alert(tx_f, summary)

        # Scenario E: Multi-Rule Trigger (High Amount + Restricted Category + High-Risk Location)
        # Earlier baseline transaction in New York 45 minutes prior to impossible location
        tx_pre_id = "TXN-SCENARIO-E-PRE"
        if not Transaction.query.get(tx_pre_id):
            tx_pre = Transaction(
                id=tx_pre_id,
                account_id='ACC-005',
                amount=Decimal('150.00'),
                currency='USD',
                timestamp=now - timedelta(minutes=90),
                merchant_name='Whole Foods Market',
                merchant_category='groceries',
                channel='in_store',
                status='completed',
                location='New York, US',
                created_at=now - timedelta(minutes=90)
            )
            db.session.add(tx_pre)
            db.session.flush()
            evals, summary = FraudRuleEngine.evaluate_transaction(tx_pre)
            tx_pre.risk_score = summary['final_score']
            tx_pre.risk_level = summary['risk_level']
            tx_pre.triggered_rules = summary['breakdown']
            for ev in evals:
                db.session.add(RuleEvaluationResult(
                    transaction_id=tx_pre.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_pre.timestamp
                ))
            AlertService.process_transaction_alert(tx_pre, summary)

        # The multi-rule incident transaction: $12,500 at crypto category from Tor Exit Node
        tx_multi_id = "TXN-SCENARIO-E-MULTI"
        if not Transaction.query.get(tx_multi_id):
            tx_multi = Transaction(
                id=tx_multi_id,
                account_id='ACC-005',
                amount=Decimal('12500.00'),
                currency='USD',
                timestamp=now - timedelta(minutes=30),
                merchant_name='Offshore Crypto Anonymizer',
                merchant_category='crypto',
                channel='online',
                status='completed',
                location='Tor Exit Node',
                created_at=now - timedelta(minutes=30)
            )
            db.session.add(tx_multi)
            db.session.flush()
            evals, summary = FraudRuleEngine.evaluate_transaction(tx_multi)
            tx_multi.risk_score = summary['final_score']
            tx_multi.risk_level = summary['risk_level']
            tx_multi.triggered_rules = summary['breakdown']
            for ev in evals:
                db.session.add(RuleEvaluationResult(
                    transaction_id=tx_multi.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_multi.timestamp
                ))
            alt_multi = AlertService.process_transaction_alert(tx_multi, summary)
            if alt_multi and user_objects.get('analyst'):
                AlertService.update_alert_review(
                    alt_multi, user_objects['analyst'],
                    new_status=AlertStatus.CLOSED,
                    decision=ReviewDecision.CONFIRMED_SUSPICIOUS,
                    note="High confidence fraud attempt. Multi-rule violation: >$12k to unregulated crypto service originating from anonymized Tor Node within 1 hour of NY retail transaction. Account frozen."
                )

        # Scenario F: False positive example for dashboard statistics
        tx_fp_id = "TXN-SCENARIO-FP"
        if not Transaction.query.get(tx_fp_id):
            tx_fp = Transaction(
                id=tx_fp_id,
                account_id='ACC-002',
                amount=Decimal('8200.00'),
                currency='USD',
                timestamp=now - timedelta(days=2),
                merchant_name='Dell Enterprise Servers',
                merchant_category='electronics',
                channel='wire',
                status='completed',
                location='New York, US',
                created_at=now - timedelta(days=2)
            )
            db.session.add(tx_fp)
            db.session.flush()
            evals, summary = FraudRuleEngine.evaluate_transaction(tx_fp)
            tx_fp.risk_score = summary['final_score']
            tx_fp.risk_level = summary['risk_level']
            tx_fp.triggered_rules = summary['breakdown']
            for ev in evals:
                db.session.add(RuleEvaluationResult(
                    transaction_id=tx_fp.id, rule_id=ev['rule_id'], rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'], weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'], details_json=json.dumps(ev['details']), evaluated_at=tx_fp.timestamp
                ))
            alt_fp = AlertService.process_transaction_alert(tx_fp, summary)
            if alt_fp and user_objects.get('analyst'):
                AlertService.update_alert_review(
                    alt_fp, user_objects['analyst'],
                    new_status=AlertStatus.CLOSED,
                    decision=ReviewDecision.FALSE_POSITIVE,
                    note="Confirmed legitimate corporate server purchase with authorized corporate finance officer."
                )

        db.session.commit()
        print("Database seeded successfully with deterministic demonstration data!")

if __name__ == '__main__':
    seed_database()
