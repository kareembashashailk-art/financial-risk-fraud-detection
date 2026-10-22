from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import json
from ..models import db, DetectionRule, RuleType
from ..utils.decorators import any_authenticated_user, super_admin_required, get_current_user
from ..services.audit_service import AuditService, AuditAction

rule_bp = Blueprint('rules', __name__)

@rule_bp.route('', methods=['GET'])
@any_authenticated_user()
def list_rules():
    """List all fraud detection rules with current parameters, weights, and status."""
    rules = DetectionRule.query.order_by(DetectionRule.weight.desc(), DetectionRule.name.asc()).all()
    return jsonify({'rules': [r.to_dict() for r in rules]}), 200

@rule_bp.route('/<rule_id>', methods=['GET'])
@any_authenticated_user()
def get_rule(rule_id):
    """Get single rule detail."""
    rule = db.session.get(DetectionRule, rule_id)
    if not rule:
        return jsonify({'error': 'Not Found', 'message': f'Rule {rule_id} not found.'}), 404
    return jsonify({'rule': rule.to_dict()}), 200

@rule_bp.route('/<rule_id>', methods=['PUT'])
@super_admin_required()
def update_rule(rule_id):
    """
    Update rule parameters, activation status, severity, or weight.
    Super Admin only. Validates parameters safely without arbitrary code execution.
    """
    rule = db.session.get(DetectionRule, rule_id)
    if not rule:
        return jsonify({'error': 'Not Found', 'message': f'Rule {rule_id} not found.'}), 404

    data = request.get_json() or {}
    changes = {}

    if 'is_enabled' in data:
        old_val = rule.is_enabled
        rule.is_enabled = bool(data['is_enabled'])
        changes['is_enabled'] = {'from': old_val, 'to': rule.is_enabled}

    if 'weight' in data:
        try:
            w = int(data['weight'])
            if not (0 <= w <= 100):
                return jsonify({'error': 'Bad Request', 'message': 'Rule weight must be between 0 and 100.'}), 400
            changes['weight'] = {'from': rule.weight, 'to': w}
            rule.weight = w
        except ValueError:
            return jsonify({'error': 'Bad Request', 'message': 'Weight must be an integer.'}), 400

    if 'severity' in data:
        sev = str(data['severity']).upper()
        if sev in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
            changes['severity'] = {'from': rule.severity, 'to': sev}
            rule.severity = sev

    if 'parameters' in data:
        params = data['parameters']
        if not isinstance(params, dict):
            return jsonify({'error': 'Bad Request', 'message': 'Parameters must be a valid JSON object/dictionary.'}), 400
        # Prevent injection of disallowed keys or non-primitive structures
        sanitized_params = {}
        for k, v in params.items():
            if isinstance(v, (int, float, str, bool, list)):
                sanitized_params[k] = v
        changes['parameters'] = {'from': rule.parameters, 'to': sanitized_params}
        rule.parameters = sanitized_params

    rule.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    current_user = get_current_user()
    action = AuditAction.RULE_TOGGLE if ('is_enabled' in changes and len(changes) == 1) else AuditAction.RULE_UPDATE
    AuditService.log(
        action=action,
        target_type='rule',
        target_id=rule.id,
        details=changes,
        actor_user=current_user
    )

    return jsonify({'message': f'Rule {rule.id} updated successfully', 'rule': rule.to_dict()}), 200

@rule_bp.route('', methods=['POST'])
@super_admin_required()
def create_custom_rule():
    """
    Create a new custom fraud detection rule.
    Super Admin only.
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    rule_type = data.get('rule_type', RuleType.CUSTOM)
    weight = data.get('weight', 25)
    severity = data.get('severity', 'MEDIUM').upper()
    params = data.get('parameters', {})

    if not name or not description:
        return jsonify({'error': 'Bad Request', 'message': 'Rule name and description are required.'}), 400

    try:
        weight_int = int(weight)
        if not (0 <= weight_int <= 100):
            return jsonify({'error': 'Bad Request', 'message': 'Weight must be between 0 and 100.'}), 400
    except ValueError:
        return jsonify({'error': 'Bad Request', 'message': 'Weight must be an integer.'}), 400

    rule_id = data.get('id')
    if not rule_id:
        rule_id = f"RULE_CUSTOM_{name.upper().replace(' ', '_')[:24]}"

    if DetectionRule.query.get(rule_id):
        return jsonify({'error': 'Conflict', 'message': f'Rule with ID {rule_id} already exists.'}), 409

    rule = DetectionRule(
        id=rule_id,
        name=name,
        description=description,
        rule_type=rule_type,
        is_enabled=True,
        weight=weight_int,
        severity=severity if severity in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] else 'MEDIUM',
        parameters_json=json.dumps(params) if isinstance(params, dict) else '{}'
    )
    db.session.add(rule)
    db.session.commit()

    current_user = get_current_user()
    AuditService.log(
        action=AuditAction.RULE_CREATE,
        target_type='rule',
        target_id=rule.id,
        details={'name': rule.name, 'weight': rule.weight, 'type': rule.rule_type},
        actor_user=current_user
    )

    return jsonify({'message': 'Rule created successfully', 'rule': rule.to_dict()}), 201
