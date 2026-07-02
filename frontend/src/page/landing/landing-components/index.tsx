import { useNavigate } from "react-router-dom";
import bgImage from "../../../assets/พื้นหลัง.png";

// ── NAVBAR ──────────────────────────────────────────
export function Navbar() {
    const navigate = useNavigate();
    return (
        <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex justify-between items-center px-6 md:px-12 py-4">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-tr from-[#4169E1] to-[#4834d4] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="text-slate-900 font-bold text-2xl tracking-tight font-sans">Hire<span className="text-[#4169E1]">AI</span></div>
            </div>
            <div className="hidden md:flex gap-10 items-center">
                <a href="#hero" className="text-slate-600 hover:text-[#4169E1] text-sm font-semibold transition-colors font-sans">หน้าแรก</a>
                <a href="#solution" className="text-slate-600 hover:text-[#4169E1] text-sm font-semibold transition-colors font-sans">ปัญหา</a>
                <a href="#features" className="text-slate-600 hover:text-[#4169E1] text-sm font-semibold transition-colors font-sans">ฟีเจอร์</a>
                <a href="#how-it-works" className="text-slate-600 hover:text-[#4169E1] text-sm font-semibold transition-colors font-sans">วิธีการทำงาน</a>
            </div>
            <button
                onClick={() => navigate("/login")}
                className="bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95 font-sans"
            >
                เข้าสู่ระบบ
            </button>
        </nav>
    );
}

// ── HERO ─────────────────────────────────────────────
export function Hero() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 -z-10">
                <img
                    src={bgImage}
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]"></div>
            </div>

            <div className="animate-fadeIn max-w-5xl mx-auto pt-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50/80 backdrop-blur-md text-[#4169E1] rounded-full text-xs font-bold mb-8 border border-indigo-100 font-sans shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4169E1]"></span>
                    </span>
                    ระบบคัดกรองบุคลากรอัจฉริยะด้วย AI
                </div>

                <h1 className="text-4xl md:text-8xl font-black text-slate-900 leading-tight md:leading-tight mb-8 font-sans tracking-tight">
                    สรรหาบุคลากรฉลาดกว่าเดิมด้วย AI — <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4169E1] to-[#3f37c9]">
                        คัดกรอง ให้คะแนน และรวดเร็ว
                    </span>
                </h1>

                <p className="text-slate-600 text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-sans font-medium">
                    แพลตฟอร์มรับสมัครงานอัจฉริยะที่ช่วยคัดกรอง Resume อัตโนมัติ <br className="hidden md:block" />
                    จัดลำดับผู้สมัคร และตอบคำถามพนักงานได้ตลอด 24 ชั่วโมง
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <button className="bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-12 py-5 rounded-2xl text-xl shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 font-sans">
                        เริ่มใช้งานฟรี
                    </button>
                    <button className="bg-white/80 backdrop-blur-md hover:bg-white text-slate-900 font-bold px-12 py-5 rounded-2xl text-xl border-2 border-slate-200 transition-all hover:border-[#4169E1]/20 active:scale-95 font-sans">
                        ดูตัวอย่าง Demo
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── PROBLEM SECTION ───────────────────────────────────
export function ProblemSection() {
    const problems = [
        {
            icon: "⏰",
            title: "ภาระงานที่หนักเกินไป",
            desc: "HR ต้องใช้เวลานานหลายชั่วโมงในการคัดกรอง Resume จำนวนมากด้วยตัวเอง ทำให้เกิดความเหนื่อยล้าและล่าช้า"
        },
        {
            icon: "⚖️",
            title: "ความไม่แน่นอนและอคติ",
            desc: "การให้คะแนนที่ไม่เป็นมาตรฐานและการตัดสินใจด้วยความรู้สึกส่วนตัว อาจทำให้พลาดผู้สมัครที่ดีที่สุดไป"
        },
        {
            icon: "⏳",
            title: "การตอบกลับที่ล่าช้า",
            desc: "พนักงานต้องเสียเวลารอนานเพื่อคำตอบเกี่ยวกับนโยบายบริษัทหรือสวัสดิการที่ควรจะได้รับข้อมูลในทันที"
        }
    ];

    return (
        <div className="py-24 px-6 bg-white relative">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 font-sans">ปัญหาของการสรรหาบุคลากรแบบเดิม</h2>
                    <div className="w-20 h-1.5 bg-[#4169E1] mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {problems.map((p, i) => (
                        <div key={i} className="p-10 rounded-3xl bg-[#f8fafc] border border-slate-100 hover:border-[#4169E1]/30 transition-all hover:shadow-xl group">
                            <div className="text-5xl mb-6 grayscale group-hover:grayscale-0 transition-all">{p.icon}</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 font-sans">{p.title}</h3>
                            <p className="text-slate-500 leading-relaxed font-sans">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── FEATURES ──────────────────────────────────────────
export function Features() {
    const features = [
        {
            icon: "🎯",
            title: "การคัดกรองและจัดลำดับด้วย AI",
            desc: "ใช้ EasyOCR ดึงข้อมูลจาก Resume และให้ Llama AI วิเคราะห์คะแนน 0–100 พร้อมจัดลำดับผู้สมัครตามความเหมาะสมอัตโนมัติ"
        },
        {
            icon: "📅",
            title: "ระบบนัดหมายสัมภาษณ์",
            desc: "จัดการตารางสัมภาษณ์ได้อย่างไร้รอยต่อ พร้อมระบบแจ้งเตือนอัตโนมัติทั้ง HR และผู้สมัครผ่านอีเมล"
        },
        {
            icon: "🤖",
            title: "แชทบอทให้คำปรึกษาพนักงาน",
            desc: "Typhoon 2 แชทบอทอัจฉริยะที่ตอบคำถามนโยบายบริษัท สวัสดิการ และข้อบังคับต่างๆ ได้ตลอด 24 ชั่วโมง ทั้งภาษาไทยและอังกฤษ"
        }
    ];

    return (
        <div className="py-24 px-6 bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 font-sans">แนวทางแก้ไขด้วยพลังของ AI</h2>
                    <p className="text-slate-500 text-lg font-sans">ปฏิวัติวิธีการบริหารจัดการบุคลากรของคุณให้มีประสิทธิภาพยิ่งขึ้น</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-2xl transition-all border border-slate-100 flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-sans">{f.title}</h3>
                            <p className="text-slate-500 leading-relaxed font-sans">{f.desc}</p>
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
        { num: "1", title: "อัปโหลด Resume", desc: "อัปโหลดไฟล์ PDF หรือรูปภาพเข้าสู่ระบบได้โดยตรง" },
        { num: "2", title: "ดึงข้อมูลด้วย EasyOCR", desc: "ระบบดึงข้อมูลข้อความจากไฟล์ออกมาอย่างแม่นยำ" },
        { num: "3", title: "วิเคราะห์และให้คะแนน", desc: "Llama AI วิเคราะห์ทักษะและประสบการณ์เพื่อจัดลำดับผู้สมัคร" },
        { num: "4", title: "คัดเลือกและตัดสินใจ", desc: "HR ตรวจสอบผลลัพธ์และคัดเลือกผู้สมัครที่เหมาะสมที่สุด" }
    ];

    return (
        <div id="how-it-works" className="py-24 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 font-sans">ขั้นตอนการทำงาน</h2>
                    <p className="text-slate-500 font-sans">กระบวนการง่ายๆ 4 ขั้นตอนเพื่อการจ้างงานที่มีคุณภาพ</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                    <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-0.5 bg-slate-100 -z-10"></div>

                    {steps.map((s, i) => (
                        <div key={i} className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-100 mb-6 border-8 border-white ring-1 ring-slate-100">
                                {s.num}
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 mb-3 font-sans">{s.title}</h4>
                            <p className="text-slate-500 text-sm leading-relaxed font-sans">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── TECH STACK ────────────────────────────────────────
export function TechStack() {
    const techs = ["EasyOCR", "Meta Llama", "Typhoon 2", "Go + Gin", "React", "PostgreSQL"];
    return (
        <div className="py-20 px-6 border-t border-slate-100">
            <div className="max-w-6xl mx-auto">
                <h3 className="text-center text-slate-400 font-bold tracking-widest text-sm uppercase mb-12 font-sans">พัฒนาด้วยเทคโนโลยีชั้นนำระดับสากล</h3>
                <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                    {techs.map(t => (
                        <span key={t} className="px-8 py-4 bg-slate-50 rounded-2xl text-slate-700 font-bold text-lg border border-transparent hover:border-indigo-200 transition-colors cursor-default font-sans">
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
        <div className="px-6 pb-24">
            <div className="max-w-6xl mx-auto rounded-[3rem] bg-gradient-to-br from-[#4169E1] to-[#3f37c9] p-12 md:p-24 text-center text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[80px]"></div>

                <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10 font-sans">
                    พร้อมที่จะเปลี่ยน <br /> กระบวนการจ้างงานของคุณหรือยัง?
                </h2>
                <p className="text-indigo-100 text-xl max-w-2xl mx-auto mb-12 relative z-10 font-sans">
                    เข้าร่วมกับทีม HR ยุคใหม่ที่ใช้ HireAI เพื่อสรรหาบุคลากรคุณภาพได้รวดเร็วขึ้นเป็นเท่าตัว
                </p>
                <button className="bg-white text-[#4169E1] font-black px-12 py-5 rounded-2xl text-xl shadow-xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 relative z-10 font-sans">
                    ลงทะเบียนแจ้งความสนใจ
                </button>
            </div>
        </div>
    );
}

// ── FOOTER ────────────────────────────────────────────
export function Footer() {
    return (
        <footer className="py-12 bg-white border-t border-slate-100 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                <div>
                    <div className="text-slate-900 font-bold text-2xl tracking-tighter mb-2">HireAI</div>
                    <p className="text-slate-400 text-sm select-none font-sans">ระบบสรรหาและให้คำปรึกษาพนักงานอัจฉริยะ</p>
                </div>
                <div className="text-slate-400 text-xs font-medium space-y-1 font-sans">
                    <p>CPE Pre Cap-Stone Group 12</p>
                    <p>ภาณุ · เจษฎา · ธนัช · อิสรภาพ</p>
                </div>
                <div className="text-slate-500 text-sm font-sans">
                    © 2026 HireAI. สงวนลิขสิทธิ์
                </div>
            </div>
        </footer>
    );
}
