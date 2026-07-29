import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateExtractedField, submitComplaint } from '../store/complaintSlice';
import { ClipboardList, AlertTriangle, CheckCircle2, Save, Send } from 'lucide-react';

export default function ComplaintForm() {
  const dispatch = useDispatch();
  const { extractedData, isSubmitting, missingFields, isComplete } = useSelector(
    (state) => state.complaint
  );

  const handleChange = (field, value) => {
    dispatch(updateExtractedField({ field, value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitComplaint({ ...extractedData, is_complete: isComplete }));
  };

  const isFieldMissing = (field) => missingFields.includes(field);

  return (
    <div className="card form-card">
      <div className="card-header">
        <div className="card-title-group">
          <ClipboardList className="card-icon text-blue" size={20} />
          <h2>2. Complaint Log Details</h2>
        </div>
        <div>
          {isComplete ? (
            <span className="badge badge-success">
              <CheckCircle2 size={13} /> Complete Record
            </span>
          ) : (
            <span className="badge badge-warning animate-pulse">
              <AlertTriangle size={13} /> Incomplete Record ({missingFields.length} missing)
            </span>
          )}
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Product Name */}
            <div className={`form-group ${isFieldMissing('product_name') ? 'group-warning' : ''}`}>
              <label htmlFor="product_name">
                Product Name <span className="req">*</span>
                {isFieldMissing('product_name') && (
                  <span className="field-warn-tag">Missing / Action Required</span>
                )}
              </label>
              <input
                id="product_name"
                type="text"
                className={`input-field ${isFieldMissing('product_name') ? 'input-warning' : ''}`}
                value={extractedData.product_name || ''}
                onChange={(e) => handleChange('product_name', e.target.value)}
                placeholder="e.g. Amoxicillin 500mg"
                required
              />
            </div>

            {/* Batch Number */}
            <div className={`form-group ${isFieldMissing('batch_number') ? 'group-warning' : ''}`}>
              <label htmlFor="batch_number">
                Batch / Lot Number <span className="req">*</span>
                {isFieldMissing('batch_number') && (
                  <span className="field-warn-tag">Missing / Action Required</span>
                )}
              </label>
              <input
                id="batch_number"
                type="text"
                className={`input-field ${isFieldMissing('batch_number') ? 'input-warning' : ''}`}
                value={extractedData.batch_number || ''}
                onChange={(e) => handleChange('batch_number', e.target.value)}
                placeholder="e.g. AMX-2024-8891 or UNKNOWN"
                required
              />
            </div>

            {/* Complaint Type */}
            <div className="form-group">
              <label htmlFor="complaint_type">Complaint Category</label>
              <select
                id="complaint_type"
                className="input-field"
                value={extractedData.complaint_type || 'Quality'}
                onChange={(e) => handleChange('complaint_type', e.target.value)}
              >
                <option value="Quality">Quality Defect</option>
                <option value="Packaging">Packaging & Sealing</option>
                <option value="Contamination">Contamination / Foreign Body</option>
                <option value="Labeling">Mislabeling / Misbranding</option>
                <option value="Adverse Event">Adverse Reaction / Health Hazard</option>
                <option value="Other">Other Category</option>
              </select>
            </div>

            {/* Severity Level */}
            <div className="form-group">
              <label htmlFor="severity_level">Severity Level</label>
              <select
                id="severity_level"
                className="input-field"
                value={extractedData.severity_level || 'Minor'}
                onChange={(e) => handleChange('severity_level', e.target.value)}
              >
                <option value="Critical">Critical (Immediate Hazard)</option>
                <option value="Major">Major (Regulatory Impact)</option>
                <option value="Minor">Minor (Non-critical Defect)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group full-width">
            <label htmlFor="description">Complaint Detailed Summary</label>
            <textarea
              id="description"
              className="input-field textarea-field"
              rows={4}
              value={extractedData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detailed description of defect..."
              required
            />
          </div>

          <div className="form-submit-row">
            <button
              type="submit"
              className="btn-success btn-large"
              disabled={isSubmitting || !extractedData.product_name}
            >
              {isSubmitting ? (
                <>Saving to Database...</>
              ) : (
                <>
                  <Send size={16} /> Save Complaint Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
