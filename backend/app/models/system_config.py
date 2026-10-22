from datetime import datetime, timezone
import json
from . import db

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'

    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_setting(cls, key: str, default=None):
        setting = cls.query.filter_by(key=key).first()
        if not setting:
            return default
        try:
            return json.loads(setting.value)
        except (ValueError, TypeError):
            return setting.value

    @classmethod
    def set_setting(cls, key: str, value, description: str = None):
        setting = cls.query.filter_by(key=key).first()
        serialized = json.dumps(value) if not isinstance(value, str) else value
        if not setting:
            setting = cls(key=key, value=serialized, description=description)
            db.session.add(setting)
        else:
            setting.value = serialized
            if description:
                setting.description = description
        return setting

    def to_dict(self):
        try:
            val = json.loads(self.value)
        except Exception:
            val = self.value
        return {
            'key': self.key,
            'value': val,
            'description': self.description,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
