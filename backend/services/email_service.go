package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
)

// SendApplicationEmail ส่งอีเมลแจ้งเตือนรหัสใบสมัครไปยัง Gmail ของผู้สมัครจริง
func SendApplicationEmail(toEmail string, candidateName string, jobTitle string, appCode string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	// ตัดช่องว่างของ App Password ออก
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] ยืนยันการสมัครงาน - ตำแหน่ง %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
        .code-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; }
        .code-value { font-size: 28px; font-weight: 900; color: #4169E1; letter-spacing: 3px; font-family: monospace; margin: 8px 0; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>ระบบคัดกรองและประเมินผู้สมัครงานอัจฉริยะ</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">สวัสดีคุณ <b>%s</b>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                ระบบได้รับข้อมูลใบสมัครของคุณสำหรับตำแหน่ง <b>"%s"</b> เรียบร้อยแล้ว ขณะนี้ใบสมัครอยู่ในขั้นตอนการพิจารณาและคัดกรองเบื้องต้น
            </p>
            
            <div class="code-box">
                <div class="code-title">รหัสประจำตัวใบสมัครของคุณ (Application ID)</div>
                <div class="code-value">%s</div>
                <p style="font-size: 12px; color: #64748b; margin: 0;">โปรดบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบสถานะการสมัครงาน</p>
            </div>

            <div style="background-color: #eff6ff; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12px; color: #1e40af; line-height: 1.5;">
                💡 <b>คำแนะนำ:</b> คุณสามารถนำรหัส <b>%s</b> ไปกรอกในเมนู <b>"เช็คสถานะสมัครงาน"</b> บนหน้าแรกของเว็บไซต์ เพื่อติดตามความคืบหน้าได้ตลอด 24 ชม.
            </div>
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, appCode, appCode)

	msg := []byte(subject + headers + fromHeader + toHeader + body)

	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลรหัสใบสมัคร %s ไปยัง %s สำเร็จเรียบร้อย!\n", appCode, toEmail)
	return nil
}

// SendInterviewEmail ส่งอีเมลแจ้งเตือนวันเวลาและรายละเอียดนัดหมายสัมภาษณ์ไปยัง Gmail ผู้สมัคร
func SendInterviewEmail(toEmail string, candidateName string, jobTitle string, interviewDate string, location string, notes string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	notesHtml := ""
	if notes != "" {
		notesHtml = fmt.Sprintf(`<div class="info-row"><div class="info-label">Notes / หมายเหตุเพิ่มเติม</div><div class="info-value">%s</div></div>`, notes)
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .info-row { margin-bottom: 12px; font-size: 14px; }
        .info-label { font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .info-value { font-weight: 700; color: #1e293b; margin-top: 2px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;"><b>Dear %[1]s / เรียนคุณ %[1]s,</b></p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We are pleased to invite you to an interview for the position of <b>"%[2]s"</b>.<br/>
                ทางบริษัทขอเรียนเชิญคุณเข้ารับการสัมภาษณ์งานในตำแหน่ง <b>"%[2]s"</b> ตามรายละเอียดนัดหมายดังต่อไปนี้:
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">Date & Time / วันและเวลาสัมภาษณ์</div>
                    <div class="info-value">%[3]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Venue & Format / รูปแบบและสถานที่นัดหมาย</div>
                    <div class="info-value">%[4]s</div>
                </div>
                %[5]s
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Please be prepared and attend the interview as scheduled. For inquiries or rescheduling, please contact HR.<br/>
                โปรดเตรียมพร้อมและเข้าร่วมสัมภาษณ์ตามกำหนดเวลาดังกล่าว หากต้องการสอบถามหรือขอเลื่อนนัดหมาย กรุณาติดต่อฝ่าย HR
            </p>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายอัตโนมัติจากระบบ
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, interviewDate, location, notesHtml)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendCustomInterviewEmail ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ตามเนื้อหาที่ HR กำหนด/แก้ไขจริง
func SendCustomInterviewEmail(toEmail string, jobTitle string, customContent string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] แจ้งนัดหมายสัมภาษณ์งาน - ตำแหน่ง %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	// แปลง newline ให้เป็น <br/> เพื่อให้แสดงผลขึ้นบรรทัดใหม่ในโปรแกรมเปิดเมลได้ถูกต้อง
	formattedContent := strings.ReplaceAll(customContent, "\n", "<br/>")

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.8; word-break: break-word; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            %s
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความแจ้งนัดหมายจากระบบ HireAI Recruitment
        </div>
    </div>
</body>
</html>
`, formattedContent)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลเชิญสัมภาษณ์เนื้อหาตามร่างไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendInterviewEmailWithButtons ส่งอีเมลแจ้งนัดหมายสัมภาษณ์พร้อมปุ่มตอบกลับ (ยืนยัน/เลื่อน/ปฏิเสธ)
func SendInterviewEmailWithButtons(toEmail string, candidateName string, appCode string, jobTitle string, interviewDate string, location string, notes string, responseToken string, baseURL string, interviewID uint) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	notesHtml := ""
	if notes != "" {
		notesHtml = fmt.Sprintf(`<div class="info-row"><div class="info-label">Notes / หมายเหตุเพิ่มเติม</div><div class="info-value">%s</div></div>`, notes)
	}

	cleanBaseURL := strings.TrimRight(baseURL, "/")
	confirmURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=confirm&token=%s", cleanBaseURL, interviewID, responseToken)
	rescheduleURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reschedule&token=%s", cleanBaseURL, interviewID, responseToken)
	rejectURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reject&token=%s", cleanBaseURL, interviewID, responseToken)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .info-row { margin-bottom: 12px; font-size: 14px; }
        .info-label { font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .info-value { font-weight: 700; color: #1e293b; margin-top: 2px; }
        .btn-group { text-align: center; margin: 28px 0 8px 0; }
        .btn { display: inline-block; padding: 12px 22px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; margin: 6px; }
        .btn-confirm { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff !important; }
        .btn-reschedule { background: linear-gradient(135deg, #F59E0B, #D97706); color: #ffffff !important; }
        .btn-reject { background: linear-gradient(135deg, #EF4444, #DC2626); color: #ffffff !important; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;"><b>Dear %[1]s / เรียนคุณ %[1]s,</b></p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We would like to invite you to attend the interview for <b>"%[2]s"</b>.<br/>
                ทางบริษัทขอเรียนเชิญคุณเข้ารับการสัมภาษณ์งานสำหรับตำแหน่ง <b>"%[2]s"</b> โดยมีรายละเอียดดังต่อไปนี้:
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">App Code / รหัสประจำตัวใบสมัคร</div>
                    <div class="info-value" style="color: #2563eb; font-family: monospace; font-size: 16px;">%[3]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Date & Time / วันและเวลาสัมภาษณ์</div>
                    <div class="info-value">%[4]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Format & Venue / รูปแบบและสถานที่นัดหมาย</div>
                    <div class="info-value">%[5]s</div>
                </div>
                %[6]s
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 4px; text-align: center;">
                Please respond to confirm, reschedule, or decline by clicking the buttons below:<br/>
                กรุณาตอบกลับเพื่อยืนยัน ขอเลื่อนนัด หรือปฏิเสธ โดยกดปุ่มด้านล่าง:
            </p>

            <div class="btn-group">
                <a href="%[7]s" class="btn btn-confirm">ยืนยันเข้าร่วม / Confirm</a>
                <a href="%[8]s" class="btn btn-reschedule">ขอเลื่อนนัด / Reschedule</a>
                <a href="%[9]s" class="btn btn-reject">ปฏิเสธ / Decline</a>
            </div>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายอัตโนมัติจากระบบ
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, appCode, interviewDate, location, notesHtml, confirmURL, rescheduleURL, rejectURL)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งนัดหมายสัมภาษณ์พร้อมปุ่มตอบกลับไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendCustomInterviewEmailWithButtons ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ตามเนื้อหาที่ HR กำหนดพร้อมปุ่มตอบกลับ
func SendCustomInterviewEmailWithButtons(toEmail string, jobTitle string, customContent string, responseToken string, baseURL string, interviewID uint) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	// แปลง newline ให้เป็น <br/> เพื่อให้แสดงผลขึ้นบรรทัดใหม่ในโปรแกรมเปิดเมลได้ถูกต้อง
	formattedContent := strings.ReplaceAll(customContent, "\n", "<br/>")

	cleanBaseURL := strings.TrimRight(baseURL, "/")
	confirmURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=confirm&token=%s", cleanBaseURL, interviewID, responseToken)
	rescheduleURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reschedule&token=%s", cleanBaseURL, interviewID, responseToken)
	rejectURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reject&token=%s", cleanBaseURL, interviewID, responseToken)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.8; word-break: break-word; }
        .btn-group { text-align: center; margin: 28px 0 8px 0; padding: 0 20px; }
        .btn { display: inline-block; padding: 12px 22px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; margin: 6px; }
        .btn-confirm { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff !important; }
        .btn-reschedule { background: linear-gradient(135deg, #F59E0B, #D97706); color: #ffffff !important; }
        .btn-reject { background: linear-gradient(135deg, #EF4444, #DC2626); color: #ffffff !important; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            %s
        </div>
        <div class="btn-group">
            <a href="%s" class="btn btn-confirm">ยืนยันเข้าร่วม / Confirm</a>
            <a href="%s" class="btn btn-reschedule">ขอเลื่อนนัด / Reschedule</a>
            <a href="%s" class="btn btn-reject">ปฏิเสธ / Decline</a>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายจากระบบรับสมัครงาน
        </div>
    </div>
</body>
</html>
`, formattedContent, confirmURL, rescheduleURL, rejectURL)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลเชิญสัมภาษณ์พร้อมปุ่มตอบกลับไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendInterviewResultEmail ส่งอีเมลแจ้งผลสัมภาษณ์ (ผ่าน/ไม่ผ่าน) พร้อมปุ่มรับทราบผล
func SendInterviewResultEmail(toEmail string, candidateName string, appCode string, jobTitle string, result string, resultNotes string, customContent string, resultToken string, baseURL string, interviewID uint) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	cleanBaseURL := strings.TrimRight(baseURL, "/")
	acknowledgeURL := fmt.Sprintf("%s/api/interviews/acknowledge-result?id=%d&token=%s", cleanBaseURL, interviewID, resultToken)

	// กำหนดสี, ไอคอน, หัวข้อ ตามผลสัมภาษณ์
	var headerGradient, badgeColor, badgeBg, iconEmoji, resultText, subjectText, messageDefault string
	if result == "passed" {
		headerGradient = "linear-gradient(135deg, #059669, #10b981)"
		badgeColor = "#065f46"
		badgeBg = "#d1fae5"
		iconEmoji = "🎉"
		resultText = "ผ่านการสัมภาษณ์"
		subjectText = "ยินดีด้วย! คุณผ่านการสัมภาษณ์"
		messageDefault = fmt.Sprintf("เราขอแจ้งให้ทราบว่าคุณ <b>ผ่านการสัมภาษณ์</b> สำหรับตำแหน่ง <b>\"%s\"</b> เรียบร้อยแล้ว ทีมงานของเรายินดีต้อนรับคุณเข้าสู่ขั้นตอนถัดไป", jobTitle)
	} else {
		headerGradient = "linear-gradient(135deg, #6366f1, #8b5cf6)"
		badgeColor = "#4338ca"
		badgeBg = "#e0e7ff"
		iconEmoji = "🙏"
		resultText = "ไม่ผ่านการสัมภาษณ์"
		subjectText = "แจ้งผลการสัมภาษณ์"
		messageDefault = fmt.Sprintf("เราขอขอบคุณที่คุณให้ความสนใจและสละเวลาเข้าร่วมสัมภาษณ์สำหรับตำแหน่ง <b>\"%s\"</b> หลังจากพิจารณาอย่างรอบคอบแล้ว เราเสียใจที่ต้องแจ้งว่าคุณ <b>ยังไม่ผ่านเกณฑ์</b> ในรอบนี้ ขอให้คุณโชคดีในเส้นทางอาชีพครับ/ค่ะ", jobTitle)
	}

	// ถ้า HR ส่ง customContent มา ให้ใช้แทน messageDefault
	messageHtml := messageDefault
	if customContent != "" {
		messageHtml = strings.ReplaceAll(customContent, "\n", "<br/>")
	}

	// หมายเหตุ
	notesHtml := ""
	if resultNotes != "" {
		notesHtml = fmt.Sprintf(`<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-top:16px; font-size:13px; color:#475569; line-height:1.6;">
            <b style="color:#334155;">ความเห็นเพิ่มเติม:</b><br/>%s
        </div>`, strings.ReplaceAll(resultNotes, "\n", "<br/>"))
	}

	subject := fmt.Sprintf("Subject: [HireAI] %s - ตำแหน่ง %s\r\n", subjectText, jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: %s; color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .result-badge { display: inline-block; background: %s; color: %s; padding: 8px 20px; border-radius: 100px; font-size: 14px; font-weight: 800; margin: 16px 0; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 16px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-val { color: #0f172a; font-weight: 700; }
        .btn-acknowledge { display: block; width: 100%%; text-align: center; padding: 14px 24px; border-radius: 14px; font-size: 14px; font-weight: 800; text-decoration: none; color: #ffffff !important; margin-top: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>%s แจ้งผลการสัมภาษณ์</h1>
            <p>HireAI Recruitment System</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">สวัสดีคุณ <b>%s</b>,</p>

            <div style="text-align: center;">
                <span class="result-badge">%s %s</span>
            </div>

            <p style="font-size: 14px; line-height: 1.7; color: #475569;">
                %s
            </p>

            <div class="info-box">
                <div class="info-row"><span class="info-label">รหัสใบสมัคร</span><span class="info-val" style="font-family: monospace; color: #4169E1;">%s</span></div>
                <div class="info-row"><span class="info-label">ตำแหน่งงาน</span><span class="info-val">%s</span></div>
                <div class="info-row"><span class="info-label">ผลสัมภาษณ์</span><span class="info-val">%s</span></div>
            </div>

            %s

            <a href="%s" class="btn-acknowledge" style="background: %s;">
                ยืนยันรับทราบผลการสัมภาษณ์
            </a>
            <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 10px;">
                กรุณากดปุ่มด้านบนเพื่อยืนยันว่าคุณได้รับทราบผลการสัมภาษณ์แล้ว
            </p>
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </div>
    </div>
</body>
</html>
`,
		headerGradient,
		badgeBg, badgeColor,
		iconEmoji,
		candidateName,
		iconEmoji, resultText,
		messageHtml,
		appCode, jobTitle, resultText,
		notesHtml,
		acknowledgeURL,
		badgeColor,
	)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("ส่งอีเมลแจ้งผลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งผลสัมภาษณ์ (%s) ไปยัง %s สำเร็จเรียบร้อย!\n", result, toEmail)
	return nil
}
