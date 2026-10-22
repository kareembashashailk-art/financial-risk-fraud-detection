import io

def test_csv_import_missing_headers(client, auth_headers):
    headers = auth_headers('risk_analyst')
    # Missing required amount and timestamp columns
    csv_data = "account_id,other_col\nACC-TEST-001,dummy\n"
    data = {'file': (io.BytesIO(csv_data.encode('utf-8')), 'test.csv')}
    res = client.post('/api/transactions/import-csv', headers=headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 422
    assert "Missing required CSV column" in res.get_json()['message']

def test_csv_import_success_and_row_rejection(client, auth_headers):
    headers = auth_headers('risk_analyst')
    csv_content = """transaction_id,account_id,amount,timestamp,merchant_name,merchant_category
TX-CSV-VALID-1,ACC-TEST-001,150.00,2026-10-19 12:00:00,Target Store,retail
TX-CSV-INVALID-AMT,ACC-TEST-001,NOT_A_NUMBER,2026-10-19 12:05:00,Bad Store,retail
TX-CSV-HIGH,ACC-TEST-001,12000.00,2026-10-19 12:10:00,High Value Dealer,crypto
"""
    data = {'file': (io.BytesIO(csv_content.encode('utf-8')), 'valid_and_invalid.csv')}
    res = client.post('/api/transactions/import-csv', headers=headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data['imported_count'] == 2
    assert res_data['rejected_count'] == 1
    assert res_data['alerts_generated'] >= 1
    assert len(res_data['rejected_rows']) == 1
    assert "Invalid monetary amount" in res_data['rejected_rows'][0]['error']

def test_csv_import_duplicate_prevention(client, auth_headers):
    headers = auth_headers('risk_analyst')
    csv_content = """transaction_id,account_id,amount,timestamp,merchant_name
TX-CSV-DUP-1,ACC-TEST-001,200.00,2026-10-19 14:00:00,Shop One
"""
    # First upload
    data1 = {'file': (io.BytesIO(csv_content.encode('utf-8')), 'dup1.csv')}
    res1 = client.post('/api/transactions/import-csv', headers=headers, data=data1, content_type='multipart/form-data')
    assert res1.status_code == 200
    assert res1.get_json()['imported_count'] == 1

    # Second upload with same transaction_id
    data2 = {'file': (io.BytesIO(csv_content.encode('utf-8')), 'dup2.csv')}
    res2 = client.post('/api/transactions/import-csv', headers=headers, data=data2, content_type='multipart/form-data')
    assert res2.status_code == 200
    res2_data = res2.get_json()
    assert res2_data['imported_count'] == 0
    assert res2_data['rejected_count'] == 1
    assert "already exists in the system" in res2_data['rejected_rows'][0]['error']
