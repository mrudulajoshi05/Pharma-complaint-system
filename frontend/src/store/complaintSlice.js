import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const extractComplaint = createAsyncThunk(
  'complaint/extractComplaint',
  async (rawText, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/extract`, { raw_text: rawText });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Failed to extract complaint';
      return rejectWithValue(msg);
    }
  }
);

export const submitComplaint = createAsyncThunk(
  'complaint/submitComplaint',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/complaints`, formData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Failed to submit complaint';
      return rejectWithValue(msg);
    }
  }
);

export const fetchComplaints = createAsyncThunk(
  'complaint/fetchComplaints',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/complaints`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Failed to fetch complaints';
      return rejectWithValue(msg);
    }
  }
);

const initialExtractedData = {
  product_name: '',
  batch_number: '',
  complaint_type: 'Quality',
  severity_level: 'Minor',
  description: '',
  risk_classification: 'Low',
  suggested_capa: '',
};

const complaintSlice = createSlice({
  name: 'complaint',
  initialState: {
    rawText: '',
    extractedData: initialExtractedData,
    isExtracting: false,
    isSubmitting: false,
    isFetching: false,
    isComplete: true,
    missingFields: [],
    complaintLogs: [],
    statusMessage: null,
  },
  reducers: {
    setRawText: (state, action) => {
      state.rawText = action.payload;
    },
    updateExtractedField: (state, action) => {
      const { field, value } = action.payload;
      state.extractedData[field] = value;

      // Re-evaluate completeness on edit
      const missing = [];
      const pName = state.extractedData.product_name?.trim();
      const bNum = state.extractedData.batch_number?.trim();

      const isUnknown = (val) => !val || ['UNKNOWN', 'N/A', 'NOT PROVIDED', 'UNSPECIFIED', 'MISSING', 'NONE'].includes(val.toUpperCase());

      if (isUnknown(pName)) missing.push('product_name');
      if (isUnknown(bNum)) missing.push('batch_number');

      state.missingFields = missing;
      state.isComplete = missing.length === 0;
    },
    clearStatusMessage: (state) => {
      state.statusMessage = null;
    },
    resetForm: (state) => {
      state.rawText = '';
      state.extractedData = initialExtractedData;
      state.isComplete = true;
      state.missingFields = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Extract Complaint
      .addCase(extractComplaint.pending, (state) => {
        state.isExtracting = true;
        state.statusMessage = { type: 'info', text: 'AI Copilot analyzing raw complaint text...' };
      })
      .addCase(extractComplaint.fulfilled, (state, action) => {
        state.isExtracting = false;
        const data = action.payload;
        state.extractedData = {
          product_name: data.product_name || '',
          batch_number: data.batch_number || '',
          complaint_type: data.complaint_type || 'Quality',
          severity_level: data.severity_level || 'Minor',
          description: data.description || '',
          risk_classification: data.risk_classification || 'Low',
          suggested_capa: data.suggested_capa || '',
        };
        state.isComplete = data.is_complete !== undefined ? data.is_complete : true;
        state.missingFields = data.missing_fields || [];
        state.statusMessage = {
          type: state.isComplete ? 'success' : 'warning',
          text: state.isComplete
            ? 'Structured extraction complete. Please verify details before logging.'
            : `Extraction complete with missing mandatory fields: ${state.missingFields.join(', ')}`,
        };
      })
      .addCase(extractComplaint.rejected, (state, action) => {
        state.isExtracting = false;
        state.statusMessage = { type: 'error', text: action.payload || 'Extraction failed.' };
      })

      // Submit Complaint
      .addCase(submitComplaint.pending, (state) => {
        state.isSubmitting = true;
        state.statusMessage = { type: 'info', text: 'Logging complaint into QMS database...' };
      })
      .addCase(submitComplaint.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.complaintLogs.unshift(action.payload);
        state.statusMessage = { type: 'success', text: `Complaint #${action.payload.id} logged successfully!` };
        // Reset form after successful submission
        state.rawText = '';
        state.extractedData = initialExtractedData;
        state.missingFields = [];
        state.isComplete = true;
      })
      .addCase(submitComplaint.rejected, (state, action) => {
        state.isSubmitting = false;
        state.statusMessage = { type: 'error', text: action.payload || 'Failed to submit complaint.' };
      })

      // Fetch Complaints
      .addCase(fetchComplaints.pending, (state) => {
        state.isFetching = true;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.isFetching = false;
        state.complaintLogs = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.isFetching = false;
        state.statusMessage = { type: 'error', text: action.payload || 'Failed to fetch complaint history.' };
      });
  },
});

export const { setRawText, updateExtractedField, clearStatusMessage, resetForm } = complaintSlice.actions;
export default complaintSlice.reducer;
