import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  AlertTriangle,
  RotateCcw,
  Info,
} from 'lucide-react';
import { transactionsApi } from '../api';
import { useNotification } from '../context/NotificationContext';

export const CsvImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const { success, error: notifyError } = useNotification();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        notifyError('Please upload a valid .csv file.');
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      notifyError('Please select a CSV file first.');
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await transactionsApi.importCsv(formData);
      setResult(res.data);
      success(
        `Batch processing complete: ${res.data.imported_count} imported, ${res.data.rejected_count} rejected.`
      );
    } catch (err) {
      notifyError(err.response?.data?.message || 'CSV Import failed. Check header format.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'transaction_id,account_id,amount,currency,timestamp,merchant_name,merchant_category,channel,status,location,ip_address\n' +
      'TXN-SAMPLE-101,ACC-001,45.50,USD,2026-10-18 09:15:00,Local Grocery Mart,groceries,in_store,completed,Seattle US,192.168.1.10\n' +
      'TXN-SAMPLE-102,ACC-003,7500.00,USD,2026-10-18 11:45:00,High End Electronics Store,electronics,online,completed,New York US,198.51.100.22\n' +
      'TXN-SAMPLE-103,ACC-005,12500.00,USD,2026-10-18 14:10:00,Offshore Coin Marketplace,crypto,online,completed,Tor Exit Node,185.220.101.5\n' +
      'TXN-SAMPLE-104,ACC-004,250.00,USD,2026-10-18 15:00:00,Retail Store,retail,in_store,failed,Chicago US,203.0.113.45\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'synthetic_sample_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Batch CSV Transaction Import</h1>
          <p className="text-sm text-slate-400 mt-1">
            Ingest synthetic transaction streams with real-time schema validation and instant fraud evaluation.
          </p>
        </div>

        <button
          onClick={downloadSampleCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all self-start"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors">
              <input
                type="file"
                id="csvInput"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="csvInput" className="cursor-pointer flex flex-col items-center">
                <div className="p-4 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <span className="text-sm font-semibold text-white">
                  {file ? file.name : 'Choose a CSV file or drag and drop here'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Supported format: UTF-8 Encoded .csv (up to 16MB)
                </span>
                {file && (
                  <span className="mt-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {(file.size / 1024).toFixed(1)} KB selected
                  </span>
                )}
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Transactions will be checked for duplicate IDs, validated for types, and processed through all active rules.
              </span>

              <button
                type="submit"
                disabled={!file || uploading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all"
              >
                {uploading ? 'Validating & Importing...' : 'Execute Batch Ingestion'}
              </button>
            </div>
          </form>

          {/* Results Summary */}
          {result && (
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Batch Execution Summary</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                  <div className="text-xl font-bold text-emerald-400">{result.imported_count}</div>
                  <div className="text-[11px] text-slate-400">Successfully Imported</div>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                  <div className="text-xl font-bold text-rose-400">{result.rejected_count}</div>
                  <div className="text-[11px] text-slate-400">Rows Rejected</div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
                  <div className="text-xl font-bold text-amber-400">{result.alerts_generated}</div>
                  <div className="text-[11px] text-slate-400">Alerts Raised</div>
                </div>
              </div>

              {/* Rejected Rows Table */}
              {result.rejected_rows && result.rejected_rows.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Rejected Rows & Detailed Error Logs</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950">
                          <th className="py-2 px-3">Row #</th>
                          <th className="py-2 px-3">Tx ID</th>
                          <th className="py-2 px-3">Validation Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {result.rejected_rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-slate-400">{r.row}</td>
                            <td className="py-2 px-3 text-slate-200">{r.transaction_id || 'N/A'}</td>
                            <td className="py-2 px-3 text-rose-300 font-sans">{r.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column Specs & Guide */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              CSV Schema Specification
            </h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The CSV ingestion pipeline requires the following standardized column headers:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono font-bold text-blue-400">account_id *</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Required. Customer account identifier.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono font-bold text-blue-400">amount *</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Required. Positive decimal monetary value.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono font-bold text-blue-400">timestamp *</span>
              <p className="text-slate-400 text-[11px] mt-0.5">Required. YYYY-MM-DD HH:MM:SS or ISO-8601.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-slate-300">transaction_id</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Optional. Auto-generated if omitted.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-slate-300">merchant_category</span>
              <p className="text-slate-500 text-[11px] mt-0.5">e.g. groceries, retail, crypto, gambling.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-slate-300">location</span>
              <p className="text-slate-500 text-[11px] mt-0.5">City / Country or Tor / Proxy node.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
