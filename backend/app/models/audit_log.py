from datetime import datetime, timezone
import json
from . import db

class AuditAction:
    LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    LOGIN_FAILED = 'LOGIN_FAILED'
    USER_CREATE = 'USER_CREATE'
    USER_UPDATE = 'USER_UPDATE'
    TRANSACTION_CREATE = 'TRANSACTION_CREATE'
    TRANSACTION_IMPORT = 'TRANSACTION_IMPORT'
    RULE_CREATE = 'RULE_CREATE'
    RULE_UPDATE = 'RULE_UPDATE'
    RULE_TOGGLE = 'RULE_TOGGLE'
    ALERT_ASSIGN = 'ALERT_ASSIGN'
    ALERT_STATUS_CHANGE = 'ALERT_STATUS_CHANGE'
    ALERT_DECISION = 'ALERT_DECISION'
    CONFIG_UPDATE = 'CONFIG_UPDATE'

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    actor_username = db.Column(db.String(64), nullable=False, default='system')
    actor_role = db.Column(db.String(32), nullable=True)
    action = db.Column(db.String(64), nullable=False, index=True)
    target_type = db.Column(db.String(64), nullable=True, index=True) # transaction, rule, alert, user, system
    target_id = db.Column(db.String(64), nullable=True, index=True)
    details_json = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    actor = db.relationship('User', foreign_keys=[actor_id], lazy=True)

    @property
    def details(self):
        try:
            return json.loads(self.details_json) if self.details_json else {}
        except Exception:
            return {}

    @details.setter
    def details(self, val):
        if isinstance(val, (dict, list)):
            self.details_json = json.dumps(val)
        elif isinstance(val, str):
            self.details_json = val
        else:
            self.details_json = '{}'

    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'actor_username': self.actor_username,
            'actor_role': self.actor_role,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

    def __repr__(self):
        return f'<AuditLog {self.id}: {self.actor_username} - {self.action} on {self.target_type}:{self.target_id}>'
