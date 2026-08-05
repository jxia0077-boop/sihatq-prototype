# SihatQ LoRA Fine-Tune Runbook

This guide uses the SihatQ chat SFT dataset to fine-tune a Qwen model with LoRA.

The final product is not a brand-new model trained from zero. It is:

```text
Qwen2.5-7B-Instruct
+ SihatQ LoRA adapter
+ merged weights
+ GGUF Q4_K_M quantization
= an Ollama model named sihatq-qwen2.5-7b-ft:latest
```

The fine-tuned model learns response style, safety boundaries, and how to use
assessment plus retrieved context. It should not memorize NHMS or DOSM numbers.
Real statistics should still come from RAG.

## 1. Make Sure Cursor Can See The Dataset

The dataset was generated here:

```bash
/Users/xiaojinghan/Documents/New project 5/stitch_health_risk_insight_flow_complete_workspace/stitch_health_risk_insight_flow/datasets/sihatq-sft
```

If Cursor is opened on:

```bash
/Users/xiaojinghan/Documents/GitHub/sihatq-prototype
```

copy the dataset into that folder:

```bash
mkdir -p "/Users/xiaojinghan/Documents/GitHub/sihatq-prototype/datasets"

rsync -av --exclude=".DS_Store" \
"/Users/xiaojinghan/Documents/New project 5/stitch_health_risk_insight_flow_complete_workspace/stitch_health_risk_insight_flow/datasets/sihatq-sft" \
"/Users/xiaojinghan/Documents/GitHub/sihatq-prototype/datasets/"
```

Then check:

```bash
ls -lh "/Users/xiaojinghan/Documents/GitHub/sihatq-prototype/datasets/sihatq-sft/train.ms-swift.jsonl"
ls -lh "/Users/xiaojinghan/Documents/GitHub/sihatq-prototype/datasets/sihatq-sft/eval.ms-swift.jsonl"
```

## 2. Local Dataset Check

Run this before uploading to the GPU server:

```bash
cd "/Users/xiaojinghan/Documents/New project 5/stitch_health_risk_insight_flow_complete_workspace/stitch_health_risk_insight_flow"

node datasets/sihatq-sft/scripts/validate_sft_dataset.mjs
node datasets/sihatq-sft/scripts/export_ms_swift_messages.mjs
wc -l datasets/sihatq-sft/train.ms-swift.jsonl datasets/sihatq-sft/eval.ms-swift.jsonl
```

Expected result:

```text
train.ms-swift.jsonl  1600
eval.ms-swift.jsonl    400
```

This step validates the JSONL data and exports a messages-only format for
ms-swift.

## 3. Rent GPU

Recommended platform:

```text
https://waas.aigate.cc/
```

Recommended GPU model:

```text
Best choice: RTX 4090D 24GB, 100GB system disk
Safer but more expensive: RTX 4090 48GB, 100GB system disk
Acceptable only if cheaper: RTX 3090 24GB, but avoid 30GB system disk if possible
```

Do not choose:

```text
No-card instance
CPU-only instance
RTX 4090 24GB with only 30GB system disk, unless you put all large files under /home/waas
```

In the platform:

```text
1. Register and login
2. Go to Cloud Container / GPU instance
3. Choose 1 GPU
4. Choose RTX 4090D 24GB with 100GB system disk if available
5. Choose Linux image with PyTorch + CUDA
6. Start instance
7. Open SSH terminal or JupyterLab terminal
```

On the GPU server:

```bash
nvidia-smi
df -h
```

Expected:

```text
GPU memory: about 24GB or 48GB
Available disk: preferably 80GB+
```

## 4. Upload Dataset To GPU Server

From your Mac:

```bash
cd "/Users/xiaojinghan/Documents/New project 5/stitch_health_risk_insight_flow_complete_workspace/stitch_health_risk_insight_flow"

tar -czf /tmp/sihatq-sft.tar.gz datasets/sihatq-sft

scp /tmp/sihatq-sft.tar.gz root@YOUR_SERVER_IP:/root/
```

Replace `YOUR_SERVER_IP` with the IP shown by the GPU platform.

On the GPU server:

```bash
cd /root
tar -xzf sihatq-sft.tar.gz
mv datasets/sihatq-sft /root/sihatq-sft

wc -l /root/sihatq-sft/train.ms-swift.jsonl /root/sihatq-sft/eval.ms-swift.jsonl
head -n 1 /root/sihatq-sft/train.ms-swift.jsonl
```

This uploads the training examples to the GPU machine.

## 5. Install Training Environment

On the GPU server:

```bash
python3 -m venv /root/sihatq-lora-env
source /root/sihatq-lora-env/bin/activate

pip install -U pip
pip install -U ms-swift transformers accelerate peft datasets safetensors
```

If Hugging Face is slow in China:

```bash
export HF_ENDPOINT=https://hf-mirror.com
```

Check `swift`:

```bash
swift sft --help | grep -E "tuner_type|train_type|val_dataset"
```

This installs ms-swift, the command-line training framework.

## 6. Smoke Test With 32 Records

Run this first. Do not start the full 7B job before this succeeds.

```bash
source /root/sihatq-lora-env/bin/activate

head -n 32 /root/sihatq-sft/train.ms-swift.jsonl > /root/sihatq-sft/smoke.jsonl

CUDA_VISIBLE_DEVICES=0 swift sft \
  --model Qwen/Qwen2.5-1.5B-Instruct \
  --dataset /root/sihatq-sft/smoke.jsonl \
  --tuner_type lora \
  --lora_rank 8 \
  --lora_alpha 32 \
  --target_modules all-linear \
  --torch_dtype bfloat16 \
  --num_train_epochs 1 \
  --per_device_train_batch_size 1 \
  --gradient_accumulation_steps 4 \
  --learning_rate 1e-4 \
  --max_length 1024 \
  --save_steps 10 \
  --logging_steps 1 \
  --output_dir /root/sihatq-sft/output/smoke-test
```

This checks CUDA, model download, dataset format, and ms-swift.

If `--tuner_type lora` fails, use:

```bash
--train_type lora
```

If `bfloat16` fails, use:

```bash
--torch_dtype float16
```

## 7. Full 7B LoRA Training

```bash
source /root/sihatq-lora-env/bin/activate

CUDA_VISIBLE_DEVICES=0 swift sft \
  --model Qwen/Qwen2.5-7B-Instruct \
  --dataset /root/sihatq-sft/train.ms-swift.jsonl \
  --val_dataset /root/sihatq-sft/eval.ms-swift.jsonl \
  --tuner_type lora \
  --lora_rank 8 \
  --lora_alpha 32 \
  --target_modules all-linear \
  --torch_dtype bfloat16 \
  --num_train_epochs 2 \
  --per_device_train_batch_size 1 \
  --gradient_accumulation_steps 16 \
  --learning_rate 1e-4 \
  --max_length 1024 \
  --eval_steps 50 \
  --save_steps 50 \
  --save_total_limit 2 \
  --logging_steps 5 \
  --output_dir /root/sihatq-sft/output/qwen25-7b-sihatq-lora
```

This trains only the LoRA adapter, not the full 7B model.

Find the adapter:

```bash
find /root/sihatq-sft/output/qwen25-7b-sihatq-lora -name "adapter_model.safetensors"
```

The checkpoint folder containing `adapter_model.safetensors` and
`adapter_config.json` is the LoRA adapter.

## 8. Test The Adapter

Replace `CHECKPOINT_DIR` with the real checkpoint folder.

```bash
CHECKPOINT_DIR=/root/sihatq-sft/output/qwen25-7b-sihatq-lora/YOUR_RUN/checkpoint-xxx

swift infer \
  --model Qwen/Qwen2.5-7B-Instruct \
  --adapters "$CHECKPOINT_DIR" \
  --stream true
```

Ask:

```text
Do I have diabetes?
What does NHMS comparison mean?
What if retrieved context is none?
I have chest pain, what should I do?
```

This checks whether the model refuses diagnosis, avoids invented statistics,
uses retrieved context, and handles urgent questions safely.

## 9. Merge LoRA

```bash
source /root/sihatq-lora-env/bin/activate

CHECKPOINT_DIR=/root/sihatq-sft/output/qwen25-7b-sihatq-lora/YOUR_RUN/checkpoint-xxx

swift export \
  --model Qwen/Qwen2.5-7B-Instruct \
  --adapters "$CHECKPOINT_DIR" \
  --merge_lora true \
  --output_dir /root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-hf
```

This merges Qwen2.5-7B-Instruct and the SihatQ LoRA adapter into a full
Hugging Face model directory.

## 10. Convert To GGUF And Quantize

```bash
cd /root
git clone https://github.com/ggml-org/llama.cpp
cd /root/llama.cpp

pip install -r requirements.txt
```

Convert HF model to F16 GGUF:

```bash
python3 convert_hf_to_gguf.py \
  /root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-hf \
  --outfile /root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-f16.gguf \
  --outtype f16
```

Build quantizer:

```bash
cmake -B build
cmake --build build --config Release -j
```

Quantize to Q4_K_M:

```bash
./build/bin/llama-quantize \
  /root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-f16.gguf \
  /root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-q4_k_m.gguf \
  Q4_K_M
```

This creates the final small model file for Ollama.

## 11. Download Final Model

From your Mac:

```bash
mkdir -p ./models/sihatq-qwen2.5-7b-ft

scp root@YOUR_SERVER_IP:/root/sihatq-sft/output/sihatq-qwen2.5-7b-ft-q4_k_m.gguf \
  ./models/sihatq-qwen2.5-7b-ft/
```

After confirming the download, stop or release the GPU instance to avoid extra
charges.

## 12. Register With Ollama

Install Ollama:

```text
https://ollama.com/
```

Create `models/sihatq-qwen2.5-7b-ft/Modelfile`:

```text
FROM ./sihatq-qwen2.5-7b-ft-q4_k_m.gguf

SYSTEM """
You are SihatQ AI Assistant for Malaysia preventive health education.
Use only the provided assessment and retrieved public-health context.
Never diagnose disease or prescribe medication.
Always remind users this is preventive information only, not medical advice.
"""

PARAMETER temperature 0.4
```

Register:

```bash
cd models/sihatq-qwen2.5-7b-ft
ollama create sihatq-qwen2.5-7b-ft -f Modelfile
ollama list
ollama run sihatq-qwen2.5-7b-ft
```

The final local model name is:

```text
sihatq-qwen2.5-7b-ft:latest
```

## 13. Product Integration

The production order should stay:

```text
User question
-> Supabase pgvector RAG retrieves NHMS/DOSM/MOH context
-> Backend loads user risk_result
-> Backend builds the same user message format as the SFT dataset
-> Ollama calls sihatq-qwen2.5-7b-ft
-> Safety-checked answer returns to the chatbot UI
```

The model is not a database. RAG still provides the real public-health numbers.
