from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from ..models import User, UserRole

def get_current_user():
    """Helper to retrieve the current authenticated User model."""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if not user_id:
            return None
        from ..models import db
        return db.session.get(User, int(user_id))
    except Exception:
        return None

def role_required(allowed_roles):
    """
    Decorator to restrict access to users having one of the allowed_roles.
    Enforces RBAC on the backend.
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            from ..models import db
            user = db.session.get(User, int(user_id))
            if not user or not user.is_active:
                return jsonify({'error': 'Unauthorized', 'message': 'Account is inactive or not found'}), 401

            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access denied. Role "{user.role}" does not have required permissions.'
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator

def super_admin_required():
    return role_required([UserRole.SUPER_ADMIN])

def analyst_or_admin_required():
    return role_required([UserRole.SUPER_ADMIN, UserRole.RISK_ANALYST])

def any_authenticated_user():
    return role_required(UserRole.ALL_ROLES)
