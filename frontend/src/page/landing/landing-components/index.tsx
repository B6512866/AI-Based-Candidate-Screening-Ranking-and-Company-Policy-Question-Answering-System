import React from "react";
import { useNavigate } from "react-router-dom";

// ── NAVBAR ──────────────────────────────────────────
export function Navbar() {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">J</span>
        </div>
        <div className="text-slate-900 font-bold text-xl tracking-tight">JobCareers</div>
      </div>
      <div className="hidden md:flex gap-8 items-center">
        <a href="#hero" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition">หางาน</a>
        <a href="#hero" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition">บริษัท</a>
        <a href="#hero" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition">แนะนำ</a>
        <a href="#hero" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition">สมัครงาน</a>
        <a href="#hero" className="text-slate-600 hover:text-blue-600 text-sm font-medium transition">เกี่ยวกับเรา</a>
      </div>
      <div className="flex gap-3 items-center">
        <button
          onClick={() => navigate("/login")}
          className="text-blue-600 font-semibold px-5 py-2 rounded-lg text-sm transition border border-blue-100 hover:bg-blue-50"
        >
          เข้าสู่ระบบ
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm shadow-lg shadow-blue-200 transition"
        >
          สมัครสมาชิก
        </button>
      </div>
    </nav>
  );
}

// ── HERO ─────────────────────────────────────────────
export function Hero() {
  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-white px-4 py-20">
      {/* Background Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -z-10 opacity-40"></div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="text-left">
          <h1 className="text-6xl font-extrabold text-blue-900 leading-[1.1] mb-6">
            ค้นหางานที่ใช่ <br />
            <span className="text-blue-600">เริ่มต้นเส้นทางอาชีพที่ดี</span>
          </h1>
          <p className="text-slate-500 text-xl max-w-lg mb-10 leading-relaxed">
            รวมตำแหน่งงานจากบริษัทชั้นนำทั่วประเทศ สมัครง่าย ได้งานไว ต้องที่ JobCareers
          </p>

          {/* Search Bar Component */}
          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-2 mb-8 max-w-xl">
            <div className="flex-1 flex items-center px-4 border-b md:border-b-0 md:border-r border-slate-100 py-3 md:py-0">
              <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" placeholder="ตำแหน่งงาน, คำค้นหา" className="w-full outline-none text-slate-700 bg-transparent text-sm" />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 md:py-0">
              <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <select className="w-full outline-none text-slate-400 bg-transparent text-sm appearance-none">
                <option>สถานที่ทำงาน</option>
                <option>กรุงเทพฯ</option>
                <option>เชียงใหม่</option>
              </select>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-blue-200">
              ค้นหางาน
            </button>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-slate-400 text-sm font-medium mr-2">คำค้นหายอดนิยม:</span>
            {["Developer", "Marketing", "Designer", "Sales", "Data Analyst"].map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer border border-transparent hover:border-blue-100">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right content: AI Visualization */}
        <div className="relative hidden lg:block">
          {/* Main Image Mockup Placeholder */}
          <div className="relative z-10 w-full h-[500px] bg-slate-100 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1288&auto=format&fit=crop" alt="Recruitment" className="w-full h-full object-cover" />

            {/* AI Screening Overlay Mockup */}
            <div className="absolute top-10 right-10 left-10 bottom-10 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 p-6 flex flex-col shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-slate-900 font-bold text-xs">AI Resume Screening</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full border border-blue-900 flex items-center justify-center text-[10px] text-blue-900 cursor-pointer">?</div>
                  <div className="w-4 h-4 rounded-full border border-blue-900 flex items-center justify-center text-[10px] text-blue-900 cursor-pointer">x</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-xl border border-slate-50 flex gap-4 items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg overflow-hidden shrink-0">
                  <img src="https://i.pravatar.cc/100?u=jane" alt="Avatar" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm">Jane Smith</h4>
                      <p className="text-slate-400 text-[10px]">Experience : 5 Years</p>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 font-bold text-lg leading-none">95%</span>
                      <p className="text-slate-400 text-[8px] uppercase">Match Score</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Skills Match", val: 96, color: "bg-green-500" },
                  { label: "Experience Match", val: 88, color: "bg-blue-500" },
                  { label: "Education Match", val: 94, color: "bg-blue-500" }
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                      <span>{item.label}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Background floating icons */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center z-20 animate-bounce transition-all">
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-600 rounded-3xl shadow-2xl flex items-center justify-center z-20">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MARQUEE STRIP ─────────────────────────────────────
export function MarqueeStrip() {
  return (
    <div className="bg-slate-50/50 border-y border-slate-100 py-12 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-12 opacity-60">
        <div className="flex items-center gap-4 grayscale">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7.707 3.293a1 1 0 010 1.414L4.414 8h8.879l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.293 12H4.414l3.293 3.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"></path></svg></div>
          <span className="text-xl font-bold text-slate-900 tracking-tighter italic">DeepSeek</span>
        </div>
        <div className="flex items-center gap-4 grayscale">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">L</div>
          <span className="text-xl font-bold text-slate-900 tracking-tighter">Meta Llama 3</span>
        </div>
        <div className="flex items-center gap-4 grayscale">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">T</div>
          <span className="text-xl font-bold text-slate-900 tracking-tighter">Typhoon 2</span>
        </div>
        <div className="flex items-center gap-4 grayscale">
          <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center text-white font-bold">G</div>
          <span className="text-xl font-bold text-slate-900 tracking-tighter">Golang</span>
        </div>
      </div>
    </div>
  );
}

// ── PROBLEM SECTION ───────────────────────────────────
export function ProblemSection() {
  const steps = [
    {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>,
      title: "สมัครง่าย รวดเร็ว",
      desc: "สมัครงานเพียงไม่กี่ขั้นตอน"
    },
    {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>,
      title: "จับคู่ด้วย AI",
      desc: "แนะนำงานที่เหมาะกับคุณ"
    },
    {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
      title: "บริษัทชั้นนำทั่วประเทศ",
      desc: "ร่วมงานกับองค์กรคุณภาพ"
    },
    {
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>,
      title: "พัฒนาทักษะ เพิ่มโอกาส",
      desc: "แหล่งรวมความรู้เพื่ออนาคตของคุณ"
    },
  ]
  return (
    <div className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-5 items-start group">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                {s.icon}
              </div>
              <div>
                <h4 className="text-slate-900 font-bold mb-1 group-hover:text-blue-600 transition-colors">{s.title}</h4>
                <p className="text-slate-500 text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FEATURES ──────────────────────────────────────────
export function Features() {
  return null; // Combined with ProblemSection or Hidden for now to match the clean design
}

// ── FOOTER ────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100 py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">J</div>
            <div className="text-slate-900 font-bold text-xl tracking-tight">JobCareers</div>
          </div>
          <p className="text-slate-500 max-w-sm">
            แพลตฟอร์มหางานยุคใหม่ ขับเคลื่อนด้วย AI อัจฉริยะ เพื่อช่วยคุณค้นหาเส้นทางอาชีพที่ใช่ที่สุด
          </p>
        </div>
        <div>
          <h5 className="text-slate-900 font-bold mb-6">สำหรับผู้หางาน</h5>
          <ul className="space-y-3 text-slate-500 text-sm">
            <li><a href="#" className="hover:text-blue-600 transition">หางานทั่วประเทศ</a></li>
            <li><a href="#" className="hover:text-blue-600 transition">สร้างประวัติฟรี</a></li>
            <li><a href="#" className="hover:text-blue-600 transition">ประเมินทักษะ</a></li>
          </ul>
        </div>
        <div>
          <h5 className="text-slate-900 font-bold mb-6">ผู้พัฒนา</h5>
          <div className="text-slate-500 text-xs space-y-2">
            <p>CPE Pre Cap-Stone Group 12</p>
            <ul className="space-y-1">
              <li>นายภาณุ อุตะโว</li>
              <li>นายเจษฎา เชือดขุนทด</li>
              <li>นายธนัช ตั้งมั่น</li>
              <li>นายอิสรภาพ วาตุรัมย์</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
        <p>© 2026 JobCareers. Developed for CPE Cap-Stone Project.</p>
      </div>
    </footer>
  );
}