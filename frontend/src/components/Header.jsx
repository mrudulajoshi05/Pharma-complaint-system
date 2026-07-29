import React from 'react';
import { ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function Header() {
  return (
    <header className="header-nav">
      <div className="header-container">
        <div className="brand-group">
          <div className="brand-icon">
            <ShieldCheck size={28} className="icon-pulse" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">AI Complaint Management System</h1>
              <span className="brand-badge">AIVOA QMS</span>
            </div>
            <p className="brand-subtitle">
              Automated Pharma Complaint Extraction, Completeness Check & Risk Assessment
            </p>
          </div>
        </div>

        <div className="system-status-group">
          <div className="status-pill">
            <Cpu size={15} />
            <span>LangGraph Agent: <strong className="text-emerald">Active</strong></span>
          </div>
          <div className="status-pill">
            <Activity size={15} />
            <span>LLM Engine: <strong>gemma2-9b-it</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
