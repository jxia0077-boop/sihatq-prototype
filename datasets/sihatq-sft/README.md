# SihatQ SFT Dataset

Synthetic supervised fine-tuning dataset for the SihatQ AI Assistant.

The dataset teaches response style, safe boundaries, intent handling, and how to use `User assessment context` plus `Retrieved context`. It intentionally avoids training the model to memorize public-health statistics. Real NHMS, DOSM, and MOH numbers should still come from the production RAG pipeline.

## Files

- `train.jsonl`: 1,600 training examples.
- `eval.jsonl`: 400 evaluation examples.
- `schema.json`: field definitions and message contract.
- `taxonomy.yaml`: intent distribution and safety rules.
- `templates/system_prompt.txt`: shared system prompt used in every sample.
- `scripts/generate_sft_dataset.mjs`: deterministic generator.
- `scripts/validate_sft_dataset.mjs`: JSONL, count, disclaimer, and hard-coded percentage checks.
- `scripts/export_ms_swift_messages.mjs`: exports messages-only JSONL files for ms-swift training.

## Regenerate and Validate

```bash
node datasets/sihatq-sft/scripts/generate_sft_dataset.mjs
node datasets/sihatq-sft/scripts/validate_sft_dataset.mjs
node datasets/sihatq-sft/scripts/export_ms_swift_messages.mjs
```

## Distribution

| Intent | Total |
| --- | ---: |
| explain_risk_result | 400 |
| explain_nhms_dosm | 300 |
| lifestyle_advice | 300 |
| use_rag_faithfully | 300 |
| refuse_diagnosis | 300 |
| crisis_or_urgent | 100 |
| no_assessment_yet | 100 |
| smalltalk_boundary | 100 |
| multilingual_zh | 100 |

## Design Principle

Fine-tuning should teach the assistant how to behave, not store medical facts. The production system should retrieve current public-health evidence with RAG and pass it into the same user message structure:

```text
User assessment context:
...

Retrieved context:
...

User question:
...
```
