package config

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"log"
)

func SeedAllData() {
	SeedRoles()
	SeedUsers()
	SeedCandidate()
	SeedApplication()
	SeedAIScreening()
	SeedResumes()
	SeedKnowledgeBase()
	SeedChatMessage()
	SeedJobPositions()
}

func SeedRoles() {
	roles := []entity.Role{
		{Name: "HRManager"},
		{Name: "Employee"},
	}

	for _, role := range roles {
		var count int64
		DB.Model(&entity.Role{}).Where("name = ?", role.Name).Count(&count)
		if count == 0 {
			DB.Create(&role)
		}
	}
}

func SeedUsers() {
	var hrRole, empRole entity.Role

	if err := DB.Where("name = ?", "HRManager").First(&hrRole).Error; err != nil {
		log.Println("Role HRManager not found, run SeedRoles() first")
		return
	}
	if err := DB.Where("name = ?", "Employee").First(&empRole).Error; err != nil {
		log.Println("Role Employee not found, run SeedRoles() first")
		return
	}

	hashedPassword, err := HashPassword("password123")
	if err != nil {
		log.Println("HashPassword failed:", err)
		return
	}

	users := []entity.User{
		{
			FirstName: "Admin",
			LastName:  "HR",
			Email:     "hr@gmail.com",
			Password:  hashedPassword,
			RoleID:    hrRole.ID,
		},
		{
			FirstName:  "John",
			LastName:   "Employee",
			Email:      "test@gmail.com",
			Password:   hashedPassword,
			RoleID:     empRole.ID,
			Department: "IT",
		},
	}

	for _, user := range users {
		var existing entity.User
		result := DB.Where("email = ?", user.Email).First(&existing)

		if result.Error != nil {
			// ไม่มี user → สร้างใหม่
			if err := DB.Create(&user).Error; err != nil {
				log.Printf("Create user %s failed: %v", user.Email, err)
			} else {
				log.Printf("✅ Created: %s", user.Email)
			}
		} else {
			// มีอยู่แล้ว → update password และ role
			if err := DB.Model(&existing).Updates(map[string]interface{}{
				"password": user.Password,
				"role_id":  user.RoleID,
			}).Error; err != nil {
				log.Printf("Update user %s failed: %v", user.Email, err)
			} else {
				log.Printf("✅ Updated: %s", user.Email)
			}
		}
	}
}

func SeedCandidate()     {}
func SeedApplication()   {}
func SeedAIScreening()   {}
func SeedResumes()       {}
func SeedKnowledgeBase() {
	var count int64
	DB.Model(&entity.KnowledgeBase{}).Count(&count)
	if count == 0 {
		var hrUser entity.User
		DB.Where("email = ?", "hr@gmail.com").First(&hrUser)

		// 1. กำหนดอาร์เรย์ (Slice) ของเอกสารแยกตามหมวดหมู่
		docs := []entity.KnowledgeBase{
			{
				Filename: "นโยบายการลาหยุด.txt",
				UserID:   hrUser.ID,
				Content: `=== การลาหยุด ===
				- ลาป่วย: ได้สูงสุด 30 วันต่อปี โดยไม่ต้องมีใบรับรองแพทย์สำหรับการลาไม่เกิน 2 วัน
				- ลาพักร้อน: พนักงานที่ทำงานครบ 1 ปี ได้รับสิทธิ์ลาพักร้อน 10 วันต่อปี
				- ลากิจ: ได้สูงสุด 3 วันต่อปี
				- ลาคลอด: พนักงานหญิงมีสิทธิ์ลาคลอด 98 วัน โดยได้รับค่าจ้างเต็ม 45 วัน

				=== ขั้นตอนการลา ===
				1. แจ้งหัวหน้างานล่วงหน้าอย่างน้อย 3 วัน (ยกเว้นการลาป่วยฉุกเฉิน)
				2. กรอกแบบฟอร์มการลาในระบบ HR Online
				3. รอการอนุมัติจากหัวหน้างาน
				4. ได้รับการแจ้งผลทาง Email ภายใน 1 วันทำการ`,
			},
			{
				Filename: "เวลาทำงานและล่วงเวลา.txt",
				UserID:   hrUser.ID,
				Content: `=== เวลาทำงาน ===
			- เวลาทำงานปกติ: 08:30 - 17:30 น. วันจันทร์ - ศุกร์
			- พักเที่ยง: 12:00 - 13:00 น.
			- การทำงานล่วงเวลา (OT): ได้รับค่าตอบแทน 1.5 เท่าของค่าจ้างปกติ`,
			},
			{
				Filename: "สวัสดิการพนักงาน.txt",
				UserID:   hrUser.ID,
				Content: `=== สวัสดิการ ===
				- ประกันสุขภาพ: บริษัทจัดให้ครอบคลุมวงเงิน 100,000 บาทต่อปี
				- ประกันชีวิต: คุ้มครอง 10 เท่าของเงินเดือน
				- กองทุนสำรองเลี้ยงชีพ: บริษัทสมทบ 5% ของเงินเดือน
				- เงินโบนัส: พิจารณาจากผลประกอบการบริษัทและผลงานพนักงาน ปีละ 1-2 ครั้ง`,
			},
			{
				Filename: "กฎระเบียบและการประเมินผลงาน.txt",
				UserID:   hrUser.ID,
				Content: `=== การประเมินผลงาน ===
				- ประเมินปีละ 2 ครั้ง คือเดือนมีนาคม และกันยายน
				- เกณฑ์การประเมิน: ผลงาน 60%, ทัศนคติ 20%, การพัฒนาตนเอง 20%
				- พนักงานที่ได้คะแนนดีเยี่ยมมีสิทธิ์ได้รับการปรับเงินเดือน

				=== การแต่งกาย ===
				- วันจันทร์ - พฤหัสบดี: ชุดสุภาพ
				- วันศุกร์: Casual Day แต่งกายสบายได้

				=== การใช้อุปกรณ์บริษัท ===
				- ห้ามนำอุปกรณ์ของบริษัทออกนอกสถานที่โดยไม่ได้รับอนุญาต
				- ห้ามติดตั้งซอฟต์แวร์ที่ไม่ได้รับอนุญาตลงในคอมพิวเตอร์บริษัท`,
			},
		}

		// 2. ใช้ลูปสำหรับบันทึกทีละเอกสาร
		for _, doc := range docs {
			if err := DB.Create(&doc).Error; err != nil {
				log.Println("SeedKnowledgeBase failed for", doc.Filename, ":", err)
			} else {
				log.Println("✅ Seeded document:", doc.Filename)
			}
		}
	}
}

func SeedChatMessage()   {}

func SeedJobPositions() {
	var hrUser entity.User
	DB.Where("email = ?", "hr@gmail.com").First(&hrUser)

		jobs := []entity.JobPosition{
			{
				Title:       "Software Engineer (Go/React)",
				Department:  "Technology & Innovation",
				Location:    "กรุงเทพมหานคร (BTS พญาไท / Hybrid)",
				Salary:      "50,000 - 80,000 บาท",
				Type:        "งานเต็มเวลา (Full-time)",
				Status:      "เปิดรับสมัคร",
				Benefits:    `- ประกันสุขภาพกลุ่มและทันตกรรม
- กองทุนสำรองเลี้ยงชีพ (Provident Fund)
- งบสนับสนุนการเรียนรู้ออนไลน์/ซื้อหนังสือ
- ทำงานแบบ Hybrid (เข้าออฟฟิศ 2 วัน/สัปดาห์)
- ท่องเที่ยวประจำปีสัมมนาบริษัท`,
				ContactInfo: `ส่ง Resume และผลงาน (Github/Portfolio) มาทาง:
Email: recruitment@hireai.co.th
หรือกดปุ่มสมัครงานเพื่ออัปโหลดเอกสารผ่านหน้าเว็บไซต์`,
				Description: `ลักษณะงาน:
- ออกแบบ พัฒนา และดูแลรักษา Web Application ด้วยภาษา Go (Golang) ในส่วนของ API Backend
- ออกแบบ พัฒนา UI ฝั่ง Frontend ด้วย React.js/TypeScript
- ออกแบบฐานข้อมูล PostgreSQL และทำงานร่วมกับ Docker ในการทำ Containerization
- ทำงานร่วมกับทีมพัฒนาเพื่อกำหนดแนวทางด้านสถาปัตยกรรมระบบ`,
				Criteria: `เกณฑ์การคัดสรรผู้สมัคร:
- มีประสบการณ์เขียนโปรแกรมในสายงาน 1-3 ปีขึ้นไป (รับพิจารณาเด็กจบใหม่ที่มี Portfolio โดดเด่น)
- เข้าใจโครงสร้างระบบ RESTful API และความปลอดภัย (JWT, CORS)
- สามารถใช้งาน Git, Docker และระบบ Database ได้เป็นอย่างดี
- มีความกระตือรือร้นในการเรียนรู้เทคโนโลยีใหม่ๆ`,
				UserID: hrUser.ID,
			},
			{
				Title:       "HR Recruitment Specialist",
				Department:  "Human Resources",
				Location:    "กรุงเทพมหานคร (ออฟฟิศพระราม 9 / On-site)",
				Salary:      "35,000 - 50,000 บาท",
				Type:        "งานเต็มเวลา (Full-time)",
				Status:      "เปิดรับสมัคร",
				Benefits:    `- ประกันสุขภาพกลุ่ม
- โบนัสประจำปีตามผลงาน
- วันลาพักร้อน 12 วันต่อปี (สะสมได้)
- กิจกรรมและคอร์สอบรมยกระดับความรู้ในสายงาน
- สวัสดิการตรวจสุขภาพประจำปี`,
				ContactInfo: `สมัครด้วยตนเองหรือส่งใบสมัครได้ที่:
Email: jobs-hr@hireai.co.th
สอบถามข้อมูลเพิ่มเติม โทร: 02-123-4567`,
				Description: `ลักษณะงาน:
- ดำเนินการและดูแลกระบวนการสรรหาบุคลากรตั้งแต่ต้นจนจบ (End-to-End Recruitment)
- คัดกรองและประเมินผลผู้สมัครเบื้องต้นผ่านระบบคัดสรรอัจฉริยะ (AI Recruitment Tool)
- สัมภาษณ์ ประเมินทักษะ และเจรจาต่อรองผลตอบแทนสำหรับพนักงานใหม่
- ประสานงานร่วมกับหัวหน้าฝ่ายต่างๆ เพื่อวางแผนความต้องการด้านกำลังคน (Workforce Planning)`,
				Criteria: `เกณฑ์การคัดสรรผู้สมัคร:
- วุฒิปริญญาตรีขึ้นไป สาขาบริหารทรัพยากรมนุษย์, จิตวิทยา หรือสาขาที่เกี่ยวข้อง
- มีประสบการณ์ทำงานด้านการสรรหาบุคลากร (Recruitment) อย่างน้อย 2 ปี
- มีทักษะการเจรจาต่อรอง มนุษยสัมพันธ์ดีเยี่ยม และเข้าใจกฎหมายแรงงานเบื้องต้น
- มีความคุ้นเคยกับการใช้เทคโนโลยีหรือระบบ ATS (Applicant Tracking System) จะพิจารณาเป็นพิเศษ`,
				UserID: hrUser.ID,
			},
			{
				Title:       "เจ้าหน้าที่ประสานงานทั่วไป (Administrative Officer)",
				Department:  "ฝ่ายบริหารและธุรการ",
				Location:    "กรุงเทพและปริมณฑล (นนทบุรี)",
				Salary:      "20,000 บาท",
				Type:        "งานเต็มเวลา (Full-time)",
				Status:      "เปิดรับสมัคร",
				Benefits:    `- ประกันสังคม
- โบนัสตามผลงาน
- ตรวจสุขภาพประจำปี`,
				ContactInfo: `ส่ง Resume และผลงานมาทาง:
Email: recruitment@hireai.co.th`,
				Description: `ลักษณะงาน:
- ประสานงานทั่วไปทั้งภายในและภายนอกองค์กร เพื่อสนับสนุนการทำงานของแผนกต่างๆ
- จัดทำเอกสาร บันทึกข้อความ รายงานการประชุม และเอกสารธุรการอื่นๆ ที่เกี่ยวข้อง
- จัดเตรียมและตรวจสอบความถูกต้องของเอกสารในแผนก
- ต้อนรับผู้มาติดต่อ จัดตารางนัดหมาย และดูแลความเรียบร้อยของการประชุมต่างๆ ของแผนก`,
				Criteria: `เกณฑ์การคัดสรรผู้สมัคร:
- มีประสบการณ์ในงานธุรการ ประสานงาน หรือตำแหน่งที่เกี่ยวข้อง 1-3 ปีขึ้นไป (25 คะแนน)
- สำเร็จการศึกษาในสาขาบริหารธุรกิจ หรือสาขาที่เกี่ยวข้อง (25 คะแนน)
- สามารถใช้งานโปรแกรมคอมพิวเตอร์พื้นฐาน เช่น MS Office (Word, Excel, PPT) และ Google Workspace ได้เป็นอย่างดี (25 คะแนน)
- มีมนุษยสัมพันธ์ดี ทำงานร่วมกับผู้อื่นได้ดี และมีทักษะในการสื่อสารประสานงานอย่างมีประสิทธิภาพ (25 คะแนน)`,
				UserID: hrUser.ID,
			},
		}

		for _, job := range jobs {
			var existing entity.JobPosition
			err := DB.Where("title = ?", job.Title).First(&existing).Error
			if err != nil {
				if err := DB.Create(&job).Error; err != nil {
					log.Println("SeedJobPositions failed for", job.Title, ":", err)
				} else {
					log.Println("✅ Seeded job position:", job.Title)
				}
			}
		}
}
