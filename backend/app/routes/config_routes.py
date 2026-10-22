from flask import Blueprint, request, jsonify
from ..models import db, SystemSetting
from ..services.risk_scoring import RiskScorer
from ..utils.decorators import any_authenticated_user, super_admin_required, get_current_user
from ..services.audit_service import AuditService, AuditAction

config_bp = Blueprint('config', __name__)

@config_bp.route('/thresholds', methods=['GET'])
@any_authenticated_user()
def get_thresholds():
    """Get current risk scoring thresholds and alert trigger values."""
    thresholds = RiskScorer.get_thresholds()
    alert_thresh = SystemSetting.get_setting('alert_threshold', 60)
    return jsonify({
        'thresholds': thresholds,
        'alert_threshold': alert_thresh
    }), 200

@config_bp.route('/thresholds', methods=['PUT'])
@super_admin_required()
def update_thresholds():
    """
    Update risk thresholds and alert trigger criteria.
    Super Admin only. Validates boundaries strictly.
    """
    data = request.get_json() or {}
    low_max = data.get('low_max')
    medium_max = data.get('medium_max')
    high_min = data.get('high_min')
    alert_threshold = data.get('alert_threshold')

    if low_max is None or medium_max is None or high_min is None:
        return jsonify({'error': 'Bad Request', 'message': 'low_max, medium_max, and high_min are required.'}), 400

    try:
        low_max = int(low_max)
        medium_max = int(medium_max)
        high_min = int(high_min)
    except ValueError:
        return jsonify({'error': 'Bad Request', 'message': 'Threshold values must be integers.'}), 400

    valid, msg = RiskScorer.validate_thresholds(low_max, medium_max, high_min)
    if not valid:
        return jsonify({'error': 'Bad Request', 'message': msg}), 400

    new_thresholds = {
        'low_max': low_max,
        'medium_max': medium_max,
        'high_min': high_min
    }
    SystemSetting.set_setting('risk_thresholds', new_thresholds, 'Configurable risk score boundaries')

    if alert_threshold is not None:
        try:
            at = int(alert_threshold)
            if 0 <= at <= 100:
                SystemSetting.set_setting('alert_threshold', at, 'Minimum risk score to automatically trigger an alert')
        except ValueError:
            pass

    db.session.commit()

    current_user = get_current_user()
    AuditService.log(
        action=AuditAction.CONFIG_UPDATE,
        target_type='config',
        target_id='risk_thresholds',
        details={'new_thresholds': new_thresholds, 'alert_threshold': alert_threshold},
        actor_user=current_user
    )

    return jsonify({
        'message': 'Risk thresholds updated successfully',
        'thresholds': new_thresholds,
        'alert_threshold': alert_threshold
    }), 200
