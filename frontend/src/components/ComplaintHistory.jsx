import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints } from '../store/complaintSlice';
import { History, RefreshCw, Search, CheckCircle2, AlertTriangle, Download, Filter } from 'lucide-react';

export default function ComplaintHistory() {
  const dispatch = useDispatch();
  const { complaintLogs, isFetching } = useSelector((state) => state.complaint);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  useEffect(() => {
    dispatch(fetchComplaints());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchComplaints());
  };

  const filteredComplaints = complaintLogs.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      item.product_name?.toLowerCase().includes(term) ||
      item.batch_number?.toLowerCase().includes(term) ||
      item.complaint_type?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term);

    const matchesSeverity =
      severityFilter === 'ALL' || item.severity_level?.toUpperCase() === severityFilter;

    const matchesRisk =
      riskFilter === 'ALL' || item.risk_classification?.toUpperCase() === riskFilter;

    return matchesSearch && matchesSeverity && matchesRisk;
  });

  const exportToCSV = () => {
    if (filteredComplaints.length === 0) return;

    const headers = [
      'ID',
      'Created At',
      'Product Name',
      'Batch Number',
      'Complaint Category',
      'Severity Level',
      'Risk Classification',
      'Suggested CAPA',
      'Completeness Status',
      'Description',
    ];

    const rows = filteredComplaints.map((c) => [
      c.id,
      `"${c.created_at || ''}"`,
      `"${(c.product_name || '').replace(/"/g, '""')}"`,
      `"${(c.batch_number || '').replace(/"/g, '""')}"`,
      `"${(c.complaint_type || '').replace(/"/g, '""')}"`,
      `"${(c.severity_level || '').replace(/"/g, '""')}"`,
      `"${(c.risk_classification || '').replace(/"/g, '""')}"`,
      `"${(c.suggested_capa || '').replace(/"/g, '""')}"`,
      c.is_complete ? 'Complete' : 'Incomplete',
      `"${(c.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AIVOA_Pharma_Complaints_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (e) {
      return dateStr;
    }
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return 'badge badge-critical';
      case 'major':
        return 'badge badge-major';
      case 'minor':
      default:
        return 'badge badge-minor';
    }
  };

  return (
    <div className="card history-card">
      <div className="card-header">
        <div className="card-title-group">
          <History className="card-icon text-teal" size={20} />
          <h2>3. Complaint Audit Trail & History Log</h2>
          <span className="log-count">({filteredComplaints.length} Records)</span>
        </div>

        <div className="history-controls">
          {/* Search Box */}
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search product, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Severity Dropdown Filter */}
          <div className="filter-dropdown-group">
            <Filter size={13} className="filter-icon" />
            <select
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
            </select>
          </div>

          {/* Risk Dropdown Filter */}
          <div className="filter-dropdown-group">
            <select
              className="filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            className="btn-export-csv"
            onClick={exportToCSV}
            disabled={filteredComplaints.length === 0}
            title="Export CSV File"
          >
            <Download size={14} /> Export CSV
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn-icon"
            onClick={handleRefresh}
            title="Refresh Log"
          >
            <RefreshCw size={15} className={isFetching ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      <div className="card-body p-0">
        {isFetching && complaintLogs.length === 0 ? (
          <div className="table-empty">Loading history logs...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="table-empty">
            {searchTerm || severityFilter !== 'ALL' || riskFilter !== 'ALL'
              ? 'No complaints match your active filter criteria.'
              : 'No complaints logged yet.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Product Name</th>
                  <th>Batch #</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Risk</th>
                  <th>Suggested CAPA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="id-tag">#{log.id}</span>
                    </td>
                    <td className="time-col">{formatDate(log.created_at)}</td>
                    <td>
                      <strong>{log.product_name}</strong>
                    </td>
                    <td>
                      <code className="batch-code">{log.batch_number}</code>
                    </td>
                    <td>{log.complaint_type}</td>
                    <td>
                      <span className={getSeverityBadgeClass(log.severity_level)}>
                        {log.severity_level}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-pill risk-${log.risk_classification?.toLowerCase()}`}>
                        {log.risk_classification}
                      </span>
                    </td>
                    <td className="capa-col" title={log.suggested_capa}>
                      <span className="truncate-text">{log.suggested_capa || 'N/A'}</span>
                    </td>
                    <td>
                      {log.is_complete ? (
                        <span className="badge badge-success-sm" title="Complete Record">
                          <CheckCircle2 size={12} /> Complete
                        </span>
                      ) : (
                        <span className="badge badge-warning-sm" title="Incomplete Record">
                          <AlertTriangle size={12} /> Incomplete
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
