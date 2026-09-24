import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

output_dir = r"c:\Users\เจษฎา\Desktop\Final\AI-Based-Candidate-Screening-Ranking-and-Company-Policy-Question-Answering-System\backend\upload"
os.makedirs(output_dir, exist_ok=True)

# Register Thai font if available, otherwise use Helvetica with standard text
styles = getSampleStyleSheet()

doc1_path = os.path.join(output_dir, "ระเบียบและข้อบังคับในการทำงานขององค์กร.pdf")
doc2_path = os.path.join(output_dir, "นโยบายการสวัสดิการและสิทธิประโยชน์พนักงาน.pdf")
doc3_path = os.path.join(output_dir, "นโยบายเวลาทำงานและล่วงเวลา.pdf")

def create_pdf(path, title, content_lines):
    doc = SimpleDocTemplate(path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    story = []
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor='#4169E1',
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        spaceAfter=8
    )
    
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 10))
    
    for line in content_lines:
        story.append(Paragraph(line, body_style))
        story.append(Spacer(1, 4))
        
    doc.build(story)
    print("PDF created successfully!")

# Document 1: Company Rules
create_pdf(
    doc1_path,
    "Company Work Rules & Code of Conduct (ระเบียบและข้อบังคับการทำงาน)",
    [
        "1. Working Hours: Monday - Friday, 08:30 - 17:30.",
        "2. Probation Period: 119 days evaluation.",
        "3. Dress Code: Smart Casual, Formal on client meetings.",
        "4. Leave Policy: Annual Leave 10 days/year after probation.",
        "5. Sick Leave: 30 days paid leave per year with medical certificate.",
        "6. Confidentiality: Employee must preserve company data confidentiality strictly."
    ]
)

# Document 2: Welfare & Benefits
create_pdf(
    doc2_path,
    "Employee Welfare & Benefits Policy (นโยบายสวัสดิการและสิทธิประโยชน์)",
    [
        "1. Health Insurance: Group insurance covering OPD 1,500 THB/visit (max 30 visits/year).",
        "2. IPD Coverage: Room 3,000 THB/day, medical fee covered up to 100,000 THB/year.",
        "3. Dental Care: 3,000 THB per year per employee.",
        "4. Training Allowance: 10,000 THB/year for skill development & certification.",
        "5. Fitness & Wellness: Monthly fitness allowance up to 1,000 THB.",
        "6. Annual Health Checkup: Free annual health examination provided for all full-time staff."
    ]
)

# Document 3: Working Hours & Overtime
create_pdf(
    doc3_path,
    "Working Hours & Overtime Policy (นโยบายเวลาทำงานและล่วงเวลา OT)",
    [
        "1. Standard Working Hours: 8 hours per day, total 40 hours per week.",
        "2. Lunch Break: 12:00 - 13:00 daily.",
        "3. Overtime (OT) Approval: OT must be pre-approved by Department Manager.",
        "4. Workday OT Rate: 1.5 times standard hourly rate for overtime after 17:30.",
        "5. Holiday OT Rate: 2.0 times standard hourly rate on official holidays.",
        "6. Time Attendance: Scan fingerprint or mobile app clock-in before 08:45 AM."
    ]
)

print("All PDF files created successfully!")
