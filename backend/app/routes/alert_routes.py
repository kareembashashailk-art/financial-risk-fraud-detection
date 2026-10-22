from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from ..models import db, Alert, AlertStatus, ReviewDecision, AlertReviewHistory, Transaction, User
from ..utils.decorators import any_authenticated_user, analyst_or_admin_required, get_current_user
from ..services.alert_service import AlertService
from ..services.audit_service import AuditService, AuditAction

alert_bp = Blueprint('alerts', __name__)

@alert_bp.route('', methods=['GET'])
@any_authenticated_user()
def list_alerts():
    """
    Paginated list of alerts.
    Filters: status, risk_level, assigned_to_me, date range.
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 15, type=int), 100)
    status = request.args.get('status', '').strip().lower()
    risk_level = request.args.get('risk_level', '').strip().upper()
    assigned_to_me = request.args.get('assigned_to_me', 'false').lower() == 'true'
    search = request.args.get('search', '').strip()

    query = Alert.query

    if status and status in AlertStatus.ALL_STATUSES:
        query = query.filter(Alert.status == status)

    if risk_level in ['LOW', 'MEDIUM', 'HIGH']:
        query = query.filter(Alert.risk_level == risk_level)

    if search:
        query = query.filter(
            (Alert.id.ilike(f'%{search}%')) |
            (Alert.transaction_id.ilike(f'%{search}%')) |
            (Alert.account_id.ilike(f'%{search}%'))
        )

    current_user = get_current_user()
    if assigned_to_me and current_user:
        query = query.filter(Alert.assigned_reviewer_id == current_user.id)

    paginated = query.order_by(Alert.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'alerts': [a.to_dict() for a in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page
    }), 200

@alert_bp.route('/<alert_id>', methods=['GET'])
@any_authenticated_user()
def get_alert(alert_id):
    """
    Get full alert details with transaction data, triggered rules, and complete decision history.
    """
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({'error': 'Not Found', 'message': f'Alert {alert_id} not found.'}), 404

    alert_data = alert.to_dict(include_history=True)
    if alert.transaction:
        alert_data['transaction_details'] = alert.transaction.to_dict(include_rule_results=True)

    return jsonify({'alert': alert_data}), 200

@alert_bp.route('/<alert_id>/review', methods=['POST', 'PUT'])
@analyst_or_admin_required()
def review_alert(alert_id):
    """
    Record review decision and update alert status.
    Risk Analyst / Super Admin only.
    Payload:
      - status: new | under_review | escalated | closed
      - decision: confirmed_suspicious | false_positive | needs_further_investigation
      - note: string
    """
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({'error': 'Not Found', 'message': f'Alert {alert_id} not found.'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    decision = data.get('decision')
    note = data.get('note', '').strip()

    if decision and decision not in ReviewDecision.ALL_DECISIONS:
        return jsonify({
            'error': 'Bad Request',
            'message': f"Invalid decision '{decision}'. Allowed: {ReviewDecision.ALL_DECISIONS}"
        }), 400

    if new_status and new_status not in AlertStatus.ALL_STATUSES:
        return jsonify({
            'error': 'Bad Request',
            'message': f"Invalid status '{new_status}'. Allowed: {AlertStatus.ALL_STATUSES}"
        }), 400

    if not decision and not new_status and not note:
        return jsonify({'error': 'Bad Request', 'message': 'Must provide status, decision, or note.'}), 400

    current_user = get_current_user()
    updated_alert = AlertService.update_alert_review(
        alert=alert,
        reviewer=current_user,
        new_status=new_status,
        decision=decision,
        note=note
    )

    return jsonify({
        'message': 'Alert review recorded successfully.',
        'alert': updated_alert.to_dict(include_history=True)
    }), 200

@alert_bp.route('/<alert_id>/assign', methods=['PUT'])
@analyst_or_admin_required()
def assign_alert(alert_id):
    """Assign alert to a reviewer."""
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({'error': 'Not Found', 'message': f'Alert {alert_id} not found.'}), 404

    data = request.get_json() or {}
    reviewer_id = data.get('reviewer_id')

    if reviewer_id is not None:
        reviewer = db.session.get(User, int(reviewer_id))
        if not reviewer:
            return jsonify({'error': 'Not Found', 'message': f'User {reviewer_id} not found.'}), 404
        alert.assigned_reviewer_id = reviewer.id
        if alert.status == AlertStatus.NEW:
            alert.status = AlertStatus.UNDER_REVIEW
    else:
        # Unassign
        alert.assigned_reviewer_id = None

    db.session.commit()

    current_user = get_current_user()
    AuditService.log(
        action=AuditAction.ALERT_ASSIGN,
        target_type='alert',
        target_id=alert.id,
        details={'assigned_reviewer_id': alert.assigned_reviewer_id},
        actor_user=current_user
    )

    return jsonify({'message': 'Alert assignment updated', 'alert': alert.to_dict()}), 200
