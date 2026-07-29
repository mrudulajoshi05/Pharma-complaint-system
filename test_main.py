import sys
import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("."))

from backend.main import app, Base, engine

class TestFastAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @patch("backend.main.process_complaint_text")
    def test_extract_endpoint(self, mock_process):
        mock_process.return_value = {
            "product_name": "Paracetamol 500mg",
            "batch_number": "PCT-2024-001",
            "complaint_type": "Quality",
            "severity_level": "Minor",
            "description": "Tablet chipping.",
            "risk_classification": "Low",
            "suggested_capa": "Adjust punch speed.",
            "is_complete": True,
            "missing_fields": []
        }

        response = self.client.post("/api/extract", json={"raw_text": "Paracetamol 500mg batch PCT-2024-001 has tablet chipping."})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["product_name"], "Paracetamol 500mg")
        self.assertEqual(data["batch_number"], "PCT-2024-001")
        self.assertTrue(data["is_complete"])

    def test_create_and_get_complaints_endpoints(self):
        new_complaint = {
            "product_name": "Amoxicillin 250mg",
            "batch_number": "AMX-8812",
            "complaint_type": "Packaging",
            "severity_level": "Major",
            "description": "Seal broken on bottle.",
            "risk_classification": "Medium",
            "suggested_capa": "Check induction sealer.",
            "is_complete": True
        }

        # POST /api/complaints
        post_res = self.client.post("/api/complaints", json=new_complaint)
        self.assertIn(post_res.status_code, [200, 201])
        post_data = post_res.json()
        self.assertIn("id", post_data)
        self.assertEqual(post_data["product_name"], "Amoxicillin 250mg")
        self.assertEqual(post_data["batch_number"], "AMX-8812")

        # GET /api/complaints
        get_res = self.client.get("/api/complaints")
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.json()
        self.assertIsInstance(get_data, list)
        self.assertGreaterEqual(len(get_data), 1)
        # Check first item in list matches
        ids = [c["id"] for c in get_data]
        self.assertIn(post_data["id"], ids)

if __name__ == "__main__":
    unittest.main()
