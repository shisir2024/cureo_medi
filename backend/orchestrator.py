from typing import List, Dict
from .agents import triage, symptom_analyzer, diagnosis, treatment, referral, report
from .agents import heatmap, health_score, symptom_web, vitals, radar, comparison

EMERGENCY_FALLBACK = {
    "summary": "Based on what you've described, this may be a medical emergency. Please seek help immediately.",
    "detectedSymptoms": [], "affectedBodyParts": [], "possibleConditions": [],
    "severity": "Emergency", "followUpQuestions": [], "homeCare": [],
    "seeDoctor": "Call emergency services or go to the nearest emergency room immediately.",
    "emergency": True, "warningSigns": [],
    "disclaimer": "This information is for educational purposes only and is not a medical diagnosis.",
    "visualizations": {}
}


def run_pipeline(messages: List[Dict[str, str]]) -> dict:
    triage_result = triage.run(messages)
    if triage_result.get("is_emergency"):
        fallback = EMERGENCY_FALLBACK.copy()
        fallback["summary"] = triage_result.get("emergency_reason", fallback["summary"])

        # Still run visualization agents so side panels populate
        symptom_data = symptom_analyzer.run(messages)
        fallback["detectedSymptoms"] = symptom_data.get("detectedSymptoms", [])
        fallback["affectedBodyParts"] = symptom_data.get("affectedBodyParts", [])

        heatmap_data      = heatmap.run(messages, symptom_data)
        health_score_data = health_score.run(messages, symptom_data)
        web_data          = symptom_web.run(messages, symptom_data, {})
        vitals_data       = vitals.run(messages)
        radar_data        = radar.run(messages, symptom_data)
        comparison_data   = comparison.run(messages, symptom_data, {})

        fallback["visualizations"] = {
            "heatmap":     heatmap_data.get("heatmap", []),
            "healthScore": health_score_data,
            "symptomWeb":  web_data,
            "vitals":      vitals_data.get("vitals", {}),
            "radar":       radar_data.get("radar", {}),
            "comparison":  comparison_data.get("comparisons", []),
        }
        return fallback

    symptom_data   = symptom_analyzer.run(messages)
    diagnosis_data = diagnosis.run(messages, symptom_data)
    treatment_data = treatment.run(messages, symptom_data, diagnosis_data)
    referral_data  = referral.run(messages, symptom_data, diagnosis_data)

    # Visualization agents
    heatmap_data      = heatmap.run(messages, symptom_data)
    health_score_data = health_score.run(messages, symptom_data)
    web_data          = symptom_web.run(messages, symptom_data, diagnosis_data)
    vitals_data       = vitals.run(messages)
    radar_data        = radar.run(messages, symptom_data)
    comparison_data   = comparison.run(messages, symptom_data, diagnosis_data)

    final = report.run({
        "triage": triage_result,
        "symptom_analyzer": symptom_data,
        "diagnosis": diagnosis_data,
        "treatment": treatment_data,
        "referral": referral_data,
    })

    final["visualizations"] = {
        "heatmap":      heatmap_data.get("heatmap", []),
        "healthScore":  health_score_data,
        "symptomWeb":   web_data,
        "vitals":       vitals_data.get("vitals", {}),
        "radar":        radar_data.get("radar", {}),
        "comparison":   comparison_data.get("comparisons", []),
    }

    return final
