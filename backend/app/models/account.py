from datetime import datetime, timezone
from . import db

class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.String(36), primary_key=True) # e.g. ACC-1001 or UUID
    account_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    customer_name = db.Column(db.String(120), nullable=False)
    customer_email = db.Column(db.String(120), nullable=True)
    account_type = db.Column(db.String(32), default='checking', nullable=False) # checking, savings, business
    risk_segment = db.Column(db.String(32), default='standard', nullable=False) # low, standard, high_risk
    status = db.Column(db.String(32), default='active', nullable=False) # active, frozen, closed
    balance = db.Column(db.Numeric(15, 2), default=0.00, nullable=False)
    currency = db.Column(db.String(3), default='USD', nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    transactions = db.relationship('Transaction', backref='account', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'account_number': self.account_number,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'account_type': self.account_type,
            'risk_segment': self.risk_segment,
            'status': self.status,
            'balance': float(self.balance) if self.balance is not None else 0.0,
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Account {self.account_number} ({self.customer_name})>'
