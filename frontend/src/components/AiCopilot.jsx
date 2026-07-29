import React from 'react';
import { useSelector } from 'react-redux';
import { Bot, AlertOctagon, CheckCircle, ShieldAlert, Wrench, Printer, FileText } from 'lucide-react';

export default function AiCopilot() {
  const { extractedData, isComplete, missingFields, rawText } = useSelector(
    (state) => state.complaint
  );

  const getRiskBadgeClass = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'HIGH':
        return 'risk-badge risk-high';
      case 'MEDIUM':
        return 'risk-badge risk-medium';
      case 'LOW':
      default:
        return 'risk-badge risk-low';
    }
  };

  const handleDownloadPdf = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const timestamp = new Date().toLocaleString();
    const risk = extractedData.risk_classification || 'Low';
    const severity = extractedData.severity_level || 'Minor';
    const capa = extractedData.suggested_capa || 'N/A';
    const prodName = extractedData.product_name || 'Unspecified Product';
    const batchNum = extractedData.batch_number || 'UNKNOWN';
    const type = extractedData.complaint_type || 'Quality';
    const description = extractedData.description || rawText || 'N/A';

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CAPA Assessment Report - ${prodName}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 40px;
              color: #1e293b;
              line-height: 1.6;
            }
            .header {
              border-bottom: 2px solid #0284c7;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin-top: 4px;
            }
            .report-title {
              font-size: 18px;
              font-weight: bold;
              color: #0369a1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 25px;
            }
            .field-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px 15px;
              border-radius: 6px;
            }
            .field-label {
              font-size: 11px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .field-value {
              font-size: 15px;
              font-weight: 600;
              color: #0f172a;
            }
            .risk-pill {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .risk-HIGH { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
            .risk-MEDIUM { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
            .risk-LOW { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .capa-box {
              background: #f0f9ff;
              border-left: 4px solid #0284c7;
              padding: 15px;
              font-size: 14px;
              color: #0c4a6e;
              border-radius: 0 6px 6px 0;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #cbd5e1;
              padding-top: 15px;
              font-size: 11px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            .sig-block {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .sig-line {
              width: 220px;
              border-top: 1px solid #94a3b8;
              padding-top: 5px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">AIVOA PHARMA QUALITY SYSTEM</div>
              <div class="subtitle">21 CFR Part 11 Regulatory Compliance Report & Assessment</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <strong>Report Generated:</strong><br/>${timestamp}
            </div>
          </div>

          <div class="report-title">CAPA & Regulatory Risk Assessment Summary</div>

          <div class="grid">
            <div class="field-box">
              <div class="field-label">Product Name</div>
              <div class="field-value">${prodName}</div>
            </div>
            <div class="field-box">
              <div class="field-label">Batch / Lot Number</div>
              <div class="field-value">${batchNum}</div>
            </div>
            <div class="field-box">
              <div class="field-label">Complaint Category</div>
              <div class="field-value">${type}</div>
            </div>
            <div class="field-box">
              <div class="field-label">Severity Level</div>
              <div class="field-value">${severity}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Pharma Risk Matrix Classification</div>
            <div>
              <span class="risk-pill risk-${risk.toUpperCase()}">${risk} RISK LEVEL</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Recommended Corrective & Preventive Action (CAPA)</div>
            <div class="capa-box">
              <strong>Action Plan:</strong> ${capa}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Raw Complaint Summary</div>
            <div style="font-size: 13px; color: #334155; white-space: pre-wrap; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">${description}</div>
          </div>

          <div class="sig-block">
            <div class="sig-line">QA Inspector Signature</div>
            <div class="sig-line">Regulatory Affairs Reviewer</div>
          </div>

          <div class="footer">
            <div>Document Ref: CAPA-RPT-${Date.now().toString().slice(-6)}</div>
            <div>Confidential &bull; Pharmaceutical Quality Assurance</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  };

  return (
    <div className="card copilot-card">
      <div className="card-header">
        <div className="card-title-group">
          <Bot className="card-icon text-purple" size={20} />
          2b. AI Copilot Assessment
        </div>
        <span className="copilot-pill">Groq Risk Matrix Engine</span>
      </div>

      <div className="card-body">
        {/* Risk Classification */}
        <div className="copilot-section">
          <div className="copilot-label">
            <ShieldAlert size={16} /> Pharma Risk Matrix Score
          </div>
          <div className="risk-display-row">
            <span className={getRiskBadgeClass(extractedData.risk_classification)}>
              {extractedData.risk_classification || 'Low'} Risk
            </span>
            <span className="severity-tag">
              Severity: <strong>{extractedData.severity_level || 'Minor'}</strong>
            </span>
          </div>
        </div>

        {/* Suggested CAPA */}
        <div className="copilot-section mt-4">
          <div className="copilot-label">
            <Wrench size={16} /> Recommended CAPA Action Plan
          </div>
          <div className="capa-box">
            {extractedData.suggested_capa ? (
              <p>{extractedData.suggested_capa}</p>
            ) : (
              <p className="text-muted">
                Run AI extraction to generate recommended Corrective and Preventive Actions.
              </p>
            )}
          </div>
        </div>

        {/* Completeness Verification Box */}
        <div className="copilot-section mt-4">
          <div className="copilot-label">
            <CheckCircle size={16} /> Completeness Validation
          </div>

          {isComplete ? (
            <div className="alert-box alert-success">
              <CheckCircle size={18} />
              <div>
                <strong>Data Verification Passed</strong>
                <p>Mandatory parameters (Product Name & Batch Number) are present.</p>
              </div>
            </div>
          ) : (
            <div className="alert-box alert-warning">
              <AlertOctagon size={18} />
              <div>
                <strong>Missing Regulatory Requirements</strong>
                <p>
                  Missing: <strong className="text-danger">{missingFields.join(', ')}</strong>.
                  Manual input required before final GMP logging.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Download PDF Action Button */}
        <div className="copilot-action-row mt-4">
          <button
            type="button"
            className="btn-pdf-report"
            onClick={handleDownloadPdf}
            disabled={!extractedData.product_name}
            title="Download CAPA Summary PDF Report"
          >
            <Printer size={15} /> Download CAPA Summary PDF
          </button>
        </div>
      </div>
    </div>
  );
}
