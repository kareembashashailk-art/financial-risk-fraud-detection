from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models import db, User, UserRole
from ..services.audit_service import AuditService, AuditAction
from ..utils.decorators import get_current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Authentication successful, returns JWT token.
      401:
        description: Invalid credentials or inactive account.
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Bad Request', 'message': 'Username and password are required.'}), 400

    user = User.query.filter((User.username == username) | (User.email == username)).first()

    if not user or not user.check_password(password):
        AuditService.log(
            action=AuditAction.LOGIN_FAILED,
            target_type='auth',
            target_id=username,
            details={'reason': 'Invalid credentials'}
        )
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid username or password.'}), 401

    if not user.is_active:
        AuditService.log(
            action=AuditAction.LOGIN_FAILED,
            target_type='auth',
            target_id=str(user.id),
            details={'reason': 'Account inactive'}
        )
        return jsonify({'error': 'Unauthorized', 'message': 'This account has been deactivated.'}), 401

    # Generate token with user ID as identity string
    access_token = create_access_token(identity=str(user.id))

    AuditService.log(
        action=AuditAction.LOGIN_SUCCESS,
        target_type='auth',
        target_id=str(user.id),
        details={'username': user.username, 'role': user.role},
        actor_user=user
    )

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    Get current user profile.
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: Current user profile data.
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Client-side token revocation acknowledgment."""
    return jsonify({'message': 'Logged out successfully'}), 200
