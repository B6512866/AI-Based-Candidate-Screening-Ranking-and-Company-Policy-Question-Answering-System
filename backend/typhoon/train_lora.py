"""
===============================================================================
 Typhoon 2.5 (Qwen3 4B) LoRA Fine-Tuning Script for Resume JSON Extraction
 Dataset: sandeeppanem/resume-json-extraction-5k (Hugging Face)
 Output:  backend/typhoon/typhoon_resume_lora
===============================================================================
"""

import os
import sys
import torch
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TrainLoRA")

# Target dataset & model
DATASET_NAME = "sandeeppanem/resume-json-extraction-5k"
MODEL_ID     = "typhoon-ai/typhoon2.5-qwen3-4b"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(CURRENT_DIR, "typhoon_resume_lora")


def create_sft_trainer(model, tokenizer, train_ds, output_dir):
    """Create SFTTrainer with multi-version TRL compatibility."""
    from trl import SFTTrainer
    tmp_out = os.path.join(CURRENT_DIR, "tmp_outputs")
    
    # Primary: TRL >= 0.12 / 1.x SFTConfig approach
    try:
        from trl import SFTConfig
        try:
            sft_args = SFTConfig(
                dataset_text_field="text",
                max_length=2048,
                per_device_train_batch_size=1,
                gradient_accumulation_steps=4,
                warmup_steps=10,
                max_steps=100,
                learning_rate=2e-4,
                fp16=not torch.cuda.is_bf16_supported(),
                bf16=torch.cuda.is_bf16_supported(),
                logging_steps=10,
                output_dir=tmp_out,
            )
        except Exception:
            sft_args = SFTConfig(
                dataset_text_field="text",
                max_seq_length=2048,
                per_device_train_batch_size=1,
                gradient_accumulation_steps=4,
                warmup_steps=10,
                max_steps=100,
                learning_rate=2e-4,
                fp16=not torch.cuda.is_bf16_supported(),
                bf16=torch.cuda.is_bf16_supported(),
                logging_steps=10,
                output_dir=tmp_out,
            )

        return SFTTrainer(
            model=model,
            processing_class=tokenizer,
            train_dataset=train_ds,
            args=sft_args,
        )
    except Exception as e1:
        logger.warning(f"SFTConfig approach failed: {e1}")

    # Fallback for older TRL versions:
    from transformers import TrainingArguments
    args = TrainingArguments(
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        max_steps=100,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        output_dir=tmp_out,
    )
    try:
        return SFTTrainer(
            model=model,
            processing_class=tokenizer,
            train_dataset=train_ds,
            dataset_text_field="text",
            max_seq_length=2048,
            args=args,
        )
    except Exception:
        return SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            train_dataset=train_ds,
            dataset_text_field="text",
            max_seq_length=2048,
            args=args,
        )


def main():
    logger.info("🚀 Starting Resume JSON Fine-Tuning Setup...")

    # 1. Check GPU availability
    if not torch.cuda.is_available():
        logger.error("❌ GPU (CUDA) is required for LoRA Fine-Tuning. Please run on a CUDA GPU machine or Google Colab T4/A100.")
        sys.exit(1)

    logger.info(f"✅ GPU Detected: {torch.cuda.get_device_name(0)}")

    # 2. Load Dataset from Hugging Face
    logger.info(f"📦 Loading dataset '{DATASET_NAME}' from Hugging Face...")
    try:
        from datasets import load_dataset
        raw_dataset = load_dataset(DATASET_NAME)
        logger.info(f"✅ Dataset loaded successfully: {len(raw_dataset['train'])} rows")
    except Exception as e:
        logger.error(f"❌ Failed to load dataset: {e}")
        logger.info("💡 Run 'pip install datasets' if the datasets library is missing.")
        sys.exit(1)

    # 3. Format dataset into Qwen3/Typhoon Chat Template
    def format_chat_template(example):
        resume_text = example.get("resume_text", example.get("input", ""))
        json_output = example.get("json_output", example.get("output", ""))
        
        if isinstance(json_output, dict):
            import json
            json_output = json.dumps(json_output, ensure_ascii=False)

        prompt = (
            f"<|im_start|>system\n"
            f"You are an expert resume parser. Extract candidate information and response strictly as a JSON object.<|im_end|>\n"
            f"<|im_start|>user\n{resume_text}<|im_end|>\n"
            f"<|im_start|>assistant\n{json_output}<|im_end|>"
        )
        return {"text": prompt}

    formatted_ds = raw_dataset.map(format_chat_template)

    # 4. Fine-Tune with Unsloth or Standard HuggingFace PEFT
    try:
        logger.info("⚡ Attempting to train with Unsloth (Fast Language Model)...")
        from unsloth import FastLanguageModel

        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=MODEL_ID,
            max_seq_length=2048,
            load_in_4bit=True,
        )

        model = FastLanguageModel.get_peft_model(
            model,
            r=16,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_alpha=16,
            lora_dropout=0,
            bias="none",
        )

        trainer = create_sft_trainer(model, tokenizer, formatted_ds["train"], CURRENT_DIR)
        trainer.train()
        model.save_pretrained_lora(OUTPUT_DIR, tokenizer)
        logger.info(f"🎉 Success! LoRA Adapter saved to: {OUTPUT_DIR}")

    except Exception as unsloth_err:
        logger.warning(f"⚠️ Unsloth not available ({unsloth_err}). Falling back to Standard Hugging Face PEFT + TRL...")
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
            from peft import LoraConfig, get_peft_model

            quant_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
            )

            tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                quantization_config=quant_config,
                device_map="auto"
            )

            peft_config = LoraConfig(
                r=16,
                lora_alpha=16,
                target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
                lora_dropout=0.05,
                bias="none",
                task_type="CAUSAL_LM"
            )

            model = get_peft_model(model, peft_config)
            trainer = create_sft_trainer(model, tokenizer, formatted_ds["train"], CURRENT_DIR)
            trainer.train()
            model.save_pretrained(OUTPUT_DIR)
            tokenizer.save_pretrained(OUTPUT_DIR)
            logger.info(f"🎉 Success! LoRA Adapter saved to: {OUTPUT_DIR}")

        except Exception as peft_err:
            logger.error(f"❌ Fine-Tuning Failed: {peft_err}")
            logger.info("💡 Please install required packages: pip install -r requirements_finetune.txt")


if __name__ == "__main__":
    main()
