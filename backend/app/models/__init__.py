from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

from .user import User, UserRole
from .account import Account
from .transaction import Transaction, TransactionRiskLevel, TransactionStatus, TransactionChannel
from .rule import DetectionRule, RuleEvaluationResult, RuleType
from .alert import Alert, AlertReviewHistory, AlertStatus, ReviewDecision
from .audit_log import AuditLog, AuditAction
from .system_config import SystemSetting

__all__ = [
    'db',
    'migrate',
    'jwt',
    'User',
    'UserRole',
    'Account',
    'Transaction',
    'TransactionRiskLevel',
    'TransactionStatus',
    'TransactionChannel',
    'DetectionRule',
    'RuleType',
    'RuleEvaluationResult',
    'Alert',
    'AlertReviewHistory',
    'AlertStatus',
    'ReviewDecision',
    'AuditLog',
    'AuditAction',
    'SystemSetting'
]
