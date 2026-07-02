import { useState } from "react";
import { Search, Filter, Sparkles, CheckCircle2, AlertCircle, Eye, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    aiScore: number;
    status: "รอพิจารณา" | "ผ่านการคัดกรอง AI" | "นัดสัมภาษณ์แล้ว" | "ปฏิเสธ";
    appliedDate: string;
}

const mockCandidates: Candidate[] = [
    { id: "1", name: "คุณณภัทร อนันต์", email: "napat@example.com", phone: "081-234-5678", position: "Senior Full-Stack Developer", aiScore: 92, status: "ผ่านการคัดกรอง AI", appliedDate: "29 มิ.ย. 2026" },
    { id: "2", name: "คุณศิรินทรา มีสุข", email: "sirintra@example.com", phone: "089-876-5432", position: "UX/UI Designer", aiScore: 88, status: "นัดสัมภาษณ์แล้ว", appliedDate: "28 มิ.ย. 2026" },
    { id: "3", name: "คุณธนกฤต วงศ์สว่าง", email: "thanakrit@example.com", phone: "086-555-4321", position: "Data Analyst", aiScore: 79, status: "รอพิจารณา", appliedDate: "28 มิ.ย. 2026" },
    { id: "4", name: "คุณปิยะดา รัตนมณี", email: "piyada@example.com", phone: "082-111-2233", position: "HR Business Partner", aiScore: 85, status: "ผ่านการคัดกรอง AI", appliedDate: "27 มิ.ย. 2026" },
    { id: "5", name: "คุณกิตติศักดิ์ พรหมดี", email: "kittisak@example.com", phone: "084-333-4455", position: "Senior Full-Stack Developer", aiScore: 74, status: "รอพิจารณา", appliedDate: "26 มิ.ย. 2026" },
];

export default function CandidatesPage() {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<string>("ทั้งหมด");

    const filtered = mockCandidates.filter(c => {
        const matchSearch = c.name.includes(search) || c.position.includes(search) || c.email.includes(search);
        const matchTab = activeTab === "ทั้งหมด" || c.status === activeTab;
        return matchSearch && matchTab;
    });

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">โปรไฟล์ผู้สมัคร</h1>
                    <p className="text-slate-400 text-sm mt-1">รายชื่อผู้สมัครทั้งหมดและผลการประเมินจาก AI</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/hr/screening"
                        className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200 text-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        คัดกรอง Resume ด้วย AI
                    </Link>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
                    {["ทั้งหมด", "รอพิจารณา", "ผ่านการคัดกรอง AI", "นัดสัมภาษณ์แล้ว"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab
                                ? "bg-indigo-50 text-[#4169E1]"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ, ตำแหน่ง..."
                        className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-48"
                    />
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="py-3.5 px-6">ผู้สมัคร</th>
                                <th className="py-3.5 px-6">ตำแหน่งที่สมัคร</th>
                                <th className="py-3.5 px-6">คะแนน AI</th>
                                <th className="py-3.5 px-6">สถานะ</th>
                                <th className="py-3.5 px-6">วันที่สมัคร</th>
                                <th className="py-3.5 px-6 text-right">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        ไม่พบข้อมูลผู้สมัครที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="py-4 px-6">
                                            <div>
                                                <p className="font-bold text-slate-800">{c.name}</p>
                                                <p className="text-slate-400 text-xs mt-0.5">{c.email} • {c.phone}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-600">{c.position}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${c.aiScore >= 85 ? "bg-emerald-500" : c.aiScore >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                                                        style={{ width: `${c.aiScore}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-xs text-slate-800">{c.aiScore}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.status === "ผ่านการคัดกรอง AI"
                                                ? "bg-emerald-50 text-emerald-600"
                                                : c.status === "นัดสัมภาษณ์แล้ว"
                                                    ? "bg-indigo-50 text-[#4169E1]"
                                                    : "bg-blue-50 text-blue-600"
                                                }`}>
                                                {c.status === "ผ่านการคัดกรอง AI" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-400 text-xs">{c.appliedDate}</td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 text-slate-400 hover:text-[#4169E1] hover:bg-indigo-50 rounded-lg transition-all">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
