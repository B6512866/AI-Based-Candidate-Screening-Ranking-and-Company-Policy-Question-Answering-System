import { useNavigate } from "react-router-dom";
import { 
    Sparkles, 
    CheckCircle, 
    MessageSquare, 
    Zap,
    FileCheck,
    BarChart3
} from "lucide-react";

// ── NAVBAR ──────────────────────────────────────────
export function Navbar() {
    const navigate = useNavigate();
    return (
        <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex justify-between items-center px-6 md:px-12 py-4">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-tr from-[#4169E1] to-[#3a5ec7] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-150 transform hover:rotate-6 transition-transform">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-slate-900 font-extrabold text-2xl tracking-tight font-sans">
                    Hire<span className="text-[#4169E1]">AI</span>
                </div>
            </div>
            <div className="hidden md:flex gap-10 items-center">
                <a href="#hero" className="text-slate-500 hover:text-[#4169E1] text-xs font-bold uppercase tracking-wider transition-colors font-sans">หน้าแรก</a>
                <a href="#solution" className="text-slate-500 hover:text-[#4169E1] text-xs font-bold uppercase tracking-wider transition-colors font-sans">ความต่างของเรา</a>
                <a href="#features" className="text-slate-500 hover:text-[#4169E1] text-xs font-bold uppercase tracking-wider transition-colors font-sans">ฟีเจอร์หลัก</a>
                <a href="#how-it-works" className="text-slate-500 hover:text-[#4169E1] text-xs font-bold uppercase tracking-wider transition-colors font-sans">ขั้นตอนทำงาน</a>
                <a href="#job-board" className="text-slate-500 hover:text-[#4169E1] text-xs font-bold uppercase tracking-wider transition-colors font-sans">ร่วมงานกับเรา</a>
            </div>
            <button
                onClick={() => navigate("/login")}
                className="bg-[#4169E1] hover:bg-[#3458ca] text-white font-bold px-6 py-2.5 rounded-xl text-xs tracking-wide shadow-md shadow-indigo-100 hover:shadow-lg transition-all active:scale-95 font-sans"
            >
                เข้าสู่ระบบ HR / พนักงาน
            </button>
        </nav>
    );
}

interface HeroProps {
    jobBoardContent: React.ReactNode;
}

// ── HERO ─────────────────────────────────────────────
export function Hero({ jobBoardContent }: HeroProps) {
    return (
        <div className="relative min-h-screen bg-slate-50/50 flex flex-col items-center justify-start px-6 pt-32 pb-20 overflow-hidden">
            {/* Grid Pattern and Ambient Light Blobs */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10" />
            <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-[#4169E1]/5 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-6xl mx-auto w-full flex flex-col items-center text-center">
                {/* Hero Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 text-[#4169E1] rounded-full text-[11px] font-black uppercase tracking-wider mb-8 shadow-sm">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#4169E1]" />
                    Next-Gen AI Candidate Assessment Platform
                </div>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-800 leading-[1.1] md:leading-[1.1] mb-8 font-sans tracking-tight max-w-5xl">
                    คัดกรองและประเมินผู้สมัครงาน <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4169E1] via-indigo-600 to-[#3a5ec7] font-black">
                        เร็วกว่าเดิม 10 เท่า ด้วย AI
                    </span>
                </h1>

                {/* Hero Description */}
                <p className="text-slate-500 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                    สรรหาคนที่ใช่ในพริบตา ระบบวิเคราะห์และให้คะแนน Resume อัตโนมัติ 
                    พร้อมช่วยจัดลำดับผู้สมัครอย่างเป็นกลาง และแชทบอทบริการตอบคำถามพนักงานตลอด 24 ชั่วโมง
                </p>

                {/* 📝 Replacing Mock Dashboard directly with the Job Board component */}
                <div className="w-full max-w-6xl animate-scaleUp">
                    {jobBoardContent}
                </div>
            </div>
        </div>
    );
}

// ── PROBLEM VS SOLUTION (Gappeo Style) ────────────────
export function ProblemSection() {
    return (
        <div className="py-28 px-6 bg-white relative">
            <div className="max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <span className="text-[#4169E1] font-bold text-xs uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                        Traditional vs Smart AI
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
                        ทำไมการคัดกรองแบบเดิมๆ <br /> ถึงไม่ตอบโจทย์อีกต่อไป?
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                        เปรียบเทียบภาระงานของ HR ระหว่างกระบวนการคัดสรรแบบเก่ากับการเปลี่ยนผ่านสู่ระบบวิเคราะห์อัตโนมัติด้วยพลังของ AI
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* The Traditional Way */}
                    <div className="bg-slate-50 border border-slate-200/50 rounded-3xl p-8 md:p-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-lg">
                                ❌
                            </div>
                            <h3 className="font-black text-slate-700 text-lg">การสรรหาแบบเดิม (Manual Recruitment)</h3>
                        </div>
                        <ul className="space-y-4 text-slate-500 text-sm font-medium">
                            <li className="flex items-start gap-3">
                                <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                                <span>HR เสียเวลาเฉลี่ย 3-5 ชั่วโมงต่อสัปดาห์ในการอ่านและคัดกรอง Resume จากใบสมัครทีละคน</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                                <span>ขาดเกณฑ์การประเมินคะแนนที่เป็นมาตรฐาน ทำให้ผลลัพธ์อาจเอนเอียงตามอคติส่วนบุคคล</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                                <span>พนักงานต้องรอนานในการขอคำปรึกษาเกี่ยวกับสวัสดิการหรือกฎระเบียบ เนื่องจาก HR ติดภาระงานอื่น</span>
                            </li>
                        </ul>
                    </div>

                    {/* The HireAI Way */}
                    <div className="bg-[#4169E1]/5 border border-[#4169E1]/20 rounded-3xl p-8 md:p-10 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#4169E1]/10 rounded-full blur-2xl" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#4169E1]/10 text-[#4169E1] flex items-center justify-center">
                                <Zap className="w-5 h-5 fill-[#4169E1]" />
                            </div>
                            <h3 className="font-black text-slate-800 text-lg">ระบบอัจฉริยะ (HireAI Platform)</h3>
                        </div>
                        <ul className="space-y-4 text-slate-600 text-sm font-semibold">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>สแกนข้อมูลจากไฟล์ภาพและ PDF ด้วย AI OCR ดึงข้อความดิบส่งวิเคราะห์ทันที</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>AI ประเมินคะแนนตาม JD และเกณฑ์คัดเลือกโดยตรงอย่างเท่าเทียมและมีมาตรฐาน</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>พนักงานแชทถามข้อบังคับและสวัสดิการได้ตลอด 24 ชั่วโมง โดยบอทจะอ้างอิงข้อมูลจากคลังความรู้จริง</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── FEATURES ──────────────────────────────────────────
export function Features() {
    const features = [
        {
            icon: <FileCheck className="w-8 h-8 text-[#4169E1]" />,
            title: "ระบบสแกนเอกสารอัจฉริยะ",
            desc: "แปลงรูปภาพและไฟล์ Resume (PDF, PNG, JPG) เป็นข้อความด้วยโมเดล Typhoon OCR ทันที ช่วยลดเวลาจัดเตรียมเอกสาร"
        },
        {
            icon: <BarChart3 className="w-8 h-8 text-[#4169E1]" />,
            title: "การประเมินผลและจัดอันดับด้วย AI",
            desc: "เทียบคุณสมบัติผู้สมัครกับลักษณะงานและเกณฑ์โดยตรง ให้คะแนนแบบละเอียดและเป็นกลางเพื่อเฟ้นหาคนที่ดีที่สุด"
        },
        {
            icon: <MessageSquare className="w-8 h-8 text-[#4169E1]" />,
            title: "บอทที่ปรึกษาพนักงาน 24/7",
            desc: "สอบถามนโยบาย สวัสดิการ วันลา หรือสิทธิ์การเบิกจ่ายได้ตลอดเวลา บอทอ้างอิงคลังข้อมูลเพื่อตอบพนักงานได้อย่างแม่นยำ"
        }
    ];

    return (
        <div className="py-24 px-6 bg-slate-50/50">
            <div className="max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
                    <span className="text-[#4169E1] font-bold text-xs uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                        Core Platform Capabilities
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">ฟีเจอร์เด่นเพื่อการจัดการแบบใหม่</h2>
                    <p className="text-slate-400 text-sm">เครื่องมือสำคัญที่ถูกพัฒนามาเพื่อช่วยเหลือทั้งบุคลากรฝั่งบริหาร (HR) และพนักงานทั่วไป</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all border border-slate-200/40 text-left group">
                            <div className="w-16 h-16 bg-[#4169E1]/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-4 font-sans">{f.title}</h3>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed font-sans">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── HOW IT WORKS ──────────────────────────────────────
export function HowItWorks() {
    const steps = [
        { num: "1", title: "สร้างประกาศรับสมัคร", desc: "HR ตั้งค่าระบุหน้าที่ความรับผิดชอบ และกำหนดเกณฑ์คะแนนของแผนกนั้นๆ" },
        { num: "2", title: "ผู้สมัครอัปโหลดประวัติ", desc: "ผู้สมัครกรอกรายละเอียดข้อมูลเบื้องต้นและแนบไฟล์ Resume/รูปภาพประวัติส่วนตัว" },
        { num: "3", title: "AI สแกนประมวลผล", desc: "ระบบรัน OCR และยิงคำสั่งวิเคราะห์คะแนนด้วย AI โดยเทียบตามข้อกำหนดโดยละเอียด" },
        { num: "4", title: "จัดลำดับและประเมินผล", desc: "HR ตรวจสอบรายละเอียดคะแนนของทุกคนที่จัดเรียงไว้แล้ว และเริ่มทำนัดสัมภาษณ์ได้ทันที" }
    ];

    return (
        <div id="how-it-works" className="py-24 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
                    <span className="text-[#4169E1] font-bold text-xs uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                        Workflow Process
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">ขั้นตอนการทำงานของระบบ</h2>
                    <p className="text-slate-400 text-sm">การจัดลำดับประเมินผลที่โปร่งใส ง่ายดาย และสมบูรณ์ใน 4 ขั้นตอน</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-px bg-slate-200 -z-10" />

                    {steps.map((s, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-[#4169E1] text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-200 border-4 border-white ring-1 ring-slate-200">
                                {s.num}
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-800 font-sans">{s.title}</h4>
                            <p className="text-slate-400 text-xs font-semibold leading-relaxed font-sans">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── TECH STACK ────────────────────────────────────────
export function TechStack() {
    const techs = ["Typhoon OCR 1.5", "Typhoon 2.5 Chat", "Golang (Gin)", "React (TypeScript)", "PostgreSQL", "Tailwind CSS"];
    return (
        <div className="py-24 px-6 bg-slate-50/50 border-t border-slate-200/30">
            <div className="max-w-6xl mx-auto text-center">
                <h3 className="text-slate-400 font-black tracking-widest text-xs uppercase mb-12 font-sans">พัฒนาด้วยเทคโนโลยีที่มีประสิทธิภาพและได้มาตรฐาน</h3>
                <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                    {techs.map(t => (
                        <span key={t} className="px-6 py-3.5 bg-white rounded-xl text-slate-700 font-bold text-xs border border-slate-200/50 shadow-sm hover:border-[#4169E1]/30 transition-all cursor-default font-sans">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── CTA SECTION ───────────────────────────────────────
export function CTASection() {
    return (
        <div className="px-6 pb-24 bg-slate-50/20">
            <div className="max-w-6xl mx-auto rounded-[2.5rem] bg-gradient-to-tr from-[#4169E1] to-[#2546ad] p-12 md:p-20 text-center text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                {/* Background lighting */}
                <div className="absolute -top-1/2 -right-1/4 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-1/3 -left-1/4 w-[35rem] h-[35rem] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="max-w-3xl mx-auto space-y-8 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                        พร้อมที่จะยกระดับการคัดกรอง <br /> ผู้สมัครงานของคุณแล้วหรือยัง?
                    </h2>
                    <p className="text-blue-100/90 text-sm sm:text-base font-semibold max-w-xl mx-auto leading-relaxed">
                        เปลี่ยนผ่านกระบวนการจ้างงานแบบเดิม สู่รูปแบบที่รวดเร็ว ชัดเจน มีมาตรฐาน 
                        และเป็นธรรมสำหรับทุกคนในองค์กร
                    </p>
                    <div className="pt-2">
                        <a
                            href="#job-board"
                            className="inline-block bg-white hover:bg-slate-50 text-[#4169E1] font-black px-10 py-4.5 rounded-xl text-xs tracking-wider shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 font-sans"
                        >
                            ค้นหาตำแหน่งงานว่างและเริ่มสมัครงาน
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── FOOTER ────────────────────────────────────────────
export function Footer() {
    return (
        <footer className="py-16 bg-white border-t border-slate-200/50 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
                <div className="space-y-2">
                    <div className="text-slate-800 font-extrabold text-2xl tracking-tight">Hire<span className="text-[#4169E1]">AI</span></div>
                    <p className="text-slate-400 text-xs font-semibold select-none font-sans">ระบบประเมินผู้สมัครงานและตอบกลับพนักงานอัจฉริยะ</p>
                </div>
                <div className="text-slate-400 text-[11px] font-bold space-y-1.5 font-sans border-y md:border-y-0 py-4 md:py-0 border-slate-100/80">
                    <p className="text-slate-500 uppercase tracking-wider text-[10px]">CPE Pre Cap-Stone Group 12</p>
                    <p>ภาณุ · เจษฎา · ธนัช · อิสรภาพ</p>
                </div>
                <div className="text-slate-400 text-[11px] font-semibold font-sans">
                    © 2026 HireAI. สงวนลิขสิทธิ์ทั้งหมด
                </div>
            </div>
        </footer>
    );
}
