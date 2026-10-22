from datetime import datetime, timezone
import json
from . import db

class TransactionRiskLevel:
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'

class TransactionStatus:
    COMPLETED = 'completed'
    PENDING = 'pending'
    FAILED = 'failed'

class TransactionChannel:
    ONLINE = 'online'
    IN_STORE = 'in_store'
    ATM = 'atm'
    WIRE = 'wire'

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.String(36), primary_key=True) # e.g. TXN-0001
    account_id = db.Column(db.String(36), db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD', nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    merchant_name = db.Column(db.String(120), nullable=True)
    merchant_category = db.Column(db.String(64), nullable=True)
    channel = db.Column(db.String(32), default=TransactionChannel.ONLINE, nullable=False)
    status = db.Column(db.String(32), default=TransactionStatus.COMPLETED, nullable=False, index=True)
    location = db.Column(db.String(120), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    
    # Risk and Rule Engine Outputs
    risk_score = db.Column(db.Integer, default=0, nullable=False, index=True)
    risk_level = db.Column(db.String(16), default=TransactionRiskLevel.LOW, nullable=False, index=True)
    triggered_rules_json = db.Column(db.Text, default='[]', nullable=False)
    is_flagged = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    rule_results = db.relationship('RuleEvaluationResult', backref='transaction', lazy='dynamic', cascade='all, delete-orphan')
    alerts = db.relationship('Alert', backref='transaction', lazy='dynamic', cascade='all, delete-orphan')

    @property
    def triggered_rules(self):
        try:
            return json.loads(self.triggered_rules_json) if self.triggered_rules_json else []
        except Exception:
            return []

    @triggered_rules.setter
    def triggered_rules(self, val):
        if isinstance(val, (list, dict)):
            self.triggered_rules_json = json.dumps(val)
        elif isinstance(val, str):
            json.loads(val)
            self.triggered_rules_json = val
        else:
            self.triggered_rules_json = '[]'

    def to_dict(self, include_rule_results=False):
        data = {
            'id': self.id,
            'account_id': self.account_id,
            'customer_name': self.account.customer_name if self.account else None,
            'amount': float(self.amount) if self.amount is not None else 0.0,
            'currency': self.currency,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'merchant_name': self.merchant_name,
            'merchant_category': self.merchant_category,
            'channel': self.channel,
            'status': self.status,
            'location': self.location,
            'ip_address': self.ip_address,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'triggered_rules': self.triggered_rules,
            'is_flagged': self.is_flagged,
            'has_alert': self.alerts.count() > 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_rule_results:
            data['rule_results'] = [r.to_dict() for r in self.rule_results.all()]
        return data

    def __repr__(self):
        return f'<Transaction {self.id}: {self.currency} {self.amount} (Score: {self.risk_score})>'
