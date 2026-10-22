from flask import Blueprint, request, jsonify
from ..models import db, Account
from ..utils.decorators import any_authenticated_user

account_bp = Blueprint('accounts', __name__)

@account_bp.route('', methods=['GET'])
@any_authenticated_user()
def list_accounts():
    """List customer financial accounts."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '').strip()

    query = Account.query
    if search:
        query = query.filter(
            (Account.id.ilike(f'%{search}%')) |
            (Account.account_number.ilike(f'%{search}%')) |
            (Account.customer_name.ilike(f'%{search}%'))
        )

    paginated = query.order_by(Account.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'accounts': [a.to_dict() for a in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages
    }), 200

@account_bp.route('/<account_id>', methods=['GET'])
@any_authenticated_user()
def get_account(account_id):
    """Get single account with recent transaction summary."""
    account = db.session.get(Account, account_id)
    if not account:
        return jsonify({'error': 'Not Found', 'message': f'Account {account_id} not found.'}), 404

    recent_txs = account.transactions.order_by(account.transactions.property.mapper.class_.timestamp.desc()).limit(10).all()

    account_data = account.to_dict()
    account_data['recent_transactions'] = [t.to_dict() for t in recent_txs]

    return jsonify({'account': account_data}), 200
