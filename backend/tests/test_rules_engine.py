from datetime import datetime, timedelta, timezone
from decimal import Decimal
from app.models import db, Transaction, DetectionRule
from app.services.rule_engine import FraudRuleEngine

def test_high_amount_rule(client, app):
    with app.app_context():
        # Below threshold ($4,999 < $5,000)
        tx_low = Transaction(
            id='TX-TEST-HA-1',
            account_id='ACC-TEST-001',
            amount=Decimal('4999.00'),
            timestamp=datetime.now(timezone.utc),
            merchant_category='retail'
        )
        db.session.add(tx_low)
        evals, summary = FraudRuleEngine.evaluate_transaction(tx_low)
        ha_eval = next(e for e in evals if e['rule_id'] == 'RULE_HIGH_AMOUNT')
        assert ha_eval['is_triggered'] is False

        # At/above threshold ($5,000 >= $5,000)
        tx_high = Transaction(
            id='TX-TEST-HA-2',
            account_id='ACC-TEST-001',
            amount=Decimal('5000.00'),
            timestamp=datetime.now(timezone.utc),
            merchant_category='retail'
        )
        db.session.add(tx_high)
        evals, summary = FraudRuleEngine.evaluate_transaction(tx_high)
        ha_eval = next(e for e in evals if e['rule_id'] == 'RULE_HIGH_AMOUNT')
        assert ha_eval['is_triggered'] is True
        assert ha_eval['weight_contributed'] == 60
        assert "meets or exceeds threshold limit" in ha_eval['reason']

def test_rapid_velocity_rule(client, app):
    with app.app_context():
        now = datetime.now(timezone.utc)
        # Create 2 previous transactions in last 2 minutes
        t1 = Transaction(id='TX-VELO-1', account_id='ACC-TEST-001', amount=Decimal('50.00'), timestamp=now - timedelta(minutes=2))
        t2 = Transaction(id='TX-VELO-2', account_id='ACC-TEST-001', amount=Decimal('60.00'), timestamp=now - timedelta(minutes=1))
        db.session.add_all([t1, t2])
        db.session.commit()

        # 3rd transaction within 5 minutes triggers velocity (threshold: 3)
        t3 = Transaction(id='TX-VELO-3', account_id='ACC-TEST-001', amount=Decimal('70.00'), timestamp=now)
        db.session.add(t3)
        evals, summary = FraudRuleEngine.evaluate_transaction(t3)
        velo_eval = next(e for e in evals if e['rule_id'] == 'RULE_RAPID_VELOCITY')
        assert velo_eval['is_triggered'] is True
        assert "Rapid velocity detected" in velo_eval['reason']

def test_repeated_failed_transactions_rule(client, app):
    with app.app_context():
        now = datetime.now(timezone.utc)
        # 1 prior failure
        f1 = Transaction(id='TX-FAIL-1', account_id='ACC-TEST-001', amount=Decimal('100.00'), status='failed', timestamp=now - timedelta(minutes=10))
        db.session.add(f1)
        db.session.commit()

        # Current transaction also fails (2 failures in 30 mins -> triggers)
        f2 = Transaction(id='TX-FAIL-2', account_id='ACC-TEST-001', amount=Decimal('100.00'), status='failed', timestamp=now)
        db.session.add(f2)
        evals, summary = FraudRuleEngine.evaluate_transaction(f2)
        fail_eval = next(e for e in evals if e['rule_id'] == 'RULE_REPEATED_FAILED')
        assert fail_eval['is_triggered'] is True
        assert "2 failed attempts detected" in fail_eval['reason']

def test_unusual_location_rule_missing_data(client, app):
    with app.app_context():
        # Missing location must NOT infer fraud (per requirements)
        tx = Transaction(id='TX-LOC-NONE', account_id='ACC-TEST-001', amount=Decimal('100.00'), location=None, timestamp=datetime.now(timezone.utc))
        evals, _ = FraudRuleEngine.evaluate_transaction(tx)
        loc_eval = next(e for e in evals if e['rule_id'] == 'RULE_UNUSUAL_LOCATION')
        assert loc_eval['is_triggered'] is False

def test_unusual_location_watchlist_and_impossible_travel(client, app):
    with app.app_context():
        now = datetime.now(timezone.utc)
        # Watchlist match
        tx_tor = Transaction(id='TX-LOC-TOR', account_id='ACC-TEST-001', amount=Decimal('100.00'), location='Tor Exit Node', timestamp=now)
        evals, _ = FraudRuleEngine.evaluate_transaction(tx_tor)
        loc_eval = next(e for e in evals if e['rule_id'] == 'RULE_UNUSUAL_LOCATION')
        assert loc_eval['is_triggered'] is True
        assert "matches high-risk geography watchlist" in loc_eval['reason']

        # Impossible Travel: previous in New York, next in Tokyo within 30 minutes
        tx_ny = Transaction(id='TX-NY', account_id='ACC-TEST-001', amount=Decimal('50.00'), location='New York, US', timestamp=now - timedelta(minutes=30))
        db.session.add(tx_ny)
        db.session.commit()

        tx_tokyo = Transaction(id='TX-TOKYO', account_id='ACC-TEST-001', amount=Decimal('50.00'), location='Tokyo, JP', timestamp=now)
        db.session.add(tx_tokyo)
        evals, _ = FraudRuleEngine.evaluate_transaction(tx_tokyo)
        loc_eval = next(e for e in evals if e['rule_id'] == 'RULE_UNUSUAL_LOCATION')
        assert loc_eval['is_triggered'] is True
        assert "Impossible Travel" in loc_eval['reason']

def test_custom_restricted_category_rule(client, app):
    with app.app_context():
        tx_crypto = Transaction(id='TX-CRYPTO', account_id='ACC-TEST-001', amount=Decimal('500.00'), merchant_category='crypto', timestamp=datetime.now(timezone.utc))
        evals, _ = FraudRuleEngine.evaluate_transaction(tx_crypto)
        cat_eval = next(e for e in evals if e['rule_id'] == 'RULE_RESTRICTED_CATEGORY')
        assert cat_eval['is_triggered'] is True
        assert "matches restricted/high-risk business category" in cat_eval['reason']
