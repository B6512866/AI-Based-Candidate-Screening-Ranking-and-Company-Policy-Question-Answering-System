# 🚀 คำแนะนำการ Fine-Tune โมเดล Typhoon 2.5 สำหรับ Resume JSON Extraction

ไฟล์และชุดสคริปต์นี้จัดเตรียมไว้สำหรับเทรนโมเดล **Typhoon 2.5 (Qwen3 4B)** ร่วมกับ Dataset **`sandeeppanem/resume-json-extraction-5k`** เพื่อให้โมเดลตอบกลับเป็น **JSON โครงสร้างเป๊ะ 100%**

---

## 🛠️ ขั้นตอนการรัน Fine-Tuning

### 1. ติดตั้งไลบรารีสำหรับ Fine-Tuning
เปิด Terminal ในโฟลเดอร์ `backend/typhoon/` แล้วรันคำสั่ง:

```bash
pip install -r requirements_finetune.txt
```

*(หากต้องการความเร็วในการเทรนสูงสุด แนะนำให้ติดตั้ง `unsloth`: `pip install unsloth`)*

---

### 2. รันสคริปต์ Fine-Tuning
รันคำสั่ง:

```bash
python train_lora.py
```

- สคริปต์จะทำการดาวน์โหลด Dataset `sandeeppanem/resume-json-extraction-5k` จาก Hugging Face ให้อัตโนมัติ
- สคริปต์จะทำ QLoRA 4-bit Fine-Tuning บนโมเดล `typhoon-ai/typhoon2.5-qwen3-4b`
- เมื่อเทรนเสร็จ น้ำหนัก LoRA Adapter จะถูกบันทึกไว้ที่โฟลเดอร์ **`backend/typhoon/typhoon_resume_lora/`**

---

### 3. การใช้งานในระบบ (Automatic Auto-Loading)

ระบบ `main.py` ถูกอัปเดตให้ตรวจจับโฟลเดอร์ **`typhoon_resume_lora`** โดยอัตโนมัติแล้ว:

- ทันทีที่คุณเทรนเสร็จและมีโฟลเดอร์ `typhoon_resume_lora`
- เมื่อรัน `python main.py` หรือ `go run main.go` ระบบจะโหลด LoRA Adapter เข้ากับ Typhoon Chat Model โดยอัตโนมัติ 🎯
- AI จะตอบกลับเป็น **JSON โครงสร้างเป๊ะ 100%** ทันที!

---

💡 **หมายเหตุเพิ่มเติม**:
- แนะนำให้รันบนเครื่องที่มี CUDA GPU (เช่น RTX 3090/4090 หรือบน Google Colab T4/A100)
- หากรันบน Google Colab สามารถก๊อปปี้ไฟล์ `train_lora.py` ไปรันแล้วดาวน์โหลดโฟลเดอร์ `typhoon_resume_lora` กลับมาวางไว้ใน `backend/typhoon/` ได้เลยครับ!
