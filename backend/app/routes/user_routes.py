from flask import Blueprint, request, jsonify
from ..models import db, User, UserRole
from ..utils.decorators import super_admin_required, get_current_user
from ..services.audit_service import AuditService, AuditAction

user_bp = Blueprint('users', __name__)

@user_bp.route('', methods=['GET'])
@super_admin_required()
def list_users():
    """List users with pagination and filtering. Super Admin only."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    role = request.args.get('role')
    search = request.args.get('search', '').strip()

    query = User.query
    if role and role in UserRole.ALL_ROLES:
        query = query.filter(User.role == role)
    if search:
        query = query.filter((User.username.ilike(f'%{search}%')) | (User.email.ilike(f'%{search}%')) | (User.full_name.ilike(f'%{search}%')))

    paginated = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict() for u in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages
    }), 200

@user_bp.route('', methods=['POST'])
@super_admin_required()
def create_user():
    """Create new user account. Super Admin only."""
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', UserRole.RISK_ANALYST)
    full_name = data.get('full_name', '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'Bad Request', 'message': 'Username, email, and password are required.'}), 400

    if role not in UserRole.ALL_ROLES:
        return jsonify({'error': 'Bad Request', 'message': f'Invalid role. Allowed roles: {UserRole.ALL_ROLES}'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Conflict', 'message': f'Username "{username}" is already taken.'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Conflict', 'message': f'Email "{email}" is already registered.'}), 409

    try:
        user = User(
            username=username,
            email=email,
            role=role,
            full_name=full_name,
            is_active=True
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        AuditService.log(
            action=AuditAction.USER_CREATE,
            target_type='user',
            target_id=str(user.id),
            details={'username': user.username, 'role': user.role, 'email': user.email}
        )

        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201
    except ValueError as ve:
        return jsonify({'error': 'Bad Request', 'message': str(ve)}), 400

@user_bp.route('/<int:user_id>', methods=['PUT'])
@super_admin_required()
def update_user(user_id):
    """Update user role, status, or details. Super Admin only."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found.'}), 404

    data = request.get_json() or {}
    changes = {}

    if 'role' in data and data['role'] in UserRole.ALL_ROLES:
        changes['previous_role'] = user.role
        user.role = data['role']
        changes['new_role'] = user.role

    if 'is_active' in data:
        changes['previous_is_active'] = user.is_active
        user.is_active = bool(data['is_active'])
        changes['new_is_active'] = user.is_active

    if 'full_name' in data:
        user.full_name = data['full_name'].strip()

    if 'password' in data and data['password']:
        try:
            user.set_password(data['password'])
            changes['password_changed'] = True
        except ValueError as ve:
            return jsonify({'error': 'Bad Request', 'message': str(ve)}), 400

    db.session.commit()

    AuditService.log(
        action=AuditAction.USER_UPDATE,
        target_type='user',
        target_id=str(user.id),
        details=changes
    )

    return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@super_admin_required()
def deactivate_user(user_id):
    """Soft-deactivate user account. Super Admin only."""
    current_admin = get_current_user()
    if current_admin and current_admin.id == user_id:
        return jsonify({'error': 'Bad Request', 'message': 'Super Admins cannot deactivate their own account.'}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'Not Found', 'message': 'User not found.'}), 404

    user.is_active = False
    db.session.commit()

    AuditService.log(
        action=AuditAction.USER_UPDATE,
        target_type='user',
        target_id=str(user.id),
        details={'action': 'DEACTIVATE_USER', 'is_active': False}
    )

    return jsonify({'message': f'User {user.username} deactivated.'}), 200
