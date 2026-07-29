import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setRawText, extractComplaint } from '../store/complaintSlice';
import { Sparkles, FileText, Upload, RefreshCw, Zap } from 'lucide-react';

const SAMPLE_COMPLAINTS = {
  complete: `From: hospital_pharmacy@saintmarys.org
Date: 2026-07-28
Subject: URGENT: Discolored Tablets in Amoxicillin 500mg Batch AMX-2024-8891

Dear Quality Assurance Team,

During routine dispensing today at St. Mary's Hospital Pharmacy, our pharmacist noticed yellow discoloration and severe crumbling on several tablets in Amoxicillin 500mg (Batch Number: AMX-2024-8891, Exp Date: 11/2027). Three patients reported a bitter chemical odor upon opening the blister foil pack. 

Please investigate this quality defect immediately.

Sincerely,
Dr. Robert Vance, PharmD
Chief Pharmacist, St. Mary's Hospital`,

  incomplete: `Patient Call Report - Customer Service Line

Caller states that after taking 2 doses of their prescribed Blood Pressure tablets (product name: Lisinopril 10mg), they suffered severe hives and shortness of breath. The caller threw away the outer carton box and does not have the lot/batch number written anywhere.

Caller requests immediate refund and assistance reporting adverse event.`,
};

export default function ComplaintIngestion() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { rawText, isExtracting } = useSelector((state) => state.complaint);

  const handleExtract = () => {
    if (!rawText || !rawText.trim()) return;
    dispatch(extractComplaint(rawText));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        dispatch(setRawText(event.target.result));
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="card ingestion-card">
      <div className="card-header">
        <div className="card-title-group">
          <FileText className="card-icon text-indigo" size={20} />
          <h2>1. Raw Complaint Ingestion</h2>
        </div>
        <div className="preset-buttons">
          <button
            type="button"
            className="btn-preset"
            onClick={() => dispatch(setRawText(SAMPLE_COMPLAINTS.complete))}
          >
            <Zap size={13} /> Sample 1 (Complete)
          </button>
          <button
            type="button"
            className="btn-preset warning-preset"
            onClick={() => dispatch(setRawText(SAMPLE_COMPLAINTS.incomplete))}
          >
            <Zap size={13} /> Sample 2 (Missing Batch)
          </button>
        </div>
      </div>

      <div className="card-body">
        <p className="section-desc">
          Paste customer email, hotline transcript, or upload raw text document for automated AI extraction.
        </p>

        <div className="textarea-wrapper">
          <textarea
            className="complaint-textarea"
            placeholder="Paste raw complaint email, phone report text, or drag & drop text file here..."
            value={rawText}
            onChange={(e) => dispatch(setRawText(e.target.value))}
            rows={8}
          />
        </div>

        <div className="action-row">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.doc,.docx,.pdf,.json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} /> Upload Text File
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={!rawText.trim() || isExtracting}
            onClick={handleExtract}
          >
            {isExtracting ? (
              <>
                <RefreshCw size={16} className="spin-icon" /> AI Agent Extracting...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Run AI Extraction
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
