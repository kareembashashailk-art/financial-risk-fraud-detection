from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import uuid
from ..models import db, Transaction, Account, RuleEvaluationResult, TransactionRiskLevel
from ..utils.decorators import any_authenticated_user, analyst_or_admin_required, get_current_user
from ..services.rule_engine import FraudRuleEngine
from ..services.alert_service import AlertService
from ..services.csv_service import CsvImportService
from ..services.audit_service import AuditService, AuditAction

transaction_bp = Blueprint('transactions', __name__)

@transaction_bp.route('', methods=['GET'])
@any_authenticated_user()
def list_transactions():
    """
    Paginated transaction search and filter endpoint.
    Supports filtering by search query, risk_level, status, date range, and amount range.
    Supports sorting by timestamp, amount, and risk_score.
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 15, type=int), 100)
    search = request.args.get('search', '').strip()
    risk_level = request.args.get('risk_level', '').strip().upper()
    status = request.args.get('status', '').strip().lower()
    min_amount = request.args.get('min_amount', type=float)
    max_amount = request.args.get('max_amount', type=float)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    sort_by = request.args.get('sort_by', 'timestamp') # timestamp, amount, risk_score
    sort_dir = request.args.get('sort_dir', 'desc').lower()

    query = Transaction.query

    # Search by transaction ID or account ID
    if search:
        query = query.filter((Transaction.id.ilike(f'%{search}%')) | (Transaction.account_id.ilike(f'%{search}%')))

    # Filter by risk level
    if risk_level in ['LOW', 'MEDIUM', 'HIGH']:
        query = query.filter(Transaction.risk_level == risk_level)

    # Filter by transaction status
    if status in ['completed', 'pending', 'failed']:
        query = query.filter(Transaction.status == status)

    # Filter by amount range
    if min_amount is not None:
        query = query.filter(Transaction.amount >= Decimal(str(min_amount)))
    if max_amount is not None:
        query = query.filter(Transaction.amount <= Decimal(str(max_amount)))

    # Filter by date range
    if start_date:
        try:
            sd = datetime.strptime(start_date.split('T')[0], "%Y-%m-%d")
            query = query.filter(Transaction.timestamp >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date.split('T')[0], "%Y-%m-%d")
            # Include entire end day
            ed_end = datetime(ed.year, ed.month, ed.day, 23, 59, 59)
            query = query.filter(Transaction.timestamp <= ed_end)
        except ValueError:
            pass

    # Sorting
    sort_column = Transaction.timestamp
    if sort_by == 'amount':
        sort_column = Transaction.amount
    elif sort_by == 'risk_score':
        sort_column = Transaction.risk_score

    if sort_dir == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'transactions': [tx.to_dict() for tx in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page
    }), 200

@transaction_bp.route('/<transaction_id>', methods=['GET'])
@any_authenticated_user()
def get_transaction(transaction_id):
    """
    Get detailed transaction record, including triggered rules and score breakdown.
    """
    tx = db.session.get(Transaction, transaction_id)
    if not tx:
        return jsonify({'error': 'Not Found', 'message': f'Transaction {transaction_id} not found.'}), 404

    return jsonify({'transaction': tx.to_dict(include_rule_results=True)}), 200

@transaction_bp.route('', methods=['POST'])
@analyst_or_admin_required()
def create_transaction():
    """
    Create a new transaction and immediately execute fraud detection rules.
    Backend recomputes risk score and generates alert if threshold met.
    """
    data = request.get_json() or {}
    account_id = data.get('account_id')
    raw_amount = data.get('amount')

    if not account_id or raw_amount is None:
        return jsonify({'error': 'Bad Request', 'message': 'account_id and amount are required.'}), 400

    try:
        amount = Decimal(str(raw_amount))
        if amount <= 0:
            return jsonify({'error': 'Bad Request', 'message': 'Transaction amount must be positive.'}), 400
    except (InvalidOperation, ValueError):
        return jsonify({'error': 'Bad Request', 'message': 'Invalid monetary amount.'}), 400

    account = db.session.get(Account, account_id)
    if not account:
        return jsonify({'error': 'Not Found', 'message': f'Account {account_id} does not exist.'}), 404

    tx_id = data.get('id') or f"TXN-{uuid.uuid4().hex[:8].upper()}"
    if db.session.get(Transaction, tx_id):
        return jsonify({'error': 'Conflict', 'message': f'Transaction ID {tx_id} already exists.'}), 409

    # Timestamp handling
    ts = datetime.now(timezone.utc)
    if data.get('timestamp'):
        try:
            ts = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        except Exception:
            pass

    tx = Transaction(
        id=tx_id,
        account_id=account.id,
        amount=amount,
        currency=data.get('currency', account.currency or 'USD').upper(),
        timestamp=ts,
        merchant_name=data.get('merchant_name', 'Retailer'),
        merchant_category=data.get('merchant_category', 'general').lower(),
        channel=data.get('channel', 'online').lower(),
        status=data.get('status', 'completed').lower(),
        location=data.get('location'),
        ip_address=data.get('ip_address')
    )
    db.session.add(tx)
    db.session.flush()

    # Execute Fraud Engine
    all_evals, score_summary = FraudRuleEngine.evaluate_transaction(tx)
    tx.risk_score = score_summary['final_score']
    tx.risk_level = score_summary['risk_level']
    tx.triggered_rules = score_summary['breakdown']

    # Record rule evaluation results
    for ev in all_evals:
        res = RuleEvaluationResult(
            transaction_id=tx.id,
            rule_id=ev['rule_id'],
            rule_name=ev['rule_name'],
            is_triggered=ev['is_triggered'],
            weight_contributed=ev['weight_contributed'],
            reason=ev['reason'],
            details_json=str(ev['details']),
            evaluated_at=datetime.now(timezone.utc)
        )
        db.session.add(res)

    # Check and generate alert
    alert = AlertService.process_transaction_alert(tx, score_summary)
    db.session.commit()

    current_user = get_current_user()
    AuditService.log(
        action=AuditAction.TRANSACTION_CREATE,
        target_type='transaction',
        target_id=tx.id,
        details={
            'amount': float(tx.amount),
            'risk_score': tx.risk_score,
            'risk_level': tx.risk_level,
            'alert_generated': alert is not None
        },
        actor_user=current_user
    )

    return jsonify({
        'message': 'Transaction evaluated and saved successfully',
        'transaction': tx.to_dict(include_rule_results=True),
        'score_summary': score_summary,
        'alert_generated': alert is not None,
        'alert_id': alert.id if alert else None
    }), 201

@transaction_bp.route('/import-csv', methods=['POST'])
@analyst_or_admin_required()
def import_csv():
    """
    Upload CSV file of synthetic transactions.
    Validates CSV headers, data types, required fields, and duplicate transactions.
    Returns imported count and rejected rows.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Bad Request', 'message': 'No file part in upload request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Bad Request', 'message': 'No file selected.'}), 400

    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Bad Request', 'message': 'Only .csv files are supported.'}), 400

    current_user = get_current_user()
    result = CsvImportService.parse_and_import(file.stream, actor_user=current_user)

    if not result.get('success'):
        return jsonify({'error': 'Unprocessable Entity', 'message': result.get('error')}), 422

    return jsonify({
        'message': f"Import complete: {result['imported_count']} transactions imported, {result['rejected_count']} rejected.",
        'imported_count': result['imported_count'],
        'rejected_count': result['rejected_count'],
        'skipped_count': result['skipped_count'],
        'alerts_generated': result['alerts_generated'],
        'rejected_rows': result['rejected_rows']
    }), 200
