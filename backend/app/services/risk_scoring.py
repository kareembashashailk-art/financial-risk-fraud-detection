from typing import List, Dict, Tuple
from flask import has_app_context
from ..models import SystemSetting

class RiskScorer:
    """
    Transparent, deterministic risk scoring engine.
    Aggregates weights from triggered fraud detection rules and maps the composite
    score to a categorized risk tier (LOW, MEDIUM, HIGH).
    """

    DEFAULT_LOW_MAX = 29
    DEFAULT_MEDIUM_MAX = 59
    DEFAULT_HIGH_MIN = 60

    @classmethod
    def get_thresholds(cls) -> Dict[str, int]:
        """Fetch active risk thresholds from database configuration or fallback defaults."""
        if has_app_context():
            try:
                thresholds = SystemSetting.get_setting('risk_thresholds', None)
                if thresholds and isinstance(thresholds, dict):
                    return {
                        'low_max': int(thresholds.get('low_max', cls.DEFAULT_LOW_MAX)),
                        'medium_max': int(thresholds.get('medium_max', cls.DEFAULT_MEDIUM_MAX)),
                        'high_min': int(thresholds.get('high_min', cls.DEFAULT_HIGH_MIN))
                    }
            except Exception:
                pass
        return {
            'low_max': cls.DEFAULT_LOW_MAX,
            'medium_max': cls.DEFAULT_MEDIUM_MAX,
            'high_min': cls.DEFAULT_HIGH_MIN
        }

    @classmethod
    def validate_thresholds(cls, low_max: int, medium_max: int, high_min: int) -> Tuple[bool, str]:
        """
        Validate that threshold boundaries:
        1. Are within 0-100 range.
        2. Are strictly monotonic (low_max < medium_max < 100).
        3. Do not overlap and completely partition the range [0, 100].
        """
        if not (0 <= low_max < medium_max < 100):
            return False, "Low max must be less than medium max, and both must be between 0 and 99."
        if high_min != medium_max + 1:
            return False, f"High min must start immediately after medium max (expected {medium_max + 1}, got {high_min})."
        return True, "Valid"

    @classmethod
    def calculate_score(cls, triggered_rules: List[Dict]) -> Dict:
        """
        Calculate composite risk score from list of triggered rule results.
        
        Aggregation method:
        - Raw Score: Sum of individual weights of triggered rules.
        - Deduplication: If the same rule triggers multiple times within a single evaluation,
          its weight is only counted once to prevent accidental score inflation.
        - Final Score: Capped at exactly 100: min(100, sum(weights)).
        
        Returns:
            dict containing final_score, raw_score, risk_level, breakdown, and rule_reasons
        """
        seen_rules = set()
        total_weight = 0
        rule_breakdowns = []
        reasons = []

        for item in triggered_rules:
            rule_id = item.get('rule_id')
            if not rule_id or rule_id in seen_rules:
                continue

            seen_rules.add(rule_id)
            weight = int(item.get('weight_contributed', item.get('weight', 0)))
            total_weight += weight

            reason = item.get('reason', f"Triggered rule {item.get('rule_name', rule_id)}")
            reasons.append(reason)

            rule_breakdowns.append({
                'rule_id': rule_id,
                'rule_name': item.get('rule_name', rule_id),
                'weight': weight,
                'severity': item.get('severity', 'MEDIUM'),
                'reason': reason
            })

        # Cap at 100
        final_score = min(100, max(0, total_weight))

        # Determine tier
        thresholds = cls.get_thresholds()
        if final_score <= thresholds['low_max']:
            risk_level = 'LOW'
        elif final_score <= thresholds['medium_max']:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'HIGH'

        return {
            'final_score': final_score,
            'raw_score': total_weight,
            'risk_level': risk_level,
            'thresholds': thresholds,
            'rule_count': len(rule_breakdowns),
            'breakdown': rule_breakdowns,
            'reasons': reasons
        }
