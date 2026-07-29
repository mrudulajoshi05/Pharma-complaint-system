import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Add current directory to path
sys.path.insert(0, os.path.abspath("."))

from backend.agent import (
    PharmaComplaint,
    _clean_and_parse_json,
    completeness_check_node,
    extract_complaint_node,
    process_complaint_text,
    GraphState,
)

class TestPharmaComplaintAgent(unittest.TestCase):

    def test_pydantic_model_fields(self):
        complaint = PharmaComplaint(
            product_name="Amoxicillin 500mg",
            batch_number="AMX-2024-8891",
            complaint_type="Packaging",
            severity_level="Major",
            description="Blister pack seal was broken upon opening the box.",
            risk_classification="Medium",
            suggested_capa="Inspect sealing temperature on line 3."
        )
        data = complaint.model_dump()
        self.assertEqual(data["product_name"], "Amoxicillin 500mg")
        self.assertEqual(data["batch_number"], "AMX-2024-8891")
        self.assertEqual(data["complaint_type"], "Packaging")
        self.assertEqual(data["severity_level"], "Major")
        self.assertEqual(data["risk_classification"], "Medium")

    def test_clean_and_parse_json_with_markdown_fences(self):
        markdown_json = """```json
{
    "product_name": "Amoxicillin 500mg",
    "batch_number": "AMX-2024-8891",
    "complaint_type": "Quality",
    "severity_level": "Major",
    "description": "Yellow discoloration and severe crumbling on several tablets.",
    "risk_classification": "Medium",
    "suggested_capa": "Inspect blister sealing line and environmental controls."
}
```"""
        parsed = _clean_and_parse_json(markdown_json)
        self.assertIsInstance(parsed, PharmaComplaint)
        self.assertEqual(parsed.product_name, "Amoxicillin 500mg")
        self.assertEqual(parsed.batch_number, "AMX-2024-8891")

    def test_completeness_check_node_complete(self):
        state: GraphState = {
            "raw_text": "Sample text",
            "extracted_data": {
                "product_name": "Paracetamol 500mg",
                "batch_number": "PCT-9921",
                "complaint_type": "Quality",
                "severity_level": "Minor",
                "description": "Discolored tablet.",
                "risk_classification": "Low",
                "suggested_capa": "Quarantine batch for testing."
            },
            "is_complete": False,
            "missing_fields": [],
            "error": None
        }
        res = completeness_check_node(state)
        self.assertTrue(res["is_complete"])
        self.assertEqual(res["missing_fields"], [])

    def test_completeness_check_node_missing_batch(self):
        state: GraphState = {
            "raw_text": "Sample text missing batch number",
            "extracted_data": {
                "product_name": "Ibuprofen 400mg",
                "batch_number": "UNKNOWN",
                "complaint_type": "Labeling",
                "severity_level": "Major",
                "description": "Incorrect dosage label.",
                "risk_classification": "High",
                "suggested_capa": "Recall affected lot."
            },
            "is_complete": False,
            "missing_fields": [],
            "error": None
        }
        res = completeness_check_node(state)
        self.assertFalse(res["is_complete"])
        self.assertIn("batch_number", res["missing_fields"])

    def test_completeness_check_node_missing_both(self):
        state: GraphState = {
            "raw_text": "Missing all details",
            "extracted_data": {
                "product_name": "N/A",
                "batch_number": "",
                "complaint_type": "Contamination",
                "severity_level": "Critical",
                "description": "Foreign particle found.",
                "risk_classification": "High",
                "suggested_capa": "Halt line production."
            },
            "is_complete": False,
            "missing_fields": [],
            "error": None
        }
        res = completeness_check_node(state)
        self.assertFalse(res["is_complete"])
        self.assertIn("product_name", res["missing_fields"])
        self.assertIn("batch_number", res["missing_fields"])

    @patch("backend.agent._invoke_llm_with_fallback")
    def test_process_complaint_text_end_to_end(self, mock_llm_call):
        mock_complaint = PharmaComplaint(
            product_name="Lipitor 20mg",
            batch_number="LPT-10492",
            complaint_type="Quality",
            severity_level="Critical",
            description="Tablets fragmented inside sealed bottle.",
            risk_classification="High",
            suggested_capa="Conduct friability test and check tablet press compression settings."
        )
        mock_llm_call.return_value = mock_complaint

        result = process_complaint_text("Customer reports Lipitor 20mg batch LPT-10492 tablets were crumbled.")
        
        self.assertEqual(result["product_name"], "Lipitor 20mg")
        self.assertEqual(result["batch_number"], "LPT-10492")
        self.assertEqual(result["complaint_type"], "Quality")
        self.assertEqual(result["severity_level"], "Critical")
        self.assertTrue(result["is_complete"])
        self.assertEqual(result["missing_fields"], [])

if __name__ == "__main__":
    unittest.main()
