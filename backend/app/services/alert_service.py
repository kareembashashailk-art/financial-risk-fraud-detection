from datetime import datetime, timezone
import uuid
from ..models import db, Alert, AlertStatus, ReviewDecision, AlertReviewHistory, Transaction, SystemSetting
from .audit_service import AuditService, AuditAction

class AlertService:
    @classmethod
    def get_alert_score_threshold(cls) -> int:
        """Threshold score at or above which an alert is automatically generated."""
        threshold = SystemSetting.get_setting('alert_threshold', 60)
        try:
            return int(threshold)
        except Exception:
            return 60

    @classmethod
    def process_transaction_alert(cls, transaction: Transaction, score_summary: dict) -> Alert:
        """
        Evaluate if an alert should be created for this transaction and prevent duplicate alerts.
        """
        score = score_summary.get('final_score', 0)
        risk_level = score_summary.get('risk_level', 'LOW')
        reasons = score_summary.get('reasons', [])
        alert_threshold = cls.get_alert_score_threshold()

        # Generate alert if score meets alert threshold or risk_level is HIGH
        if score < alert_threshold and risk_level != 'HIGH':
            return None

        # Check for existing alert for this transaction to avoid duplicates
        existing_alert = Alert.query.filter_by(transaction_id=transaction.id).first()
        if existing_alert:
            # Update score and reasons if changed, but do not create duplicate
            existing_alert.risk_score = score
            existing_alert.risk_level = risk_level
            existing_alert.triggered_rule_reasons = reasons
            db.session.commit()
            return existing_alert

        # Generate new alert ID
        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"

        alert = Alert(
            id=alert_id,
            transaction_id=transaction.id,
            account_id=transaction.account_id,
            risk_score=score,
            risk_level=risk_level,
            triggered_rule_reasons=reasons,
            status=AlertStatus.NEW,
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(alert)
        transaction.is_flagged = True
        db.session.commit()

        # Audit log creation
        AuditService.log(
            action=AuditAction.ALERT_STATUS_CHANGE,
            target_type='alert',
            target_id=alert.id,
            details={
                'event': 'AUTO_ALERT_GENERATION',
                'risk_score': score,
                'risk_level': risk_level,
                'rules_triggered': len(reasons)
            }
        )

        return alert

    @classmethod
    def update_alert_review(cls, alert: Alert, reviewer, new_status: str = None, decision: str = None, note: str = None) -> Alert:
        """
        Update alert status, assign reviewer, record decision, add review history, and audit log.
        """
        previous_status = alert.status
        status_changed = False
        decision_recorded = False

        if new_status and new_status in AlertStatus.ALL_STATUSES:
            if alert.status != new_status:
                alert.status = new_status
                status_changed = True

        if decision and decision in ReviewDecision.ALL_DECISIONS:
            alert.final_decision = decision
            alert.decision_timestamp = datetime.now(timezone.utc)
            decision_recorded = True
            # When a final review decision is recorded, mark alert as closed
            alert.status = AlertStatus.CLOSED

        if note:
            existing_notes = alert.reviewer_notes or ""
            timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            new_note_entry = f"[{timestamp_str} by {reviewer.username}]: {note}"
            alert.reviewer_notes = f"{existing_notes}\n{new_note_entry}".strip()

        # Automatically assign current reviewer if not assigned
        if not alert.assigned_reviewer_id and reviewer:
            alert.assigned_reviewer_id = reviewer.id

        # Record in review history
        history_entry = AlertReviewHistory(
            alert_id=alert.id,
            reviewer_id=reviewer.id if reviewer else None,
            reviewer_username=reviewer.username if reviewer else 'system',
            previous_status=previous_status,
            new_status=alert.status,
            decision=decision,
            note=note,
            timestamp=datetime.now(timezone.utc)
        )
        db.session.add(history_entry)
        db.session.commit()

        # Record audit log
        action = AuditAction.ALERT_DECISION if decision_recorded else AuditAction.ALERT_STATUS_CHANGE
        AuditService.log(
            action=action,
            target_type='alert',
            target_id=alert.id,
            details={
                'previous_status': previous_status,
                'new_status': alert.status,
                'decision': decision,
                'has_note': bool(note)
            },
            actor_user=reviewer
        )

        return alert
