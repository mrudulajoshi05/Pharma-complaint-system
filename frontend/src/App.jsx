import React from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store';
import { clearStatusMessage } from './store/complaintSlice';
import Header from './components/Header';
import ComplaintIngestion from './components/ComplaintIngestion';
import ComplaintForm from './components/ComplaintForm';
import AiCopilot from './components/AiCopilot';
import ComplaintHistory from './components/ComplaintHistory';
import { X, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

function Dashboard() {
  const dispatch = useDispatch();
  const { statusMessage } = useSelector((state) => state.complaint);

  const renderStatusIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'error':
        return <AlertOctagon size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  return (
    <div className="app-container">
      <Header />

      <main className="main-content">
        {/* Global Notification Banner */}
        {statusMessage && (
          <div className={`status-banner status-${statusMessage.type}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderStatusIcon(statusMessage.type)}
              <span>{statusMessage.text}</span>
            </div>
            <button
              className="btn-dismiss"
              onClick={() => dispatch(clearStatusMessage())}
              title="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Top Ingestion & AI Copilot Row */}
          <div className="dashboard-top-row">
            <ComplaintIngestion />
            <AiCopilot />
          </div>

          {/* Form Section */}
          <ComplaintForm />

          {/* History Log Section */}
          <ComplaintHistory />
        </div>
      </main>

      <footer className="footer">
        <p>AIVOA Pharma Quality Management System &bull; LangGraph AI Complaint Agent &bull; 21 CFR Part 11 Compliant Design</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Dashboard />
    </Provider>
  );
}
