package config

import (
	"log"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"gorm.io/gorm"
)

// ใช้เฉพาะตอน DEV เพื่อ Reset id ให้เริ่มตั้งแต่ 0
func ResetDatabase(db *gorm.DB) {
	log.Println("Resetting database to ZERO...")
	sql := `
		TRUNCATE TABLE
			roles,
			users,
			candidates,
			applications,
			resumes,
			knowledge_bases,
			interviews,
			chat_messages,
			reports,
			job_positions,
			ai_screenings
		RESTART IDENTITY CASCADE;
	`

	if err := db.Exec(sql).Error; err != nil {
		log.Println("ResetDatabase error:", err)
	} else {
		log.Println("ResetDatabase: all tables truncated and identities restarted.")
	}
}

// ================= ใช้กรณีอยากล้างตารางทั้งหมดเลย =================
func ResetDatabaseByDROP(db *gorm.DB) {
	log.Println("Drop All Tables")
	sql := `
		DROP TABLE IF EXISTS
			roles,
			users,
			candidates,
			applications,
			resumes,
			knowledge_bases,
			interviews,
			chat_messages,
			reports,
			job_positions,
			ai_screenings
		CASCADE;
	`

	if err := db.Exec(sql).Error; err != nil {
		log.Println("ResetDatabase error:", err)
	} else {
		log.Println("ResetDatabase: all tables dropped.")
	}
}

func ResetByDropSchema(db *gorm.DB) error {
	sql := `
		DROP SCHEMA public CASCADE;
		CREATE SCHEMA public;
		GRANT ALL ON SCHEMA public TO public;
	`
	return db.Exec(sql).Error
}

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
			if err := DB.Create(&role).Error; err != nil {
				log.Printf("Create role %s failed: %v", role.Name, err)
			} else {
				log.Printf("✅ Seeded role: %s", role.Name)
			}
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
				log.Printf("✅ Created user: %s", user.Email)
			}
		} else {
			// มีอยู่แล้ว → update password และ role
			if err := DB.Model(&existing).Updates(map[string]interface{}{
				"password": user.Password,
				"role_id":  user.RoleID,
			}).Error; err != nil {
				log.Printf("Update user %s failed: %v", user.Email, err)
			} else {
				log.Printf("✅ Updated user: %s", user.Email)
			}
		}
	}
}

func SeedCandidate()   {}
func SeedApplication() {}
func SeedAIScreening() {}
func SeedResumes()     {}

func SeedKnowledgeBase() {
	var hrUser entity.User
	if err := DB.Where("email = ?", "hr@gmail.com").First(&hrUser).Error; err != nil {
		log.Println("SeedKnowledgeBase error: hr@gmail.com user not found")
		return
	}

	// 1. กำหนดอาร์เรย์ (Slice) ของเอกสารระเบียบองค์กรและนโยบายแยกตามหมวดหมู่
	docs := []entity.KnowledgeBase{
		{
			Filename: "ระเบียบและข้อบังคับในการทำงานขององค์กร.txt",
			UserID:   hrUser.ID,
			Content: `=== ระเบียบและข้อบังคับในการทำงานขององค์กร ===

1. ข้อบังคับเรื่องเวลาทำงานและการลงเวลา (Working Hours & Attendance)
- เวลาทำการปกติ: วันจันทร์ - ศุกร์ เวลา 08:30 - 17:30 น. (พักเที่ยง 12:00 - 13:00 น.)
- พนักงานต้องลงเวลาเข้า-ออกงานผ่านระบบสแกนใบหน้าหรือแอปพลิเคชัน HR Mobile
- การมาสายเกิน 15 นาที โดยไม่แจ้งเหตุจำเป็นล่วงหน้า ถือเป็นการมาสาย หากมาสายเกิน 3 ครั้งต่อเดือน จะมีหนังสือตักเตือนทางวินัย

2. สิทธิ์การลาและการอนุมัติ (Leave Policy)
- ลาป่วย: สิทธิ์สูงสุด 30 วันต่อปี (ลาติดต่อกัน 3 วันทำการขึ้นไปต้องมีใบรับรองแพทย์)
- ลาพักร้อน: พนักงานที่ผ่านการทดลองงานครบ 1 ปี ได้รับสิทธิ์ 10 วันต่อปี (สะสมไปปีถัดไปได้ไม่เกิน 5 วัน)
- ลากิจจำเป็น: สิทธิ์ 3 วันต่อปี โดยต้องยื่นคำขออนุมัติล่วงหน้าอย่างน้อย 3 วันทำการ
- ลาคลอดบุตร: พนักงานหญิงมีสิทธิ์ลาคลอด 98 วัน (บริษัทจ่ายค่าจ้างเต็มจำนวน 45 วัน)

3. วินัยและมาตรการการลงโทษ (Disciplinary Rules)
- การตักเตือนด้วยวาจา: สำหรับความผิดลหุโทษครั้งแรก
- หนังสือตักเตือนเป็นลายลักษณ์อักษร: สำหรับการมาสายสะสม การละทิ้งหน้าที่ หรือกระทำผิดซ้ำ
- การพักงานโดยไม่ได้รับค่าจ้าง: สำหรับความผิดร้ายแรงปานกลาง
- การเลิกจ้างโดยไม่จ่ายค่าชดเชย: สำหรับการทุจริต เปิดเผยความลับองค์กร หรือเสพสิ่งเสพติดในสถานที่ทำงาน

4. นโยบายความปลอดภัยและเทคโนโลยีสารสนเทศ (IT & Cybersecurity Policy)
- พนักงานต้องรักษาความลับรหัสผ่าน (Password) และเปลี่ยนรหัสผ่านทุก 90 วัน
- ห้ามนำข้อมูลลูกค้าหรือข้อมูลความลับของบริษัทออกนอกระบบโดยไม่ได้รับอนุญาต (PDPA Compliance)
- ห้ามติดตั้งซอฟต์แวร์ผิดลิขสิทธิ์หรือซอฟต์แวร์ที่ไม่ได้รับอนุมัติบนเครื่องคอมพิวเตอร์บริษัท
- อุปกรณ์โน้ตบุ๊กและทรัพย์สินบริษัทต้องได้รับการดูแลอย่างดี ห้ามนำออกนอกสถานที่โดยไม่มีใบอนุญาต

5. การแต่งกายและจริยธรรมองค์กร (Dress Code & Code of Conduct)
- วันจันทร์ - พฤหัสบดี: แต่งกายชุดสุภาพ Business Casual
- วันศุกร์: แต่งกายแบบ Casual Day (ห้ามสวมกางเกงขาสั้น สายเดี่ยว หรือรองเท้าแตะ)
- การปฏิบัติตน: ให้เกียรติเพื่อนร่วมงาน ปราศจากการคุกคามทุกรูปแบบ (Zero Tolerance for Harassment)`,
		},
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

	// 2. ตรวจสอบและบันทึกเอกสารถ้ายังไม่มีในระบบ (FirstOrCreate)
	for _, doc := range docs {
		var existing entity.KnowledgeBase
		if err := DB.Where("filename = ?", doc.Filename).First(&existing).Error; err != nil {
			if err := DB.Create(&doc).Error; err != nil {
				log.Println("SeedKnowledgeBase failed for", doc.Filename, ":", err)
			} else {
				log.Println("✅ Seeded new document:", doc.Filename)
			}
		}
	}
}

func SeedChatMessage() {}

func SeedJobPositions() {
	var hrUser entity.User
	if err := DB.Where("email = ?", "hr@gmail.com").First(&hrUser).Error; err != nil {
		log.Println("SeedJobPositions error: hr@gmail.com user not found")
		return
	}

	jobs := []entity.JobPosition{
		{
			Title:      "Software Engineer (Go/React)",
			Department: "Technology & Innovation",
			Location:   "กรุงเทพมหานคร (BTS พญาไท / Hybrid)",
			Salary:     "50,000 - 80,000 บาท",
			Type:       "งานเต็มเวลา (Full-time)",
			Status:     "เปิดรับสมัคร",
			Benefits: `- ประกันสุขภาพกลุ่มและทันตกรรม
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
			Criteria: []entity.MainCriterion{
				{
					CriterionID: "c1",
					Title:       "Technical Stack & Development Experience",
					Weight:      35,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s1_1",
							Title:          "ประสบการณ์สายงาน Go และ React",
							Description:    "ดี: ตรงตามประกาศ มีประสบการณ์เขียน Go และ React/TypeScript 1-3 ปีขึ้นไป (เด็กจบใหม่ดู Portfolio)",
							Weight:         100,
						},
						{
							SubCriterionID: "s1_2",
							Title:          "ความเข้าใจ RESTful API และ Authentication",
							Description:    "ปานกลาง: เข้าใจโครงสร้าง RESTful API และระบบ Authentication เบื้องต้น",
							Weight:         50,
						},
						{
							SubCriterionID: "s1_3",
							Title:          "ทักษะการออกแบบสถาปัตยกรรมโค้ด",
							Description:    "แย่: โค้ดมีความซับซ้อนสูง ขาดการจัดระเบียบโครงสร้างที่ดี",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c2",
					Title:       "Database Management",
					Weight:      25,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s2_1",
							Title:          "ทักษะการใช้งาน PostgreSQL",
							Description:    "ดี: ตรงตามประกาศ ออกแบบฐานข้อมูล เขียน Query และจัดการ PostgreSQL ได้ดีเยี่ยม",
							Weight:         100,
						},
						{
							SubCriterionID: "s2_2",
							Title:          "การเขียน Migration และ Indexing",
							Description:    "ปานกลาง: มีความรู้ความเข้าใจเรื่อง Database Performance พื้นฐาน",
							Weight:         50,
						},
						{
							SubCriterionID: "s2_3",
							Title:          "ความถูกต้องของการออกแบบ Schema",
							Description:    "แย่: ออกแบบฐานข้อมูลไม่สัมพันธ์กัน ขาดความรู้เรื่องความสัมพันธ์ตาราง",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c3",
					Title:       "DevOps & Version Control",
					Weight:      20,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s3_1",
							Title:          "การใช้งาน Git และ Docker",
							Description:    "ดี: ตรงตามประกาศ ใช้งาน Git Version Control และ Docker Container ได้คล่องแคล่ว",
							Weight:         100,
						},
						{
							SubCriterionID: "s3_2",
							Title:          "ความรู้เรื่อง Containerization พื้นฐาน",
							Description:    "ปานกลาง: พอเข้าใจการทำงานร่วมกันของ Docker Compose ในระดับพื้นฐาน",
							Weight:         50,
						},
						{
							SubCriterionID: "s3_3",
							Title:          "กระบวนการ Deploy ระบบ",
							Description:    "แย่: ยังไม่มีประสบการณ์หรือความเข้าใจเรื่องกระบวนการ Deploy",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c4",
					Title:       "Soft Skills & Communication",
					Weight:      20,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s4_1",
							Title:          "ทัศนคติและการเรียนรู้สิ่งใหม่",
							Description:    "ดี: ตรงตามประกาศ มีความกระตือรือร้นในการเรียนรู้ และสื่อสารในทีมได้ชัดเจน",
							Weight:         100,
						},
						{
							SubCriterionID: "s4_2",
							Title:          "ทักษะการแก้ปัญหาเฉพาะหน้า",
							Description:    "ปานกลาง: มีกระบวนการคิดวิเคราะห์แก้ปัญหาทางเทคนิคในระดับที่ยอมรับได้",
							Weight:         50,
						},
						{
							SubCriterionID: "s4_3",
							Title:          "การทำงานร่วมกับผู้อื่น",
							Description:    "แย่: ขาดทักษะการสื่อสารหรือยังไม่คุ้นเคยกับการทำงานเป็นทีม",
							Weight:         0,
						},
					},
				},
			},
			UserID: hrUser.ID,
		},
		{
			Title:      "HR Recruitment Specialist",
			Department: "Human Resources",
			Location:   "กรุงเทพมหานคร (ออฟฟิศพระราม 9 / On-site)",
			Salary:     "35,000 - 50,000 บาท",
			Type:       "งานเต็มเวลา (Full-time)",
			Status:     "เปิดรับสมัคร",
			Benefits: `- ประกันสุขภาพกลุ่ม
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
			Criteria: []entity.MainCriterion{
				{
					CriterionID: "c1",
					Title:       "Recruitment Experience",
					Weight:      35,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s1_1",
							Title:          "ประสบการณ์ตรงด้านการสรรหา",
							Description:    "ดี: ตรงตามประกาศ มีประสบการณ์สรรหาบุคลากรอย่างน้อย 2 ปีเต็ม",
							Weight:         100,
						},
						{
							SubCriterionID: "s1_2",
							Title:          "การใช้ช่องทางสรรหาเชิงรุก",
							Description:    "ปานกลาง: สามารถใช้ช่องทางที่หลากหลายในการหา Candidate เพิ่มเติมได้",
							Weight:         50,
						},
						{
							SubCriterionID: "s1_3",
							Title:          "ทักษะการสัมภาษณ์งาน",
							Description:    "แย่: ขาดทักษะการตั้งคำถามเชิงลึกเพื่อประเมินศักยภาพผู้สมัคร",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c2",
					Title:       "Labor Law & Negotiation",
					Weight:      25,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s2_1",
							Title:          "ความรู้กฎหมายแรงงานและการต่อรอง",
							Description:    "ดี: ตรงตามประกาศ มีทักษะเจรจาต่อรองและเข้าใจกฎหมายแรงงานเบื้องต้น",
							Weight:         100,
						},
						{
							SubCriterionID: "s2_2",
							Title:          "การบริหารความคาดหวัง",
							Description:    "ปานกลาง: ประสานงานกับหัวหน้าแผนกได้ดีพอสมควร",
							Weight:         50,
						},
						{
							SubCriterionID: "s2_3",
							Title:          "ความเข้าใจเรื่องโครงสร้างเงินเดือน",
							Description:    "แย่: ยังไม่ค่อยมีความเข้าใจเรื่องสวัสดิการและตลาดแรงงานปัจจุบัน",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c3",
					Title:       "Education & Qualification",
					Weight:      20,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s3_1",
							Title:          "วุฒิการศึกษาที่ตรงสาย",
							Description:    "ดี: ตรงตามประกาศ ปริญญาตรีขึ้นไป สาขา HR, จิตวิทยา หรือเกี่ยวข้อง",
							Weight:         100,
						},
						{
							SubCriterionID: "s3_2",
							Title:          "สาขาใกล้เคียงที่เกี่ยวข้อง",
							Description:    "ปานกลาง: สำเร็จการศึกษาในสาขาอื่นๆ ที่สามารถปรับตัวมาทำงาน HR ได้",
							Weight:         50,
						},
						{
							SubCriterionID: "s3_3",
							Title:          "วุฒิการศึกษาไม่ตรงตามกำหนด",
							Description:    "แย่: จบการศึกษาในสาขาที่ไม่เกี่ยวข้องและไม่มีประสบการณ์ทดแทน",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c4",
					Title:       "Digital & ATS Tools Proficiency",
					Weight:      20,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s4_1",
							Title:          "ความคุ้นเคยกับระบบ ATS/AI",
							Description:    "ดี: ตรงตามประกาศ คุ้นเคยกับการใช้งานระบบ ATS หรือเครื่องมือดิจิทัล",
							Weight:         100,
						},
						{
							SubCriterionID: "s4_2",
							Title:          "ทักษะการใช้ Data Dashboard",
							Description:    "ปานกลาง: พอใช้งานเครื่องมือวิเคราะห์ข้อมูลเบื้องต้นได้",
							Weight:         50,
						},
						{
							SubCriterionID: "s4_3",
							Title:          "ความคล่องตัวในการใช้เทคโนโลยี",
							Description:    "แย่: เรียนรู้ระบบคอมพิวเตอร์และเครื่องมือใหม่ๆ ได้ค่อนข้างช้า",
							Weight:         0,
						},
					},
				},
			},
			UserID: hrUser.ID,
		},
		{
			Title:      "เจ้าหน้าที่ประสานงานทั่วไป (Administrative Officer)",
			Department: "ฝ่ายบริหารและธุรการ",
			Location:   "กรุงเทพและปริมณฑล (นนทบุรี)",
			Salary:     "20,000 บาท",
			Type:       "งานเต็มเวลา (Full-time)",
			Status:     "เปิดรับสมัคร",
			Benefits: `- ประกันสังคม
- โบนัสตามผลงาน
- ตรวจสุขภาพประจำปี`,
			ContactInfo: `ส่ง Resume และผลงานมาทาง:
Email: recruitment@hireai.co.th`,
			Description: `ลักษณะงาน:
- ประสานงานทั่วไปทั้งภายในและภายนอกองค์กร เพื่อสนับสนุนการทำงานของแผนกต่างๆ
- จัดทำเอกสาร บันทึกข้อความ รายงานการประชุม และเอกสารธุรการอื่นๆ ที่เกี่ยวข้อง
- จัดเตรียมและตรวจสอบความถูกต้องของเอกสารในแผนก
- ต้อนรับผู้มาติดต่อ จัดตารางนัดหมาย และดูแลความเรียบร้อยของการประชุมต่างๆ ของแผนก`,
			Criteria: []entity.MainCriterion{
				{
					CriterionID: "c1",
					Title:       "Administrative Experience",
					Weight:      40,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s1_1",
							Title:          "ประสบการณ์งานธุรการ",
							Description:    "ดี: ตรงตามประกาศ มีประสบการณ์ในงานธุรการหรือประสานงาน 1-3 ปีขึ้นไป",
							Weight:         100,
						},
						{
							SubCriterionID: "s1_2",
							Title:          "ประสบการณ์งานบริการหรือสนับสนุน",
							Description:    "ปานกลาง: มีประสบการณ์ทำงานบริการลูกค้าหรือสายงานสนับสนุนอื่นๆ ใกล้เคียง",
							Weight:         50,
						},
						{
							SubCriterionID: "s1_3",
							Title:          "ไม่มีประสบการณ์ที่เกี่ยวข้อง",
							Description:    "แย่: ขาดประสบการณ์ทำงานด้านธุรการหรือการจัดการเอกสาร",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c2",
					Title:       "Computer & Software Literacy",
					Weight:      35,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s2_1",
							Title:          "การใช้งาน MS Office และ Google Workspace",
							Description:    "ดี: ตรงตามประกาศ ใช้โปรแกรม Word, Excel, PPT และ Google Workspace ได้คล่องแคล่ว",
							Weight:         100,
						},
						{
							SubCriterionID: "s2_2",
							Title:          "ทักษะคอมพิวเตอร์พื้นฐาน",
							Description:    "ปานกลาง: ใช้งานโปรแกรมสำนักงานได้ในระดับพื้นฐานทั่วไป",
							Weight:         50,
						},
						{
							SubCriterionID: "s2_3",
							Title:          "ทักษะการใช้คอมพิวเตอร์ต่ำกว่าเกณฑ์",
							Description:    "แย่: ไม่มีความคุ้นเคยหรือใช้งานโปรแกรมสำนักงานไม่คล่อง",
							Weight:         0,
						},
					},
				},
				{
					CriterionID: "c3",
					Title:       "Communication & Coordination",
					Weight:      25,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s3_1",
							Title:          "ทักษะการประสานงานและมนุษยสัมพันธ์",
							Description:    "ดี: ตรงตามประกาศ มีมนุษยสัมพันธ์ดีเยี่ยม ทักษะการสื่อสารและประสานงานยอดเยี่ยม",
							Weight:         100,
						},
						{
							SubCriterionID: "s3_2",
							Title:          "การจัดการตารางนัดหมาย",
							Description:    "ปานกลาง: สามารถจัดตารางและต้อนรับผู้มาติดต่อได้ในระดับมาตรฐาน",
							Weight:         50,
						},
						{
							SubCriterionID: "s3_3",
							Title:          "ทักษะการสื่อสารในองค์กร",
							Description:    "แย่: ขาดทักษะการเจรจาและสื่อสารกับผู้อื่นอย่างเป็นระบบ",
							Weight:         0,
						},
					},
				},
			},
			UserID: hrUser.ID,
		},
		{
			Title:      "Software Quality Assurance Tester (QA Tester)",
			Department: "Quality Assurance & Testing",
			Location:   "กรุงเทพมหานคร (BTS พญาไท / Hybrid)",
			Salary:     "35,000 - 55,000 บาท",
			Type:       "งานเต็มเวลา (Full-time)",
			Status:     "เปิดรับสมัคร",
			Benefits: `- ประกันสุขภาพกลุ่มและทันตกรรม
- กองทุนสำรองเลี้ยงชีพ
- โบนัสตามผลงานประจำปี
- สนับสนุนคอร์สอบรมและสอบใบรับรอง ISTQB`,
			ContactInfo: `ส่ง Resume และตัวอย่าง Test Case/Test Plan มาที่:
Email: qa-recruitment@hireai.co.th`,
			Description: `ลักษณะงาน:
- ออกแบบ จัดทำ Test Plan, Test Cases, และ Test Scenarios สำหรับ Web/Mobile Application
- ดำเนินการทดสอบแบบ Manual Testing และเขียน Script สำหรับ Automation Testing (Selenium, Cypress หรือ Playwright)
- บันทึก ติดตาม และประสานงานแก้ไขข้อผิดพลาด (Defect/Bug Tracking) ร่วมกับทีม Software Engineer
- ตรวจสอบคุณภาพซอฟต์แวร์ตามมาตรฐานและข้อกำหนดของระบบก่อน Release`,
			Criteria: []entity.MainCriterion{
				{
					CriterionID: "c1",
					Title:       "Technical Software Testing Skills",
					Weight:      40,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s1_1",
							Title:          "Manual & Automation Testing",
							Description:    "มีประสบการณ์ออกแบบ Test Case, Manual Testing และ Automation Testing 1-3 ปีขึ้นไป",
							Weight:         20,
						},
						{
							SubCriterionID: "s1_2",
							Title:          "API Testing & Bug Tracking Tools",
							Description:    "ใช้งาน Postman, Jira, Git และเครื่องมือติดตาม Defect/Bug ได้อย่างมีประสิทธิภาพ",
							Weight:         20,
						},
					},
				},
				{
					CriterionID: "c2",
					Title:       "QA Process & Analytical Thinking",
					Weight:      30,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s2_1",
							Title:          "กระบวนการ QA และการวิเคราะห์เชิงลึก",
							Description:    "เข้าใจ Software Development Life Cycle (SDLC/STLC) และมีทักษะวิเคราะห์แบบจับผิดความเสี่ยง",
							Weight:         30,
						},
					},
				},
				{
					CriterionID: "c3",
					Title:       "Collaboration & Soft Skills",
					Weight:      20,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s3_1",
							Title:          "การสื่อสารและการทำงานร่วมกับทีมพัฒนา",
							Description:    "สื่อสารประเด็นปัญหาได้ชัดเจน ตรงไปตรงมา มีทัศนคติที่ดีในการทำงานร่วมกับโปรแกรมเมอร์",
							Weight:         20,
						},
					},
				},
				{
					CriterionID: "c4",
					Title:       "Educational Background & Certification",
					Weight:      10,
					SubCriteria: []entity.SubCriterion{
						{
							SubCriterionID: "s4_1",
							Title:          "วุฒิการศึกษาหรือใบรับรอง",
							Description:    "ปริญญาตรีวิทยาการคอมพิวเตอร์ เทคโนโลยีสารสนเทศ หรือมีใบรับรองด้าน QA (ISTQB)",
							Weight:         10,
						},
					},
				},
			},
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
