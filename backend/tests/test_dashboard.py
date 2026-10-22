def test_dashboard_stats_endpoint(client, auth_headers):
    headers = auth_headers('read_only')
    res = client.get('/api/dashboard/stats', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'total_transactions' in data
    assert 'total_alerts' in data
    assert 'high_risk_transactions' in data
    assert 'awaiting_review' in data
    assert 'reviewed_alerts' in data
    assert 'false_positives' in data
    assert 'confirmed_suspicious' in data

def test_dashboard_charts_endpoint(client, auth_headers):
    headers = auth_headers('risk_analyst')
    res = client.get('/api/dashboard/charts', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'risk_distribution' in data
    assert 'alert_status_distribution' in data
    assert 'decision_distribution' in data
    assert 'rules_triggered' in data
    assert 'timeline' in data
    assert len(data['timeline']) == 14

def test_dashboard_recent_suspicious_endpoint(client, auth_headers):
    headers = auth_headers('super_admin')
    res = client.get('/api/dashboard/recent-suspicious', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'recent_flagged_transactions' in data
    assert 'recent_alerts' in data
