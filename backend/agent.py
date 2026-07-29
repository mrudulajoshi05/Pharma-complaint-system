from dotenv import load_dotenv
load_dotenv()

import os
import json
import re
from typing import Dict, Any, List, Optional, TypedDict
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END


class PharmaComplaint(BaseModel):
    product_name: str = Field(description="Name of the pharmaceutical product involved")
    batch_number: str = Field(description="Batch or lot number of the product, or 'UNKNOWN' if missing")
    complaint_type: str = Field(description="Type of complaint, e.g., Packaging, Quality, Contamination, Labeling")
    severity_level: str = Field(description="Severity level: Critical, Major, or Minor")
    description: str = Field(description="Detailed summary of the complaint")
    risk_classification: str = Field(description="Risk classification in pharma terms: High, Medium, or Low")
    suggested_capa: str = Field(description="Suggested Corrective and Preventive Action (CAPA)")


class GraphState(TypedDict):
    raw_text: str
    extracted_data: Optional[Dict[str, Any]]
    is_complete: bool
    missing_fields: List[str]
    error: Optional[str]


def _clean_and_parse_json(content: Any) -> PharmaComplaint:
    if isinstance(content, PharmaComplaint):
        return content
    if isinstance(content, dict):
        return PharmaComplaint(**content)

    raw_str = str(content)
    if hasattr(content, "content") and isinstance(content.content, str):
        raw_str = content.content

    text = raw_str.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

    # Locate JSON object boundary
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]

    parsed_dict = json.loads(text)
    return PharmaComplaint(**parsed_dict)


def _apply_pharma_risk_matrix(raw_text: str, data: Dict[str, Any]) -> Dict[str, Any]:
    text_lower = (raw_text + " " + str(data.get("description", ""))).lower()

    # High Risk / Critical indicators: adverse events, patient harm, hives, breathlessness, contamination, sterility breach
    high_risk_keywords = [
        "hives", "shortness of breath", "adverse reaction", "hospitalization", "contamination",
        "sterility", "sterility breach", "patient harm", "toxic", "poison", "fever", "infection",
        "foreign particle", "mold", "bacteria", "death", "severe reaction"
    ]
    # Medium Risk / Major indicators: physical quality defects, discoloration, crumbling, broken seal, packaging breach
    medium_risk_keywords = [
        "discoloration", "discolored", "crumbling", "fragmented", "broken seal", "packaging breach",
        "blister pack", "chipped", "cracked", "leaking", "chemical odor", "odor", "deformed"
    ]

    has_high = any(kw in text_lower for kw in high_risk_keywords)
    has_medium = any(kw in text_lower for kw in medium_risk_keywords)

    if has_high:
        data["risk_classification"] = "High"
        data["severity_level"] = "Critical"
        data["suggested_capa"] = "Immediate batch recall review, site audit, and 24-hour regulatory notification."
    elif has_medium:
        data["risk_classification"] = "Medium"
        if data.get("severity_level") != "Critical":
            data["severity_level"] = "Major"
        data["suggested_capa"] = "Investigate manufacturing batch records, conduct retain-sample testing, and issue vendor quality alert."
    else:
        # Default Low Risk / Minor
        if not data.get("risk_classification") or data.get("risk_classification") == "UNKNOWN":
            data["risk_classification"] = "Low"
        if not data.get("severity_level") or data.get("severity_level") == "UNKNOWN":
            data["severity_level"] = "Minor"
        if not data.get("suggested_capa") or "investigate" in str(data.get("suggested_capa")).lower():
            data["suggested_capa"] = "Log trend in QMS and monitor during quarterly review."

    return data


def _apply_regex_fallbacks(raw_text: str, extracted_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = dict(extracted_data) if extracted_data else {
        "product_name": "UNKNOWN",
        "batch_number": "UNKNOWN",
        "complaint_type": "Quality",
        "severity_level": "Major",
        "description": raw_text[:300] if raw_text else "",
        "risk_classification": "Medium",
        "suggested_capa": "Investigate manufacturing batch records, conduct retain-sample testing, and issue vendor quality alert."
    }

    def is_invalid(val: Any) -> bool:
        if not val or not str(val).strip():
            return True
        return str(val).strip().upper() in {"UNKNOWN", "N/A", "NOT PROVIDED", "UNSPECIFIED", "MISSING", "NONE"}

    # 1. Fallback for Product Name
    if is_invalid(data.get("product_name")):
        prod_patterns = [
            r'\b(Amoxicillin\s+500mg|Lisinopril\s+10mg|Paracetamol\s+500mg|Lipitor\s+20mg|Ibuprofen\s+400mg)\b',
            r'\b([A-Z][a-zA-Z0-9\-\s]+\s+\d+\s*(?:mg|g|ml|mcg|IU))\b',
            r'(?:product|drug|medication|complaint regarding)\s*(?:name)?[\s:]+([A-Za-z0-9\s\-\.]+?)(?=\,|\.|\(|\n|$)',
        ]
        for pattern in prod_patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                if not is_invalid(val) and len(val) > 2:
                    data["product_name"] = val
                    break

    # 2. Fallback for Batch Number
    if is_invalid(data.get("batch_number")):
        batch_patterns = [
            r'\b(AMX-\d{4}-\d{4}|PCT-\d+|LPT-\d+|AMX-[A-Z0-9\-]+)\b',
            r'(?:batch|lot|bn)\s*(?:number|no\.?|#)?[\s:]+([a-zA-Z0-9\-_]+)',
            r'\b([A-Z]{2,5}-\d{4}-\d{3,6})\b',
            r'\b([A-Z]{2,5}-\d{3,6})\b',
        ]
        for pattern in batch_patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                if not is_invalid(val) and len(val) > 2:
                    data["batch_number"] = val
                    break

    # Apply strict Pharma Risk Matrix rules
    data = _apply_pharma_risk_matrix(raw_text, data)

    return data


def _invoke_llm_with_fallback(raw_text: str) -> PharmaComplaint:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key or groq_api_key.strip() == "" or groq_api_key == "your_groq_api_key_here":
        raise ValueError("GROQ_API_KEY environment variable is not set. Please add GROQ_API_KEY=gsk_... in your .env file.")

    prompt_template = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert pharmaceutical quality assurance and regulatory specialist. "
            "Analyze the raw customer/patient complaint text and extract structured complaint information.\n"
            "STRICT PHARMA RISK MATRIX RULES:\n"
            "1. HIGH RISK (Critical): Any complaint involving direct patient harm, severe adverse reactions, hives, shortness of breath, contamination, or sterility breaches.\n"
            "   -> Recommended CAPA: 'Immediate batch recall review, site audit, and 24-hour regulatory notification.'\n"
            "2. MEDIUM RISK (Major): Physical defects (discoloration, crumbling, broken blister/packaging) without direct harm.\n"
            "   -> Recommended CAPA: 'Investigate manufacturing batch records, conduct retain-sample testing, and issue vendor quality alert.'\n"
            "3. LOW RISK (Minor): Labeling typos, cosmetic carton damage, or non-critical packaging inquiries.\n"
            "   -> Recommended CAPA: 'Log trend in QMS and monitor during quarterly review.'\n"
            "INSTRUCTIONS:\n"
            "- product_name: Search thoroughly for the drug name and strength (e.g., 'Amoxicillin 500mg'). Never return 'UNKNOWN' if present.\n"
            "- batch_number: Search thoroughly for batch/lot numbers (e.g., 'AMX-2024-8891'). Never return 'UNKNOWN' if present.\n"
            "Respond ONLY with a valid JSON object matching the requested schema."
        ),
        ("human", "{input_text}"),
    ])

    primary_model = "llama-3.3-70b-versatile"
    fallback_model = "llama3-8b-8192"

    try:
        llm = ChatGroq(
            model=primary_model,
            temperature=0,
            groq_api_key=groq_api_key
        ).with_structured_output(PharmaComplaint)
        chain = prompt_template | llm
        result = chain.invoke({"input_text": raw_text})
        return _clean_and_parse_json(result)
    except Exception as primary_err:
        try:
            llm_fallback = ChatGroq(
                model=fallback_model,
                temperature=0,
                groq_api_key=groq_api_key
            ).with_structured_output(PharmaComplaint)
            chain_fallback = prompt_template | llm_fallback
            result_fallback = chain_fallback.invoke({"input_text": raw_text})
            return _clean_and_parse_json(result_fallback)
        except Exception as fallback_err:
            try:
                llm_raw = ChatGroq(
                    model=primary_model,
                    temperature=0,
                    groq_api_key=groq_api_key
                )
                chain_raw = prompt_template | llm_raw
                raw_response = chain_raw.invoke({"input_text": raw_text})
                return _clean_and_parse_json(raw_response)
            except Exception as final_err:
                raise RuntimeError(
                    f"Failed extraction with primary model ({primary_model}): {primary_err}. "
                    f"Fallback model ({fallback_model}): {fallback_err}. "
                    f"Raw fallback: {final_err}"
                ) from final_err


def extract_complaint_node(state: GraphState) -> Dict[str, Any]:
    raw_text = state.get("raw_text", "")
    extracted_dict = None
    err_msg = None

    try:
        parsed_complaint: PharmaComplaint = _invoke_llm_with_fallback(raw_text)
        extracted_dict = parsed_complaint.model_dump()
        print("RAW LLM RESPONSE:", extracted_dict)
    except Exception as err:
        print("RAW LLM RESPONSE (ERROR):", str(err))
        err_msg = str(err)

    # Apply regex & Pharma Risk Matrix fallbacks
    extracted_dict = _apply_regex_fallbacks(raw_text, extracted_dict)
    print("FINAL EXTRACTED DATA:", extracted_dict)

    return {
        "extracted_data": extracted_dict,
        "error": err_msg
    }


def completeness_check_node(state: GraphState) -> Dict[str, Any]:
    extracted_data = state.get("extracted_data") or {}
    missing_fields: List[str] = []

    def is_missing(val: Optional[str]) -> bool:
        if not val or not str(val).strip():
            return True
        normalized = str(val).strip().upper()
        return normalized in {"UNKNOWN", "N/A", "NOT PROVIDED", "UNSPECIFIED", "MISSING", "NONE"}

    product_name = extracted_data.get("product_name")
    if is_missing(product_name):
        missing_fields.append("product_name")

    batch_number = extracted_data.get("batch_number")
    if is_missing(batch_number):
        missing_fields.append("batch_number")

    is_complete = len(missing_fields) == 0

    return {
        "is_complete": is_complete,
        "missing_fields": missing_fields
    }


def _build_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("extract_complaint_node", extract_complaint_node)
    workflow.add_node("completeness_check_node", completeness_check_node)

    workflow.add_edge(START, "extract_complaint_node")
    workflow.add_edge("extract_complaint_node", "completeness_check_node")
    workflow.add_edge("completeness_check_node", END)

    return workflow.compile()


_graph_app = _build_graph()


def process_complaint_text(raw_text: str) -> Dict[str, Any]:
    initial_state: GraphState = {
        "raw_text": raw_text,
        "extracted_data": None,
        "is_complete": False,
        "missing_fields": [],
        "error": None
    }

    result = _graph_app.invoke(initial_state)

    extracted = result.get("extracted_data") or {}
    output: Dict[str, Any] = dict(extracted)
    output["is_complete"] = result.get("is_complete", False)
    output["missing_fields"] = result.get("missing_fields", [])
    if result.get("error"):
        output["error"] = result.get("error")

    return output
