from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Any, Tuple
from ..models import db, DetectionRule, RuleEvaluationResult, Transaction, Account, RuleType

class FraudRuleEngine:
    """
    Extensible, modular rule-based fraud detection engine.
    Evaluates individual or batch financial transactions against enabled rules.
    """

    @classmethod
    def evaluate_transaction(cls, transaction: Transaction) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Evaluate a transaction against all active detection rules.
        
        Returns:
            Tuple of:
            - List of rule evaluation result dictionaries
            - Summary dictionary with scores, risk level, and explanations
        """
        from .risk_scoring import RiskScorer

        # Load all enabled rules from database ordered by weight desc
        enabled_rules = DetectionRule.query.filter_by(is_enabled=True).order_by(DetectionRule.weight.desc()).all()

        triggered_rules = []
        all_evaluations = []

        for rule in enabled_rules:
            is_triggered = False
            reason = None
            details = {}

            try:
                rule_type = rule.rule_type
                params = rule.parameters or {}

                if rule_type == RuleType.HIGH_AMOUNT:
                    is_triggered, reason, details = cls._evaluate_high_amount(transaction, params)
                elif rule_type == RuleType.RAPID_VELOCITY:
                    is_triggered, reason, details = cls._evaluate_rapid_velocity(transaction, params)
                elif rule_type == RuleType.UNUSUAL_FREQUENCY:
                    is_triggered, reason, details = cls._evaluate_unusual_frequency(transaction, params)
                elif rule_type == RuleType.REPEATED_FAILED:
                    is_triggered, reason, details = cls._evaluate_repeated_failed(transaction, params)
                elif rule_type == RuleType.UNUSUAL_LOCATION:
                    is_triggered, reason, details = cls._evaluate_unusual_location(transaction, params)
                elif rule_type == RuleType.CUSTOM:
                    is_triggered, reason, details = cls._evaluate_custom_rule(transaction, params)
                else:
                    # Fallback for generic parameter matching
                    is_triggered, reason, details = cls._evaluate_custom_rule(transaction, params)

            except Exception as e:
                is_triggered = False
                reason = f"Error evaluating rule {rule.id}: {str(e)}"
                details = {'error': str(e)}

            eval_dict = {
                'rule_id': rule.id,
                'rule_name': rule.name,
                'rule_type': rule.rule_type,
                'severity': rule.severity,
                'weight': rule.weight,
                'weight_contributed': rule.weight if is_triggered else 0,
                'is_triggered': is_triggered,
                'reason': reason if is_triggered else None,
                'details': details
            }
            all_evaluations.append(eval_dict)

            if is_triggered:
                triggered_rules.append(eval_dict)

        # Calculate composite risk score using RiskScorer
        score_summary = RiskScorer.calculate_score(triggered_rules)

        return all_evaluations, score_summary

    # --- Individual Rule Evaluators ---

    @classmethod
    def _evaluate_high_amount(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Rule 1: Flag transactions exceeding configurable amount threshold."""
        threshold = Decimal(str(params.get('threshold_amount', 5000.00)))
        amount = Decimal(str(tx.amount))

        if amount >= threshold:
            reason = f"Transaction amount of {tx.currency} {amount:,.2f} meets or exceeds threshold limit of {tx.currency} {threshold:,.2f}."
            return True, reason, {
                'actual_amount': float(amount),
                'threshold_amount': float(threshold),
                'currency': tx.currency
            }
        return False, "", {}

    @classmethod
    def _evaluate_rapid_velocity(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Rule 2: Flag accounts that exceed configurable transactions in a short window."""
        max_count = int(params.get('max_count', 3))
        window_seconds = int(params.get('window_seconds', 300)) # Default 5 mins

        tx_time = tx.timestamp or datetime.now(timezone.utc)
        # Ensure tx_time is timezone-aware or naive to match DB
        start_time = tx_time - timedelta(seconds=window_seconds)

        # Count transactions for the same account in the window
        query = Transaction.query.filter(
            Transaction.account_id == tx.account_id,
            Transaction.timestamp >= start_time,
            Transaction.timestamp <= tx_time
        )
        if tx.id:
            query = query.filter(Transaction.id != tx.id)
        
        prior_count = query.count()
        total_in_window = prior_count + 1 # Include current

        if total_in_window >= max_count:
            window_minutes = round(window_seconds / 60, 1)
            reason = f"Rapid velocity detected: Account initiated {total_in_window} transactions within {window_minutes} minutes (threshold: {max_count})."
            return True, reason, {
                'transaction_count': total_in_window,
                'max_count': max_count,
                'window_seconds': window_seconds
            }
        return False, "", {}

    @classmethod
    def _evaluate_unusual_frequency(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Rule 3: Flag unusually frequent transactions for an account during a defined period."""
        max_hourly_count = int(params.get('max_count', 6))
        window_hours = int(params.get('window_hours', 1))

        tx_time = tx.timestamp or datetime.now(timezone.utc)
        start_time = tx_time - timedelta(hours=window_hours)

        query = Transaction.query.filter(
            Transaction.account_id == tx.account_id,
            Transaction.timestamp >= start_time,
            Transaction.timestamp <= tx_time
        )
        if tx.id:
            query = query.filter(Transaction.id != tx.id)

        count = query.count() + 1
        if count >= max_hourly_count:
            reason = f"High transaction frequency: {count} transactions recorded in the past {window_hours} hour(s) (threshold: {max_hourly_count})."
            return True, reason, {
                'transaction_count': count,
                'threshold': max_hourly_count,
                'window_hours': window_hours
            }
        return False, "", {}

    @classmethod
    def _evaluate_repeated_failed(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Rule 4: Flag accounts with repeated failed transactions within a configurable time window."""
        max_failures = int(params.get('max_failed_attempts', 2))
        window_minutes = int(params.get('window_minutes', 30))

        tx_time = tx.timestamp or datetime.now(timezone.utc)
        start_time = tx_time - timedelta(minutes=window_minutes)

        query = Transaction.query.filter(
            Transaction.account_id == tx.account_id,
            Transaction.status == 'failed',
            Transaction.timestamp >= start_time,
            Transaction.timestamp <= tx_time
        )
        if tx.id:
            query = query.filter(Transaction.id != tx.id)

        failed_count = query.count()
        if tx.status == 'failed':
            failed_count += 1

        if failed_count >= max_failures:
            reason = f"Repeated failed transactions: {failed_count} failed attempts detected within {window_minutes} minutes (threshold: {max_failures})."
            return True, reason, {
                'failed_count': failed_count,
                'threshold': max_failures,
                'window_minutes': window_minutes
            }
        return False, "", {}

    @classmethod
    def _evaluate_unusual_location(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Rule 5: Flag transactions in unusual locations based on explicitly defined comparison rules.
        Do not infer location fraud from missing data.
        """
        if not tx.location or not tx.location.strip():
            # Missing data: do not infer fraud
            return False, "", {}

        loc = tx.location.strip().lower()
        high_risk_locs = [l.strip().lower() for l in params.get('high_risk_locations', ['sanctioned', 'high-risk', 'unknown proxy', 'vpn node'])]

        # Check explicit high-risk locations
        for hrl in high_risk_locs:
            if hrl and hrl in loc:
                reason = f"Transaction location '{tx.location}' matches high-risk geography watchlist: '{hrl}'."
                return True, reason, {'location': tx.location, 'matched_rule': hrl}

        # Check impossible travel velocity if enabled
        if params.get('check_velocity', True):
            window_hours = int(params.get('impossible_travel_hours', 2))
            tx_time = tx.timestamp or datetime.now(timezone.utc)
            start_time = tx_time - timedelta(hours=window_hours)

            prev_tx = Transaction.query.filter(
                Transaction.account_id == tx.account_id,
                Transaction.timestamp >= start_time,
                Transaction.timestamp < tx_time,
                Transaction.location.isnot(None)
            ).order_by(Transaction.timestamp.desc()).first()

            if prev_tx and prev_tx.location and prev_tx.location.strip().lower() != loc:
                reason = f"Geographic anomaly (Impossible Travel): Transaction in '{tx.location}' shortly after earlier transaction in '{prev_tx.location}' ({window_hours}hr window)."
                return True, reason, {
                    'current_location': tx.location,
                    'previous_location': prev_tx.location,
                    'window_hours': window_hours
                }

        return False, "", {}

    @classmethod
    def _evaluate_custom_rule(cls, tx: Transaction, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Rule 6: Configurable custom rules without arbitrary code execution.
        Supports structured conditions:
        - restricted_categories: list of merchant categories
        - round_amount_threshold: e.g. 5000 (flags structuring multiples of 1000 >= threshold)
        - high_risk_channel: list of flagged channels
        """
        # 1. Restricted merchant categories (e.g. crypto, gambling)
        restricted_cats = [c.lower() for c in params.get('restricted_categories', [])]
        if restricted_cats and tx.merchant_category and tx.merchant_category.lower() in restricted_cats:
            reason = f"Transaction at merchant category '{tx.merchant_category}' matches restricted/high-risk business category."
            return True, reason, {'merchant_category': tx.merchant_category, 'restricted': restricted_cats}

        # 2. Structuring / Round amount detection
        round_threshold = params.get('round_amount_threshold')
        if round_threshold:
            val = float(tx.amount)
            if val >= float(round_threshold) and val % 1000 == 0:
                reason = f"Structured round amount detected: {tx.currency} {val:,.2f} is an exact multiple of 1,000 above threshold."
                return True, reason, {'amount': val, 'threshold': float(round_threshold)}

        # 3. Channel restriction
        restricted_channels = [ch.lower() for ch in params.get('restricted_channels', [])]
        if restricted_channels and tx.channel and tx.channel.lower() in restricted_channels:
            reason = f"Transaction conducted via restricted or elevated-risk channel '{tx.channel}'."
            return True, reason, {'channel': tx.channel, 'restricted_channels': restricted_channels}

        return False, "", {}
