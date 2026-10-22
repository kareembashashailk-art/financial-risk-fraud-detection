from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models import AuditLog
from ..utils.decorators import analyst_or_admin_required

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('', methods=['GET'])
@analyst_or_admin_required()
def list_audit_logs():
    """
    Read-only audit log endpoint.
    Regular users cannot modify or delete audit records.
    Filters: action, actor, target_type, date range.
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), 100)
    action = request.args.get('action', '').strip()
    target_type = request.args.get('target_type', '').strip()
    actor = request.args.get('actor', '').strip()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = AuditLog.query

    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if actor:
        query = query.filter(AuditLog.actor_username.ilike(f'%{actor}%'))
    if start_date:
        try:
            sd = datetime.strptime(start_date.split('T')[0], "%Y-%m-%d")
            query = query.filter(AuditLog.timestamp >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date.split('T')[0], "%Y-%m-%d")
            ed_end = datetime(ed.year, ed.month, ed.day, 23, 59, 59)
            query = query.filter(AuditLog.timestamp <= ed_end)
        except ValueError:
            pass

    paginated = query.order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'audit_logs': [log.to_dict() for log in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page
    }), 200
