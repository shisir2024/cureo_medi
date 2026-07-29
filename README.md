# MediAssist AI

A professional, empathetic health-information assistant that follows strict safety rules and always returns structured JSON.

## Quick Start

1. Clone / create the folder structure above.
2. Copy `.env.example` → `.env` and add your API key.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt

   User Message
     │
     ▼
  triage ──── emergency? ──YES──► symptom_analyzer
     │                                    │
     NO                          visualization agents
     │                                    │
     ▼                            EMERGENCY_FALLBACK
symptom_analyzer
     │
     ├──► diagnosis ──► treatment
     │         │
     │         └──► referral
     │
     ├──► heatmap
     ├──► health_score
     ├──► symptom_web
     ├──► vitals
     ├──► radar
     └──► comparison
               │
               ▼
            report (compiles everything)
               │
               ▼
         Final JSON Response
