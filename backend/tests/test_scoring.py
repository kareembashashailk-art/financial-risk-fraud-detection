from app.services.risk_scoring import RiskScorer

def test_risk_score_aggregation_and_cap():
    # 3 rules with weights 40, 35, 35 -> sum = 110 -> capped at 100
    triggered = [
        {'rule_id': 'R1', 'rule_name': 'Rule 1', 'weight': 40, 'reason': 'Reason 1'},
        {'rule_id': 'R2', 'rule_name': 'Rule 2', 'weight': 35, 'reason': 'Reason 2'},
        {'rule_id': 'R3', 'rule_name': 'Rule 3', 'weight': 35, 'reason': 'Reason 3'}
    ]
    result = RiskScorer.calculate_score(triggered)
    assert result['raw_score'] == 110
    assert result['final_score'] == 100
    assert result['risk_level'] == 'HIGH'
    assert len(result['breakdown']) == 3

def test_risk_score_deduplication():
    # Same rule triggered twice within a single transaction must NOT double-count weight
    triggered = [
        {'rule_id': 'R1', 'rule_name': 'Rule 1', 'weight': 30, 'reason': 'Reason 1'},
        {'rule_id': 'R1', 'rule_name': 'Rule 1', 'weight': 30, 'reason': 'Duplicate Reason 1'}
    ]
    result = RiskScorer.calculate_score(triggered)
    assert result['final_score'] == 30
    assert len(result['breakdown']) == 1

def test_risk_tier_categorization():
    # Tier Low (0 - 29)
    res_low = RiskScorer.calculate_score([{'rule_id': 'R_LOW', 'weight': 20, 'reason': 'Low risk'}])
    assert res_low['final_score'] == 20
    assert res_low['risk_level'] == 'LOW'

    # Tier Medium (30 - 59)
    res_med = RiskScorer.calculate_score([{'rule_id': 'R_MED', 'weight': 45, 'reason': 'Medium risk'}])
    assert res_med['final_score'] == 45
    assert res_med['risk_level'] == 'MEDIUM'

    # Tier High (60 - 100)
    res_high = RiskScorer.calculate_score([
        {'rule_id': 'R_H1', 'weight': 40, 'reason': 'H1'},
        {'rule_id': 'R_H2', 'weight': 25, 'reason': 'H2'}
    ])
    assert res_high['final_score'] == 65
    assert res_high['risk_level'] == 'HIGH'

def test_validate_thresholds():
    # Valid
    valid, _ = RiskScorer.validate_thresholds(29, 59, 60)
    assert valid is True

    # Invalid: inverted
    valid, msg = RiskScorer.validate_thresholds(50, 40, 41)
    assert valid is False

    # Invalid: non-contiguous / gap
    valid, msg = RiskScorer.validate_thresholds(29, 59, 70)
    assert valid is False
