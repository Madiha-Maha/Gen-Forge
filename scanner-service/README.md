# GenForge Scanner Service

This service hosts the fine-tuned CodeBERT model for code defect classification and pattern cross-checking.

## Model Details
- **Architecture**: `microsoft/codebert-base` with sequence classification head
- **Training Data**: CodeXGLUE Defect Detection benchmark
- **Input**: Raw source code (up to 512 tokens)
- **Output**: Binary probability of vulnerability/defect and risk classification

## Quickstart
```bash
pip install -r requirements.txt
# Place trained weights in model/ (e.g. pytorch_model.bin or safetensors)
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints
- `GET /health`: Model status & hardware readiness
- `POST /scan`: Receives `{ files: [{ path, content }] }` and returns model risk score and pattern cross-check findings
