import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-financial-risk-secret-key-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-financial-risk-jwt-secret-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_EXPIRES_HOURS', 12)))
    
    # Database config: Supports MySQL and SQLite fallback
    # Example MySQL: mysql+pymysql://user:password@localhost:3306/financial_risk_db
    # Example SQLite: sqlite:////absolute/path/or/relative/financial_risk.db
    raw_db_url = os.environ.get('DATABASE_URL')
    if raw_db_url:
       SQLALCHEMY_DATABASE_URI = (
    raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_db_url.startswith("postgres://")
    else raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if raw_db_url.startswith("postgresql://")
    else raw_db_url
)
    else:
        # Default zero-setup fallback to SQLite
        db_path = os.path.join(BASE_DIR, '..', 'financial_risk.db')
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.abspath(db_path)}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
    } if 'mysql' in SQLALCHEMY_DATABASE_URI else {}

    # File uploads
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)) # 16 MB max
    ALLOWED_EXTENSIONS = {'csv'}

    # CORS
    CORS_ORIGIN = os.environ.get('CORS_ORIGIN', '*').split(',')

    # Risk Scoring Configuration Defaults
    LOW_RISK_MAX = 29
    MEDIUM_RISK_MAX = 59
    HIGH_RISK_MIN = 60

    # Swagger / OpenAPI documentation
    SWAGGER = {
        'title': 'Financial Risk Analysis & Fraud Detection API',
        'uiversion': 3,
        'version': '1.0.0',
        'description': 'REST API specification for financial transaction monitoring, rule-based fraud detection engine, and alert management.',
        'termsOfService': '',
        'hide_top_bar': False
    }


class TestingConfig(Config):
    """Configuration for testing with an in-memory SQLite database."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    SECRET_KEY = 'test-secret-key-32-chars-long-financial-risk-2026'
    JWT_SECRET_KEY = 'test-jwt-secret-key-32-chars-long-financial-risk-2026'
