import pytest
from datetime import datetime, timezone
from decimal import Decimal
from app import create_app
from app.config import TestingConfig
from app.models import db, User, Account, DetectionRule, Transaction, SystemSetting, RuleType
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='session')
def app():
    app = create_app(TestingConfig)
    return app

@pytest.fixture(scope='function')
def client(app):
    with app.app_context():
        db.create_all()
        # Seed default thresholds
        SystemSetting.set_setting('risk_thresholds', {'low_max': 29, 'medium_max': 59, 'high_min': 60})
        SystemSetting.set_setting('alert_threshold', 60)

        # Seed standard users
        admin = User(username='test_admin', email='admin@test.local', role='super_admin', full_name='Admin Test')
        admin.set_password('Admin123!')

        analyst = User(username='test_analyst', email='analyst@test.local', role='risk_analyst', full_name='Analyst Test')
        analyst.set_password('Analyst123!')

        viewer = User(username='test_viewer', email='viewer@test.local', role='read_only', full_name='Viewer Test')
        viewer.set_password('Viewer123!')

        db.session.add_all([admin, analyst, viewer])

        # Seed base accounts
        acc = Account(
            id='ACC-TEST-001',
            account_number='ACC-NUM-001',
            customer_name='John Test',
            balance=Decimal('50000.00'),
            currency='USD'
        )
        db.session.add(acc)

        # Seed base rules
        r1 = DetectionRule(
            id='RULE_HIGH_AMOUNT',
            name='High Amount Rule',
            description='Test high amount',
            rule_type=RuleType.HIGH_AMOUNT,
            is_enabled=True,
            weight=60,
            severity='HIGH'
        )
        r1.parameters = {'threshold_amount': 5000.00}

        r2 = DetectionRule(
            id='RULE_RAPID_VELOCITY',
            name='Rapid Velocity Rule',
            description='Test velocity',
            rule_type=RuleType.RAPID_VELOCITY,
            is_enabled=True,
            weight=35,
            severity='HIGH'
        )
        r2.parameters = {'max_count': 3, 'window_seconds': 300}

        r3 = DetectionRule(
            id='RULE_REPEATED_FAILED',
            name='Repeated Failures',
            description='Test repeated failures',
            rule_type=RuleType.REPEATED_FAILED,
            is_enabled=True,
            weight=30,
            severity='HIGH'
        )
        r3.parameters = {'max_failed_attempts': 2, 'window_minutes': 30}

        r4 = DetectionRule(
            id='RULE_UNUSUAL_LOCATION',
            name='Unusual Location',
            description='Test location',
            rule_type=RuleType.UNUSUAL_LOCATION,
            is_enabled=True,
            weight=35,
            severity='HIGH'
        )
        r4.parameters = {
            'high_risk_locations': ['Sanctioned Zone', 'Tor Exit Node'],
            'check_velocity': True,
            'impossible_travel_hours': 2
        }

        r5 = DetectionRule(
            id='RULE_RESTRICTED_CATEGORY',
            name='Restricted Category',
            description='Test category',
            rule_type=RuleType.CUSTOM,
            is_enabled=True,
            weight=25,
            severity='MEDIUM'
        )
        r5.parameters = {'restricted_categories': ['crypto', 'gambling']}

        db.session.add_all([r1, r2, r3, r4, r5])
        db.session.commit()

        yield app.test_client()

        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_headers(app):
    def _headers(role='super_admin'):
        with app.app_context():
            user = User.query.filter_by(role=role).first()
            token = create_access_token(identity=str(user.id))
            return {'Authorization': f'Bearer {token}'}
    return _headers
