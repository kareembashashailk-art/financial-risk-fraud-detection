from datetime import datetime, timezone
import json
from . import db

class AlertStatus:
    NEW = 'new'
    UNDER_REVIEW = 'under_review'
    ESCALATED = 'escalated'
    CLOSED = 'closed'

    ALL_STATUSES = [NEW, UNDER_REVIEW, ESCALATED, CLOSED]

class ReviewDecision:
    CONFIRMED_SUSPICIOUS = 'confirmed_suspicious'
    FALSE_POSITIVE = 'false_positive'
    NEEDS_INVESTIGATION = 'needs_further_investigation'

    ALL_DECISIONS = [CONFIRMED_SUSPICIOUS, FALSE_POSITIVE, NEEDS_INVESTIGATION]

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.String(36), primary_key=True) # e.g. ALT-0001
    transaction_id = db.Column(db.String(36), db.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    account_id = db.Column(db.String(36), db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False, index=True)
    risk_score = db.Column(db.Integer, nullable=False, index=True)
    risk_level = db.Column(db.String(16), nullable=False, index=True)
    triggered_rule_reasons_json = db.Column(db.Text, default='[]', nullable=False)
    status = db.Column(db.String(32), default=AlertStatus.NEW, nullable=False, index=True)
    assigned_reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    reviewer_notes = db.Column(db.Text, nullable=True)
    final_decision = db.Column(db.String(32), nullable=True, index=True)
    decision_timestamp = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    account = db.relationship('Account', backref='alerts', lazy=True)
    assigned_reviewer = db.relationship('User', foreign_keys=[assigned_reviewer_id], backref='assigned_alerts', lazy=True)
    review_history = db.relationship('AlertReviewHistory', backref='alert', lazy='dynamic', cascade='all, delete-orphan', order_by='desc(AlertReviewHistory.timestamp)')

    @property
    def triggered_rule_reasons(self):
        try:
            return json.loads(self.triggered_rule_reasons_json) if self.triggered_rule_reasons_json else []
        except Exception:
            return []

    @triggered_rule_reasons.setter
    def triggered_rule_reasons(self, val):
        if isinstance(val, (list, dict)):
            self.triggered_rule_reasons_json = json.dumps(val)
        elif isinstance(val, str):
            json.loads(val)
            self.triggered_rule_reasons_json = val
        else:
            self.triggered_rule_reasons_json = '[]'

    def to_dict(self, include_history=False):
        data = {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'account_id': self.account_id,
            'customer_name': self.account.customer_name if self.account else None,
            'transaction_amount': float(self.transaction.amount) if self.transaction and self.transaction.amount is not None else 0.0,
            'currency': self.transaction.currency if self.transaction else 'USD',
            'transaction_timestamp': self.transaction.timestamp.isoformat() if self.transaction and self.transaction.timestamp else None,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'triggered_rule_reasons': self.triggered_rule_reasons,
            'status': self.status,
            'assigned_reviewer_id': self.assigned_reviewer_id,
            'assigned_reviewer_name': self.assigned_reviewer.full_name or self.assigned_reviewer.username if self.assigned_reviewer else None,
            'reviewer_notes': self.reviewer_notes,
            'final_decision': self.final_decision,
            'decision_timestamp': self.decision_timestamp.isoformat() if self.decision_timestamp else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_history:
            data['review_history'] = [h.to_dict() for h in self.review_history.all()]
        return data

    def __repr__(self):
        return f'<Alert {self.id} for TXN {self.transaction_id} (Score: {self.risk_score}, Status: {self.status})>'


class AlertReviewHistory(db.Model):
    __tablename__ = 'alert_review_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    alert_id = db.Column(db.String(36), db.ForeignKey('alerts.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    reviewer_username = db.Column(db.String(64), nullable=False)
    previous_status = db.Column(db.String(32), nullable=True)
    new_status = db.Column(db.String(32), nullable=False)
    decision = db.Column(db.String(32), nullable=True)
    note = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    reviewer = db.relationship('User', foreign_keys=[reviewer_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'reviewer_id': self.reviewer_id,
            'reviewer_username': self.reviewer_username,
            'previous_status': self.previous_status,
            'new_status': self.new_status,
            'decision': self.decision,
            'note': self.note,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
