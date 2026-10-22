from datetime import datetime, timezone
import json
from flask import request
from ..models import db, AuditLog, AuditAction
from ..utils.decorators import get_current_user

class AuditService:
    @staticmethod
    def log(action: str, target_type: str = None, target_id: str = None, details: dict = None, actor_user = None):
        """
        Record an immutable audit log entry.
        Never logs passwords, tokens, or sensitive credentials.
        """
        try:
            # Mask or eliminate any sensitive fields from details
            sanitized_details = {}
            if isinstance(details, dict):
                for k, v in details.items():
                    if any(secret_term in k.lower() for secret_term in ['password', 'token', 'secret', 'jwt', 'auth']):
                        sanitized_details[k] = '***MASKED***'
                    else:
                        sanitized_details[k] = v
            elif details:
                sanitized_details = {'message': str(details)}

            # Determine actor
            actor = actor_user or get_current_user()
            actor_id = actor.id if actor else None
            actor_username = actor.username if actor else 'system'
            actor_role = actor.role if actor else 'system'

            # Client IP
            ip_address = None
            if request:
                ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
                if ip_address and ',' in ip_address:
                    ip_address = ip_address.split(',')[0].strip()

            log_entry = AuditLog(
                actor_id=actor_id,
                actor_username=actor_username,
                actor_role=actor_role,
                action=action,
                target_type=target_type,
                target_id=str(target_id) if target_id else None,
                details=sanitized_details,
                ip_address=ip_address,
                timestamp=datetime.now(timezone.utc)
            )
            db.session.add(log_entry)
            db.session.commit()
            return log_entry
        except Exception as e:
            # We must never crash the main transaction if audit logging encounters an issue
            db.session.rollback()
            print(f"[AUDIT LOG ERROR] Failed to record audit log: {e}")
            return None
