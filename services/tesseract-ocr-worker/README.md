# Tesseract OCR Worker (Cloud Run)

Stateless OCR service:
- Receives page image (`base64`)
- Runs Tesseract OCR
- Returns structured transactions + metadata
- Stores nothing permanently

## 1) Local run
```bash
cd services/tesseract-ocr-worker
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
export OCR_API_KEY=change-me
uvicorn app:app --host 0.0.0.0 --port 8080
```

Health check:
```bash
curl http://localhost:8080/health
```

## 2) Build + deploy to Google Cloud Run
Prerequisites:
- `gcloud` installed and authenticated
- Billing-enabled GCP project

```bash
gcloud config set project <YOUR_PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Build image:
```bash
cd services/tesseract-ocr-worker
gcloud builds submit --tag gcr.io/<YOUR_PROJECT_ID>/banklefy-ocr-worker
```

Deploy service:
```bash
gcloud run deploy banklefy-ocr-worker \
  --image gcr.io/<YOUR_PROJECT_ID>/banklefy-ocr-worker \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 4 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars OCR_API_KEY=<STRONG_SECRET>
```

Get URL:
```bash
gcloud run services describe banklefy-ocr-worker --region asia-south1 --format='value(status.url)'
```

## 3) Wire into Supabase functions
Set secrets:
```bash
supabase secrets set OCR_WORKER_MODE=primary
supabase secrets set OCR_WORKER_URL=https://<YOUR_CLOUD_RUN_URL>
supabase secrets set OCR_WORKER_API_KEY=<STRONG_SECRET>
supabase secrets set OCR_WORKER_TIMEOUT_MS=45000
```

Deploy functions:
```bash
supabase functions deploy convert-document --project-ref <PROJECT_REF>
supabase functions deploy convert-statements-batch --project-ref <PROJECT_REF>
```

## 4) Data retention behavior
- OCR worker is stateless by design.
- It should not store PDF/images in DB or object storage.
- Your 24-hour Excel retention remains in Supabase and is independent of OCR.

## 5) Mode controls
- `OCR_WORKER_MODE=off` -> existing Groq flow only
- `OCR_WORKER_MODE=primary` -> try Tesseract worker first, fallback to Groq if needed
