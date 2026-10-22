from datetime import datetime, timezone
import json
from . import db

class RuleType:
    HIGH_AMOUNT = 'high_amount'
    RAPID_VELOCITY = 'rapid_velocity'
    UNUSUAL_FREQUENCY = 'unusual_frequency'
    REPEATED_FAILED = 'repeated_failed'
    UNUSUAL_LOCATION = 'unusual_location'
    CUSTOM = 'custom'

class DetectionRule(db.Model):
    __tablename__ = 'detection_rules'

    id = db.Column(db.String(64), primary_key=True) # e.g. RULE_HIGH_AMOUNT
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rule_type = db.Column(db.String(64), nullable=False, default=RuleType.CUSTOM)
    is_enabled = db.Column(db.Boolean, default=True, nullable=False, index=True)
    parameters_json = db.Column(db.Text, nullable=False, default='{}') # Safe JSON serialized parameters
    weight = db.Column(db.Integer, default=25, nullable=False) # Contributed points (0-100)
    severity = db.Column(db.String(16), default='MEDIUM', nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    evaluation_results = db.relationship('RuleEvaluationResult', backref='rule', lazy='dynamic')

    @property
    def parameters(self):
        try:
            return json.loads(self.parameters_json) if self.parameters_json else {}
        except Exception:
            return {}

    @parameters.setter
    def parameters(self, val):
        if isinstance(val, dict):
            self.parameters_json = json.dumps(val)
        elif isinstance(val, str):
            # Validate JSON
            json.loads(val)
            self.parameters_json = val
        else:
            self.parameters_json = '{}'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'rule_type': self.rule_type,
            'is_enabled': self.is_enabled,
            'parameters': self.parameters,
            'weight': self.weight,
            'severity': self.severity,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<DetectionRule {self.id}: {self.name} (enabled={self.is_enabled})>'


class RuleEvaluationResult(db.Model):
    __tablename__ = 'rule_evaluation_results'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id = db.Column(db.String(36), db.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False, index=True)
    rule_id = db.Column(db.String(64), db.ForeignKey('detection_rules.id', ondelete='SET NULL'), nullable=True, index=True)
    rule_name = db.Column(db.String(120), nullable=False)
    is_triggered = db.Column(db.Boolean, default=False, nullable=False)
    weight_contributed = db.Column(db.Integer, default=0, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    details_json = db.Column(db.Text, nullable=True)
    evaluated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def details(self):
        try:
            return json.loads(self.details_json) if self.details_json else {}
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'is_triggered': self.is_triggered,
            'weight_contributed': self.weight_contributed,
            'reason': self.reason,
            'details': self.details,
            'evaluated_at': self.evaluated_at.isoformat() if self.evaluated_at else None
        }
