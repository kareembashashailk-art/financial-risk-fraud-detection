def test_super_admin_can_create_user(client, auth_headers):
    headers = auth_headers('super_admin')
    res = client.post('/api/users', headers=headers, json={
        'username': 'new_analyst',
        'email': 'new_analyst@test.local',
        'password': 'SecurePassword123!',
        'role': 'risk_analyst',
        'full_name': 'New Analyst'
    })
    assert res.status_code == 201
    assert res.get_json()['user']['username'] == 'new_analyst'

def test_risk_analyst_cannot_create_user(client, auth_headers):
    headers = auth_headers('risk_analyst')
    res = client.post('/api/users', headers=headers, json={
        'username': 'unauthorized_user',
        'email': 'unauth@test.local',
        'password': 'Password123!',
        'role': 'risk_analyst'
    })
    assert res.status_code == 403
    assert 'Access denied' in res.get_json()['message']

def test_read_only_cannot_modify_rules(client, auth_headers):
    headers = auth_headers('read_only')
    res = client.put('/api/rules/RULE_HIGH_AMOUNT', headers=headers, json={
        'is_enabled': False
    })
    assert res.status_code == 403

def test_super_admin_can_update_rule(client, auth_headers):
    headers = auth_headers('super_admin')
    res = client.put('/api/rules/RULE_HIGH_AMOUNT', headers=headers, json={
        'weight': 45,
        'parameters': {'threshold_amount': 7500.00}
    })
    assert res.status_code == 200
    rule = res.get_json()['rule']
    assert rule['weight'] == 45
    assert rule['parameters']['threshold_amount'] == 7500.00

def test_read_only_can_view_dashboard(client, auth_headers):
    headers = auth_headers('read_only')
    res = client.get('/api/dashboard/stats', headers=headers)
    assert res.status_code == 200
    assert 'total_transactions' in res.get_json()
