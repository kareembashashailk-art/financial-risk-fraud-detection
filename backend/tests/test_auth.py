import json

def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'username': 'test_admin',
        'password': 'Admin123!'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'access_token' in data
    assert data['user']['username'] == 'test_admin'
    assert data['user']['role'] == 'super_admin'
    assert 'password_hash' not in data['user']

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'username': 'test_admin',
        'password': 'WrongPassword999'
    })
    assert res.status_code == 401
    assert 'Invalid username or password' in res.get_json()['message']

def test_login_missing_fields(client):
    res = client.post('/api/auth/login', json={'username': 'test_admin'})
    assert res.status_code == 400

def test_get_me_profile(client, auth_headers):
    headers = auth_headers('risk_analyst')
    res = client.get('/api/auth/me', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['username'] == 'test_analyst'
    assert data['user']['role'] == 'risk_analyst'
