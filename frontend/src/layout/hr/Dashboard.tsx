import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Users, Briefcase, CalendarCheck, Clock, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

// ──────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: number;
    change: string;
    changePositive?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
}

function StatCard({ label, value, change, changePositive = true, icon: Icon, iconBg, iconColor }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm font-medium">{label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                    <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                </div>
            </div>
            <div>
                <p className="text-3xl font-black text-slate-800">{value}</p>
                <p className={`text-xs font-semibold mt-1 ${changePositive ? "text-emerald-500" : "text-amber-500"}`}>
                    {change}
                </p>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Dashboard Main Component
// ──────────────────────────────────────────────
export default function HRDashboard() {
    const { firstName, lastName } = useAuth();
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "HR Admin";

    const stats: StatCardProps[] = [
        {
            label: "ตำแหน่งงานที่เปิดอยู่",
            value: 6,
            change: "+6 จากเดือนที่แล้ว",
            changePositive: true,
            icon: Briefcase,
            iconBg: "bg-indigo-50",
            iconColor: "text-[#4169E1]",
        },
        {
            label: "ผู้สมัคร รอพิจารณา",
            value: 105,
            change: "+10 จากสัปดาห์ที่แล้ว",
            changePositive: true,
            icon: Users,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-500",
        },
        {
            label: "ผู้สมัคร คุณสมบัติผ่านเกณฑ์",
            value: 50,
            change: "+2 จากสัปดาห์ที่แล้ว",
            changePositive: true,
            icon: Users,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-500",
        },
        {
            label: "ผู้สมัคร รอสัมภาษณ์",
            value: 3,
            change: "นัดถอยหลัง 5 วัน",
            changePositive: false,
            icon: CalendarCheck,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-500",
        },
    ];

    const mockPositions = [
        { title: "Senior Full-Stack Developer", department: "IT & Tech", applicants: 28, status: "เปิดรับสมัคร" },
        { title: "HR Business Partner", department: "Human Resources", applicants: 14, status: "เปิดรับสมัคร" },
        { title: "UX/UI Designer", department: "Product Design", applicants: 35, status: "เปิดรับสมัคร" },
    ];

    const mockInterviews = [
        { candidate: "คุณสมชาย ใจดี", position: "Senior Full-Stack Developer", time: "10:30 น.", date: "วันนี้", status: "ยืนยันแล้ว" },
        { candidate: "คุณวิภาวรรณ สุขเสริฐ", position: "UX/UI Designer", time: "14:00 น.", date: "วันนี้", status: "รอตอบรับ" },
        { candidate: "คุณกิตติศักดิ์ พรหมดี", position: "HR Business Partner", time: "11:00 น.", date: "พรุ่งนี้", status: "ยืนยันแล้ว" },
    ];

    const mockCandidates = [
        { name: "คุณณภัทร อนันต์", position: "Senior Full-Stack Developer", score: 92, status: "ผ่านการคัดกรอง AI", date: "29 มิ.ย. 2026" },
        { name: "คุณศิรินทรา มีสุข", position: "UX/UI Designer", score: 88, status: "รอสัมภาษณ์", date: "28 มิ.ย. 2026" },
        { name: "คุณธนกฤต วงศ์สว่าง", position: "Data Analyst", score: 79, status: "รอพิจารณา", date: "28 มิ.ย. 2026" },
        { name: "คุณปิยะดา รัตนมณี", position: "HR Business Partner", score: 85, status: "ผ่านการคัดกรอง AI", date: "27 มิ.ย. 2026" },
    ];

    return (
        <div className="p-8 space-y-6">
            {/* Welcome Banner */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">
                        ยินดีต้อนรับ คุณ{fullName}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">ระบบจัดสรรทรัพยากรบุคคลอัจฉริยะ (HireAI Management System)</p>
                </div>
                <div className="hidden md:flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4169E1] to-[#4834d4] items-center justify-center shadow-md shadow-indigo-200">
                    <Clock className="w-7 h-7 text-white" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {/* Mid sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Positions list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-slate-800 font-bold text-base">ตำแหน่งงานที่เปิดรับ</h3>
                        <Link to="/hr/positions" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                            ดูทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="p-4 divide-y divide-slate-50 flex-1">
                        {mockPositions.map((pos, i) => (
                            <div key={i} className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/50 rounded-xl transition-all">
                                <div>
                                    <p className="text-slate-800 font-bold text-sm">{pos.title}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{pos.department}</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#4169E1]">
                                        {pos.applicants} ผู้สมัคร
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interviews list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-slate-800 font-bold text-base">นัดหมายสัมภาษณ์ล่าสุด</h3>
                        <Link to="/hr/interviews" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                            ดูทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="p-4 divide-y divide-slate-50 flex-1">
                        {mockInterviews.map((item, i) => (
                            <div key={i} className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/50 rounded-xl transition-all">
                                <div>
                                    <p className="text-slate-800 font-bold text-sm">{item.candidate}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{item.position}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-700 font-bold text-xs">{item.date} • {item.time}</p>
                                    <span className={`inline-block text-[11px] font-medium mt-0.5 ${item.status === "ยืนยันแล้ว" ? "text-emerald-500" : "text-amber-500"}`}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom section: Candidates table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-slate-800 font-bold text-base">ผู้สมัครล่าสุด</h3>
                        <p className="text-slate-400 text-xs mt-0.5">รายชื่อผู้สมัครที่ผ่านการคัดกรองเบื้องต้น</p>
                    </div>
                    <Link to="/hr/candidates" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                        ดูผู้สมัครทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="py-3.5 px-6">ชื่อ-นามสกุล</th>
                                <th className="py-3.5 px-6">ตำแหน่งที่สมัคร</th>
                                <th className="py-3.5 px-6">คะแนนประเมิน AI</th>
                                <th className="py-3.5 px-6">สถานะ</th>
                                <th className="py-3.5 px-6 text-right">วันที่สมัคร</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                            {mockCandidates.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-4 px-6 font-bold text-slate-800">{c.name}</td>
                                    <td className="py-4 px-6 text-slate-600">{c.position}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${c.score >= 85 ? "bg-emerald-500" : "bg-blue-500"}`}
                                                    style={{ width: `${c.score}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-xs text-slate-800">{c.score}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.status.includes("ผ่าน")
                                            ? "bg-emerald-50 text-emerald-600"
                                            : c.status.includes("สัมภาษณ์")
                                                ? "bg-amber-50 text-amber-600"
                                                : "bg-blue-50 text-blue-600"
                                            }`}>
                                            {c.status.includes("ผ่าน") ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-slate-400 text-xs">{c.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
