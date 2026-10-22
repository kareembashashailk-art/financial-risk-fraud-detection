import os
from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger
from .config import Config
from .models import db, migrate, jwt
from .utils.errors import register_error_handlers

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # OpenAPI / Swagger Documentation
    Swagger(app)

    # Register central error handlers
    register_error_handlers(app)

    # Register Blueprints
    from .routes.auth_routes import auth_bp
    from .routes.user_routes import user_bp
    from .routes.account_routes import account_bp
    from .routes.transaction_routes import transaction_bp
    from .routes.rule_routes import rule_bp
    from .routes.alert_routes import alert_bp
    from .routes.dashboard_routes import dashboard_bp
    from .routes.audit_routes import audit_bp
    from .routes.config_routes import config_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(account_bp, url_prefix='/api/accounts')
    app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
    app.register_blueprint(rule_bp, url_prefix='/api/rules')
    app.register_blueprint(alert_bp, url_prefix='/api/alerts')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(audit_bp, url_prefix='/api/audit-logs')
    app.register_blueprint(config_bp, url_prefix='/api/config')

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'Financial Risk Analysis & Fraud Detection System',
            'version': '1.0.0'
        }), 200

    # Auto-create tables if database does not exist (e.g. SQLite local dev)
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"[DB INIT WARNING] Could not automatically create tables: {e}")

    return app
