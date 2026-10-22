from flask import Blueprint, jsonify
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from ..models import db, Transaction, Alert, AlertStatus, ReviewDecision, RuleEvaluationResult, DetectionRule
from ..utils.decorators import any_authenticated_user

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@any_authenticated_user()
def get_dashboard_stats():
    """
    Summary cards metrics calculated directly from database records.
    """
    total_transactions = Transaction.query.count()
    total_alerts = Alert.query.count()
    high_risk_transactions = Transaction.query.filter_by(risk_level='HIGH').count()
    awaiting_review = Alert.query.filter(Alert.status.in_([AlertStatus.NEW, AlertStatus.UNDER_REVIEW])).count()
    reviewed_alerts = Alert.query.filter(Alert.final_decision.isnot(None)).count()
    false_positives = Alert.query.filter_by(final_decision=ReviewDecision.FALSE_POSITIVE).count()
    confirmed_suspicious = Alert.query.filter_by(final_decision=ReviewDecision.CONFIRMED_SUSPICIOUS).count()
    needs_investigation = Alert.query.filter_by(final_decision=ReviewDecision.NEEDS_INVESTIGATION).count()

    return jsonify({
        'total_transactions': total_transactions,
        'total_alerts': total_alerts,
        'high_risk_transactions': high_risk_transactions,
        'awaiting_review': awaiting_review,
        'reviewed_alerts': reviewed_alerts,
        'false_positives': false_positives,
        'confirmed_suspicious': confirmed_suspicious,
        'needs_investigation': needs_investigation
    }), 200

@dashboard_bp.route('/charts', methods=['GET'])
@any_authenticated_user()
def get_dashboard_charts():
    """
    Comprehensive chart datasets:
    1. Transaction volume over time (last 14 days)
    2. Risk-level distribution
    3. Alerts by triggered rule
    4. Alert review status breakdown
    5. Daily transaction amounts (last 14 days)
    """
    # 1. Risk-Level Distribution
    risk_dist = {
        'LOW': Transaction.query.filter_by(risk_level='LOW').count(),
        'MEDIUM': Transaction.query.filter_by(risk_level='MEDIUM').count(),
        'HIGH': Transaction.query.filter_by(risk_level='HIGH').count()
    }

    # 2. Alert Status Breakdown
    alert_status_dist = {
        'new': Alert.query.filter_by(status=AlertStatus.NEW).count(),
        'under_review': Alert.query.filter_by(status=AlertStatus.UNDER_REVIEW).count(),
        'escalated': Alert.query.filter_by(status=AlertStatus.ESCALATED).count(),
        'closed': Alert.query.filter_by(status=AlertStatus.CLOSED).count()
    }

    # 3. Decision Breakdown
    decision_dist = {
        'confirmed_suspicious': Alert.query.filter_by(final_decision=ReviewDecision.CONFIRMED_SUSPICIOUS).count(),
        'false_positive': Alert.query.filter_by(final_decision=ReviewDecision.FALSE_POSITIVE).count(),
        'needs_investigation': Alert.query.filter_by(final_decision=ReviewDecision.NEEDS_INVESTIGATION).count(),
        'pending_decision': Alert.query.filter(Alert.final_decision.is_(None)).count()
    }

    # 4. Triggered Rules Distribution (Top rules triggered)
    rule_counts_query = db.session.query(
        RuleEvaluationResult.rule_name,
        func.count(RuleEvaluationResult.id)
    ).filter(RuleEvaluationResult.is_triggered == True)\
     .group_by(RuleEvaluationResult.rule_name)\
     .order_by(func.count(RuleEvaluationResult.id).desc())\
     .limit(7).all()

    rules_triggered = [
        {'rule_name': r[0], 'count': r[1]} for r in rule_counts_query
    ]

    # 5. Timeline data: Daily Volume & Total Amount (Past 14 days)
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=13)
    timeline_days = [(start_date + timedelta(days=i)) for i in range(14)]
    
    # Query transactions in window
    txs_in_window = Transaction.query.filter(
        Transaction.timestamp >= datetime(start_date.year, start_date.month, start_date.day)
    ).all()

    # Aggregate day by day in python for 100% DB-agnostic compatibility (SQLite & MySQL)
    day_map = {d.strftime("%b %d"): {'count': 0, 'amount': 0.0, 'alerts': 0} for d in timeline_days}
    for tx in txs_in_window:
        if tx.timestamp:
            key = tx.timestamp.strftime("%b %d")
            if key in day_map:
                day_map[key]['count'] += 1
                day_map[key]['amount'] += float(tx.amount) if tx.amount else 0.0

    # Overlay alerts in timeline
    alerts_in_window = Alert.query.filter(
        Alert.created_at >= datetime(start_date.year, start_date.month, start_date.day)
    ).all()
    for alt in alerts_in_window:
        if alt.created_at:
            key = alt.created_at.strftime("%b %d")
            if key in day_map:
                day_map[key]['alerts'] += 1

    volume_timeline = [
        {'date': k, 'transactions': v['count'], 'amount': round(v['amount'], 2), 'alerts': v['alerts']}
        for k, v in day_map.items()
    ]

    return jsonify({
        'risk_distribution': risk_dist,
        'alert_status_distribution': alert_status_dist,
        'decision_distribution': decision_dist,
        'rules_triggered': rules_triggered,
        'timeline': volume_timeline
    }), 200

@dashboard_bp.route('/recent-suspicious', methods=['GET'])
@any_authenticated_user()
def get_recent_suspicious():
    """
    Get the most recent suspicious transactions and alerts for rapid triage.
    """
    limit = 8
    # High or Medium risk transactions
    recent_flagged = Transaction.query.filter(
        Transaction.risk_score >= 30
    ).order_by(Transaction.timestamp.desc()).limit(limit).all()

    recent_alerts = Alert.query.order_by(Alert.created_at.desc()).limit(limit).all()

    return jsonify({
        'recent_flagged_transactions': [t.to_dict() for t in recent_flagged],
        'recent_alerts': [a.to_dict() for a in recent_alerts]
    }), 200
