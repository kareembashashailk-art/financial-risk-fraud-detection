import io
import csv
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, List, Tuple
from ..models import db, Transaction, Account, RuleEvaluationResult, SystemSetting
from .rule_engine import FraudRuleEngine
from .alert_service import AlertService
from .audit_service import AuditService, AuditAction

REQUIRED_CSV_FIELDS = ['account_id', 'amount', 'timestamp']

class CsvImportService:
    @classmethod
    def parse_and_import(cls, file_stream, actor_user=None) -> Dict[str, Any]:
        """
        Parses a CSV file stream, validates rows, checks for duplicates,
        creates accounts if needed, inserts transactions, evaluates fraud rules,
        generates alerts, and returns summary with error breakdowns.
        """
        imported_count = 0
        skipped_count = 0
        rejected_rows = []
        alerts_generated = 0

        # Read content safely
        try:
            content = file_stream.read()
            if isinstance(content, bytes):
                content = content.decode('utf-8-sig', errors='replace')
            reader = csv.DictReader(io.StringIO(content))
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to parse CSV stream: {str(e)}",
                'imported_count': 0,
                'rejected_count': 0,
                'rejected_rows': []
            }

        # Validate headers
        if not reader.fieldnames:
            return {
                'success': False,
                'error': "CSV file is empty or has no header row.",
                'imported_count': 0,
                'rejected_count': 0,
                'rejected_rows': []
            }

        normalized_headers = {col.strip().lower(): col for col in reader.fieldnames}
        for req in REQUIRED_CSV_FIELDS:
            if req not in normalized_headers:
                return {
                    'success': False,
                    'error': f"Missing required CSV column '{req}'. Required headers: {', '.join(REQUIRED_CSV_FIELDS)}",
                    'imported_count': 0,
                    'rejected_count': 0,
                    'rejected_rows': []
                }

        row_index = 1
        for row in reader:
            row_index += 1
            # Normalize row keys
            clean_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}

            # 1. Row Validation
            validation_errors = []

            # Transaction ID
            tx_id = clean_row.get('transaction_id') or clean_row.get('id')
            if not tx_id:
                # Generate deterministically or autoincrement
                tx_id = f"TXN-IMP-{row_index:05d}"
            
            # Check duplicate ID
            if db.session.get(Transaction, tx_id):
                rejected_rows.append({
                    'row': row_index,
                    'transaction_id': tx_id,
                    'error': f"Transaction ID '{tx_id}' already exists in the system (Duplicate Prevention)."
                })
                skipped_count += 1
                continue

            # Account ID
            acc_id = clean_row.get('account_id')
            if not acc_id:
                validation_errors.append("account_id is required.")

            # Amount
            raw_amount = clean_row.get('amount')
            amount = None
            if not raw_amount:
                validation_errors.append("amount is required.")
            else:
                try:
                    # Clean currency symbols
                    clean_amt_str = raw_amount.replace('$', '').replace(',', '').strip()
                    amount = Decimal(clean_amt_str)
                    if amount <= 0:
                        validation_errors.append("amount must be greater than zero.")
                except (InvalidOperation, ValueError):
                    validation_errors.append(f"Invalid monetary amount format '{raw_amount}'.")

            # Timestamp
            raw_ts = clean_row.get('timestamp')
            ts = None
            if not raw_ts:
                validation_errors.append("timestamp is required.")
            else:
                parsed = False
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d-%m-%Y %H:%M:%S", "%m/%d/%Y %H:%M"):
                    try:
                        ts = datetime.strptime(raw_ts.split('.')[0].replace('Z', ''), fmt)
                        parsed = True
                        break
                    except ValueError:
                        continue
                if not parsed:
                    validation_errors.append(f"Invalid timestamp format '{raw_ts}'. Supported: YYYY-MM-DD HH:MM:SS or ISO-8601.")

            if validation_errors:
                rejected_rows.append({
                    'row': row_index,
                    'transaction_id': tx_id,
                    'error': "; ".join(validation_errors)
                })
                continue

            # Ensure Account exists
            account = db.session.get(Account, acc_id)
            if not account:
                # Auto-create synthetic account placeholder
                account = Account(
                    id=acc_id,
                    account_number=clean_row.get('account_number', f"ACC-{acc_id[-6:]}"),
                    customer_name=clean_row.get('customer_name', f"Customer {acc_id}"),
                    customer_email=clean_row.get('customer_email', f"user_{acc_id.lower()}@synthetic-bank.test"),
                    balance=Decimal('10000.00'),
                    currency=clean_row.get('currency', 'USD').upper()
                )
                db.session.add(account)
                db.session.flush()

            # Create Transaction
            transaction = Transaction(
                id=tx_id,
                account_id=acc_id,
                amount=amount,
                currency=clean_row.get('currency', 'USD').upper(),
                timestamp=ts,
                merchant_name=clean_row.get('merchant_name', 'General Merchant'),
                merchant_category=clean_row.get('merchant_category', 'general').lower(),
                channel=clean_row.get('channel', 'online').lower(),
                status=clean_row.get('status', 'completed').lower(),
                location=clean_row.get('location') or None,
                ip_address=clean_row.get('ip_address') or None,
                risk_score=0,
                risk_level='LOW',
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(transaction)
            db.session.flush()

            # Run Fraud Detection Engine
            all_evals, score_summary = FraudRuleEngine.evaluate_transaction(transaction)
            transaction.risk_score = score_summary['final_score']
            transaction.risk_level = score_summary['risk_level']
            transaction.triggered_rules = score_summary['breakdown']

            # Save rule evaluation details
            for ev in all_evals:
                res = RuleEvaluationResult(
                    transaction_id=transaction.id,
                    rule_id=ev['rule_id'],
                    rule_name=ev['rule_name'],
                    is_triggered=ev['is_triggered'],
                    weight_contributed=ev['weight_contributed'],
                    reason=ev['reason'],
                    details_json=str(ev['details']),
                    evaluated_at=datetime.now(timezone.utc)
                )
                db.session.add(res)

            # Alert Generation if criteria met
            alert = AlertService.process_transaction_alert(transaction, score_summary)
            if alert:
                alerts_generated += 1

            imported_count += 1

        db.session.commit()

        # Audit log CSV import
        AuditService.log(
            action=AuditAction.TRANSACTION_IMPORT,
            target_type='csv_import',
            target_id=f"ROWS_{row_index - 1}",
            details={
                'imported_count': imported_count,
                'rejected_count': len(rejected_rows),
                'alerts_generated': alerts_generated
            },
            actor_user=actor_user
        )

        return {
            'success': True,
            'imported_count': imported_count,
            'rejected_count': len(rejected_rows),
            'skipped_count': skipped_count,
            'alerts_generated': alerts_generated,
            'rejected_rows': rejected_rows[:50] # return top 50 rejected rows
        }
