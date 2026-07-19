# AI-Based Candidate Screening, Ranking and Company Policy Question Answering System
# ระบบคัดกรองพร้อมจัดลำดับผู้สมัครงานและระบบตอบคำถามด้านนโยบายระเบียบองกรณ์ด้วยปัญญาประดิษฐ์ 

ระบบคัดกรองผู้สมัครงานด้วย AI ที่ช่วยลดภาระงาน HR ตั้งแต่การอ่านใบสมัครโดยการคัดกรองผู้สมัครแบบจัด Terilist ด้วย Typhoon OCR
ระบบตอบคำถามด้านนโยบายบริษัทหรือกฎระเบียบองกรณ์ด้วย Typhoon 2.5 Chatbot ตลอด 24 ชั่วโมง

---

## 👥 ทีมพัฒนา

| รหัสนักศึกษา | ชื่อ-นามสกุล         |
| ------------ | -------------------- |
| C6600013     | นายภาณุ อุตะโว       |
| B6512866     | นายเจษฎา เชือดขุนทด  |
| B6607012     | นายธนัช ตั้งมั่น     |
| B6630409     | นายอิสรภาพ วาตุรัมย์ |

---

## 📂 Project Resources

### 📁 เอกสารและไฟล์โครงการ

* Google Drive (รวมเอกสารทั้งหมด)
  https://drive.google.com/drive/folders/1e0hGde6mezr3--_qogKZiiOKSeqsBlQV

### 🎨 UI/UX Design

* Figma Design
  https://www.figma.com/design/V971pjpu3dWQurRk6iDN2J/Capstone-Project?node-id=0-1&p=f

### 🗂️ Database & System Diagram

* Draw.io (ER Diagram / Data Flow Diagram)
  https://app.diagrams.net/#G1i2sgSSXXMStjnNqd5lQICJVYMljOgWD8#%7B%22pageId%22%3A%223Pbtw5pC1sATcA8mYLLV%22%7D

### 📊 Presentation

* Canva Presentation
  https://www.canva.com/design/DAHJzGoEurk/ozo62N15eb9iaf3uQIYT1g/edit
  
## 🔑 บัญชีเข้าใช้งานสำหรับทดสอบ (Default Accounts)

เมื่อสั่งรันครั้งแรก ระบบจะทำการสร้างข้อมูลเริ่มต้น (Seed Data) ให้อัตโนมัติ สามารถใช้บัญชีด้านล่างเพื่อทดสอบระบบได้ทันที:

| สิทธิ์การใช้งาน (Role) | อีเมล (Email) | รหัสผ่าน (Password) | หน้าเริ่มต้น |
| ---------------------- | ------------- | -------------------- | ------------ |
| **HR Manager**         | `hr@gmail.com` | `password123`        | `/hr/dashboard` |
| **Employee (พนักงาน)**  | `test@gmail.com`| `password123`        | `/employee/chat` |

---

## สิ่งที่ต้องติดตั้งก่อนเริ่ม (Prerequisites)

* **Python 3.10+** (สำหรับรัน Typhoon AI Engine)
* **Node.js LTS** เช่น เวอร์ชัน 20.x หรือ 22.x (สำหรับรัน Frontend React)
* **Go 1.20+** (สำหรับรัน Backend API)
* **Docker & Docker Compose** (สำหรับรัน PostgreSQL Database - แนะนำให้ติดตั้งพร้อมกับเปิดใช้งาน WSL 2)

---

## 🖥️ ความต้องการของระบบ (Hardware Requirements)

สำหรับการรันโมเดล **Typhoon AI** (Typhoon 2.5 & Typhoon OCR):

| อุปกรณ์ | สเปคขั้นต่ำ (Minimum) | สเปคแนะนำ (Recommended) |
| ------- | ---------------------- | ------------------------ |
| **CPU** | Intel Core i5 (Gen 10+) / Ryzen 5 (3000+) | Intel Core i7 (Gen 12+) / Ryzen 7 (5000+) |
| **RAM** | 16 GB | 32 GB |
| **GPU** | NVIDIA GTX 1660 Ti / RTX 2060 (VRAM 6 GB) | NVIDIA RTX 3060 (VRAM 12 GB+) ขึ้นไป (ตระกูล RTX 40/50 รองรับสมบูรณ์) |
| **Storage** | SSD พื้นที่ว่าง 20 GB | NVMe M.2 SSD พื้นที่ว่าง 30 GB |

---

## ขั้นตอนการเริ่มใช้งาน (Step-by-Step Installation)

### ขั้นตอนที่ 1: ตั้งค่าระบบฐานข้อมูล (Database Setup)
1. เปิดโปรแกรม Docker Desktop ให้เรียบร้อย
2. รันคำสั่งเชื่อมต่อฐานข้อมูลโดย PostgreSQL ด้วย Docker Compose ในหน้าโฟลเดอร์หลักของโปรเจกต์:
   ```bash
   docker compose up -d
   ```
3. สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/` และตั้งค่าดังนี้:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres123
   DB_NAME=hr_system
   JWT_SECRET=mysecretkey123
   ```

### ขั้นตอนที่ 2: ติดตั้งและตั้งค่า Python AI Engine
*(หากใช้ระบบ Windows แนะนำให้เปิดสิทธิ์สคริปต์บน PowerShell ก่อนโดยรัน `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

1. สร้าง Virtual Environment (แนะนำเพื่อไม่ให้ปะปนกับ Python หลักของเครื่อง):
   ```bash
   python -m venv backend/.venv
   ```
2. เปิดใช้งาน (Activate) Virtual Environment:
   * **สำหรับ CMD:** `backend\.venv\Scripts\activate.bat`
   * **สำหรับ PowerShell:** `backend\.venv\Scripts\Activate.ps1`
3. ติดตั้งแพ็กเกจไลบรารี:
   * **กรณีใช้งานร่วมกับการ์ดจอ GPU (NVIDIA RTX 40/50 series เช่น RTX 5060):**
     ```bash
     # ลบ torch ตัวเก่าออกก่อนเพื่อป้องกันการชนกันของเวอร์ชัน
     pip uninstall torch torchvision torchaudio -y
     
     # ติดตั้ง PyTorch เวอร์ชัน CUDA 12.8 (cu128)
     pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128
     
     # ติดตั้ง bitsandbytes เวอร์ชันทดสอบล่าสุด
     pip install --upgrade --pre bitsandbytes
     
     # อัปเดต transformers เพื่อให้รู้จักโครงสร้าง ocr (qwen3_vl)
     pip install --upgrade transformers
     
     # ติดตั้ง dependencies อื่นๆ
     pip install -r backend/typhoon/requirements.txt
     ```
   * **กรณีใช้งานบน CPU-only (ไม่แนะนำเพราะรันช้ามาก):**
     ```bash
     pip install -r backend/typhoon/requirements.txt
     ```
4. ดาวน์โหลดโมเดล AI ของ Typhoon จาก Hugging Face ล่วงหน้าก่อนเปิดระบบ:
   ```bash
   python backend/typhoon/download_models.py
   ```
5. ในไฟล์ [backend/typhoon/main.py](file:///c:/Users/เจษฎา/Desktop/Final/AI-Based-Candidate-Screening-Ranking-and-Company-Policy-Question-Answering-System/backend/typhoon/main.py) ตั้งค่าบรรทัดที่ 33 ให้เป็น `LOAD_MODELS = True` เพื่อสั่งให้โหลดโมเดล AI ตอนสตาร์ทระบบ

### ขั้นตอนที่ 3: สตาร์ท Backend API (Go API & Python AI Engine)
รันคำสั่งด้านล่างนี้ในโฟลเดอร์ `backend/`:
```bash
cd backend
go run main.go
```
*💡 **หมายเหตุ:** `go run main.go` จะทำการสตาร์ททั้ง **Go Backend (Port 8080)** และ **Typhoon AI Service (Port 8000)** ควบคู่กันไปให้อัตโนมัติ*

### ขั้นตอนที่ 4: ติดตั้งและสตาร์ท Frontend (React Vite)
1. สร้างไฟล์ `.env` ในโฟลเดอร์ `frontend/` และตั้งค่าดังนี้:
   ```env
   VITE_API_URL=http://localhost:8080/api
   VITE_WS_URL=ws://localhost:8080
   VITE_TYPHOON_API_URL=http://localhost:8000
   ```
2. รันคำสั่งด้านล่างนี้ในโฟลเดอร์ `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---ขั้นตอนการใช้งาน

### 1. เริ่มเชื่อมต่อฐานข้อมูลโดย PostgreSQL ต่อเข้ากับ Docker Compose

```bash
docker compose up -d
```

> การตั้งค่า database อยู่ใน `.env` file

สร้าง `.env` ใน folder `backend/` และใส่ค่าดังนี้:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=hr_system
JWT_SECRET=mysecretkey123
```

### 2. การใช้งาน Backend

```bash
cd backend
pip install uvicorn fastapi
pip install python-multipart

วิธีเปิดปิด model
LOAD_MODELS = False #line 33
```
> 💡 **หมายเหตุเกี่ยวกับการดาวน์โหลดโมเดล AI:**
> - ไฟล์โมเดลมีขนาดใหญ่ จึงไม่ได้ถูก commit ขึ้น GitHub 
> - เมื่อสั่งรันครั้งแรก ระบบจะทำการ **ดาวน์โหลด Weights ของโมเดลจาก Hugging Face ให้อัตโนมัติ** ขอเพียงเครื่องเชื่อมต่ออินเทอร์เน็ต
> - หากต้องการดาวน์โหลดโมเดลล่วงหน้า สามารถรันสคริปต์: `python typhoon/download_models.py`
> 💡 **หมายเหตุ:** `go run main.go` จะทำการสตาร์ททั้ง **Go Backend (Port 8080)** และ **Typhoon AI Service (Port 8000)** ควบคู่กันไปให้อัตโนมัติ

### 4. รัน Frontend Service (React Vite)
สร้างไฟล์ .env ใน frontend
```bash
แบบปกติ
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
VITE_TYPHOON_API_URL=http://localhost:8000

แบบ Tailscale
VITE_API_URL=http://100.123.193.113:5173/api
VITE_WS_URL=ws://100.123.193.113:5173/ws
VITE_TYPHOON_API_URL=http://100.123.193.113:5173
```

```bash
cd frontend
npm install
npm run dev
```


---

## 📂 Project Resources

* **Google Drive (รวมเอกสารทั้งหมด):** [ลิงก์ไดรฟ์](https://drive.google.com/drive/folders/1e0hGde6mezr3--_qogKZiiOKSeqsBlQV)
* **Figma Design (UI/UX):** [ลิงก์ Figma](https://www.figma.com/design/V971pjpu3dWQurRk6iDN2J/Capstone-Project?node-id=0-1&p=f)
* **Draw.io (System Diagram):** [ลิงก์ Diagram](https://app.diagrams.net/#G1i2sgSSXXMStjnNqd5lQICJVYMljOgWD8#%7B%22pageId%22%3A%223Pbtw5pC1sATcA8mYLLV%22%7D)
* **Canva Presentation:** [ลิงก์ Presentation](https://www.canva.com/design/DAHJzGoEurk/ozo62N15eb9iaf3uQIYT1g/edit)

---

## 🛠️ Tech Stack

### Backend & AI
* **Go** (Gin Framework, GORM)
* **Python 3.10** (FastAPI, Transformers, PyTorch)
* **Typhoon AI** (Typhoon 2.5 & Typhoon OCR)

### Frontend
* **React 19** & **TypeScript**
* **Vite** & **TailwindCSS**
* **Lucide React** (Icons)

### Database & Infrastructure
* **PostgreSQL 15**
* **Docker** & **Docker Compose**

---

## 🧹 การจัดการข้อมูล (Database Maintenance)

หากต้องการรีเซ็ตหรือลบข้อมูลในฐานข้อมูล:

```bash
# หยุดการทำงาน containers
docker compose down

# ลบข้อมูลใน volume ทั้งหมด (Reset Database)
docker compose down -v
```
