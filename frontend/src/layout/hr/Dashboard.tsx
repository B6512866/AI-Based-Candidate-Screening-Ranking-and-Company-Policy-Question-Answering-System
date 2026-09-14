import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    Users,
    Briefcase,
    CalendarCheck,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    TrendingUp,
    RefreshCw,
    Award,
    ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { getalljobs } from "../../services/jobPositionService";
import apiClient from "../../services/apiClient";

// ──────────────────────────────────────────────
// Stat Card Component
// ──────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: number | string;
    subtext: string;
    changePositive?: boolean;
    icon: any;
    iconBg: string;
    iconColor: string;
    loading?: boolean;
}

function StatCard({ label, value, subtext, changePositive = true, icon: Icon, iconBg, iconColor, loading }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl p-5 flex flex-col justify-between shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-slate-200">
            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} shadow-sm`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            </div>
            <div className="mt-3">
                {loading ? (
                    <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse my-1" />
                ) : (
                    <p className="text-3xl font-black text-slate-800 font-mono tracking-tight">{value}</p>
                )}
                <p className={`text-xs font-bold mt-1.5 flex items-center gap-1 ${changePositive ? "text-emerald-600" : "text-amber-600"}`}>
                    <span>{subtext}</span>
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

    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalJobs: 0,
        totalApplicants: 0,
        aiScreened: 0,
        scheduledInterviews: 0,
        avgScore: 0,
        statusCounts: {
            pending: 0,
            shortlisted: 0,
            interview: 0,
            passed: 0,
            rejected: 0,
        }
    });

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [resJobs, resCandidates, resInterviews] = await Promise.all([
                getalljobs().catch(() => ({ data: [] })),
                apiClient.get("/interviews/candidates").catch(() => ({ data: { data: [] } })),
                apiClient.get("/interviews").catch(() => ({ data: { data: [] } }))
            ]);

            const rawJobs = resJobs?.data || resJobs || [];
            const jobsList = Array.isArray(rawJobs) ? rawJobs : [];
            setJobs(jobsList);

            const rawCand = resCandidates?.data?.data || resCandidates?.data || [];
            const candidateList = Array.isArray(rawCand) ? rawCand : [];
            setCandidates(candidateList);

            const rawInt = resInterviews?.data?.data || resInterviews?.data || [];
            const interviewList = Array.isArray(rawInt) ? rawInt : [];
            setInterviews(interviewList);

            // Compute statistics
            let aiScreenedCount = 0;
            let totalScoreSum = 0;
            let scoredCount = 0;
            let pendingCount = 0;
            let shortlistedCount = 0;
            let interviewCount = 0;
            let passedCount = 0;
            let rejectedCount = 0;

            candidateList.forEach((app: any) => {
                const aiScr = app.AIScreening || app.ai_screening;
                const score = aiScr?.skill_score || app.AIScore || app.ai_score || 0;
                
                if (aiScr || score > 0) {
                    aiScreenedCount++;
                    totalScoreSum += score;
                    scoredCount++;
                }

                const st = (app.status || "รอพิจารณา").toLowerCase();
                if (st.includes("รอนัดสัมภาษณ์") || st.includes("shortlisted")) {
                    shortlistedCount++;
                } else if (st.includes("สัมภาษณ์") || st.includes("interview")) {
                    interviewCount++;
                } else if (st.includes("ผ่าน") || st.includes("รับเข้า") || st.includes("passed") || st.includes("approved")) {
                    passedCount++;
                } else if (st.includes("ไม่ผ่าน") || st.includes("ปฏิเสธ") || st.includes("rejected")) {
                    rejectedCount++;
                } else {
                    pendingCount++;
                }
            });

            setStats({
                totalJobs: jobsList.length,
                totalApplicants: candidateList.length,
                aiScreened: aiScreenedCount,
                scheduledInterviews: interviewList.length || interviewCount,
                avgScore: scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0,
                statusCounts: {
                    pending: pendingCount,
                    shortlisted: shortlistedCount,
                    interview: interviewCount,
                    passed: passedCount,
                    rejected: rejectedCount,
                }
            });
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Job position applicant count map
    const jobApplicantsMap: Record<string, number> = {};
    candidates.forEach((app: any) => {
        const jobId = app.JobPositionID || app.job_position_id || app.JobPosition?.ID || app.JobPosition?.id;
        if (jobId) {
            const key = jobId.toString();
            jobApplicantsMap[key] = (jobApplicantsMap[key] || 0) + 1;
        }
    });

    const statCards: StatCardProps[] = [
        {
            label: "ตำแหน่งงานที่เปิดรับ",
            value: stats.totalJobs,
            subtext: `${stats.totalJobs} ตำแหน่งในระบบ`,
            changePositive: true,
            icon: Briefcase,
            iconBg: "bg-indigo-50 border border-indigo-100",
            iconColor: "text-[#4169E1]",
        },
        {
            label: "ผู้สมัครทั้งหมด",
            value: stats.totalApplicants,
            subtext: `${stats.totalApplicants} ใบสมัครที่ยื่นเข้ามา`,
            changePositive: true,
            icon: Users,
            iconBg: "bg-blue-50 border border-blue-100",
            iconColor: "text-blue-600",
        },
        {
            label: "ผ่านการประเมิน AI",
            value: stats.aiScreened,
            subtext: `${stats.totalApplicants > 0 ? Math.round((stats.aiScreened / stats.totalApplicants) * 100) : 0}% ของผู้สมัครทั้งหมด`,
            changePositive: true,
            icon: Sparkles,
            iconBg: "bg-purple-50 border border-purple-100",
            iconColor: "text-purple-600",
        },
        {
            label: "นัดหมายสัมภาษณ์",
            value: stats.scheduledInterviews,
            subtext: `${stats.scheduledInterviews} รายการในตาราง`,
            changePositive: stats.scheduledInterviews > 0,
            icon: CalendarCheck,
            iconBg: "bg-amber-50 border border-amber-100",
            iconColor: "text-amber-600",
        },
    ];

    return (
        <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Banner */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-50 text-[#4169E1] text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> AI Executive Overview
                        </span>
                        <span className="text-slate-400 text-xs font-medium">อัปเดตข้อมูลล่าสุด</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                        ยินดีต้อนรับ คุณ{fullName} 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        ระบบวิเคราะห์คัดกรองผู้สมัครและคำนวณคะแนนด้วย Typhoon AI (HireAI Management System)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDashboardData}
                        disabled={loading}
                        className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold disabled:opacity-50"
                        title="รีเฟรชข้อมูลล่าสุด"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        <span>รีเฟรชข้อมูล</span>
                    </button>
                    <Link
                        to="/hr/screening"
                        className="px-5 py-3 rounded-2xl bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>ไปหน้าคัดกรอง AI</span>
                    </Link>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <StatCard key={i} {...stat} loading={loading} />
                ))}
            </div>

            {/* Status Overview & AI Score Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Status Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-4.5 h-4.5 text-[#4169E1]" />
                                สัดส่วนสถานะการคัดกรองผู้สมัคร
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">ภาพรวมสถานะใบสมัครทั้งหมดในระบบ ณ ปัจจุบัน</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            รวม {stats.totalApplicants} คน
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 py-2">
                        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5 text-center">
                            <span className="text-amber-600 text-xs font-bold block mb-1">รอพิจารณา</span>
                            <span className="text-2xl font-black text-amber-700 font-mono">{stats.statusCounts.pending}</span>
                            <span className="text-[10px] text-amber-500 block mt-1 font-semibold">
                                {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.pending / stats.totalApplicants) * 100) : 0}%
                            </span>
                        </div>

                        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 text-center">
                            <span className="text-purple-600 text-xs font-bold block mb-1">รอนัดสัมภาษณ์</span>
                            <span className="text-2xl font-black text-purple-700 font-mono">{stats.statusCounts.shortlisted}</span>
                            <span className="text-[10px] text-purple-500 block mt-1 font-semibold">
                                {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.shortlisted / stats.totalApplicants) * 100) : 0}%
                            </span>
                        </div>

                        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 text-center">
                            <span className="text-blue-600 text-xs font-bold block mb-1">นัดสัมภาษณ์แล้ว</span>
                            <span className="text-2xl font-black text-blue-700 font-mono">{stats.statusCounts.interview}</span>
                            <span className="text-[10px] text-blue-500 block mt-1 font-semibold">
                                {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.interview / stats.totalApplicants) * 100) : 0}%
                            </span>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 text-center">
                            <span className="text-emerald-600 text-xs font-bold block mb-1">ผ่านการคัดเลือก</span>
                            <span className="text-2xl font-black text-emerald-700 font-mono">{stats.statusCounts.passed}</span>
                            <span className="text-[10px] text-emerald-500 block mt-1 font-semibold">
                                {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.passed / stats.totalApplicants) * 100) : 0}%
                            </span>
                        </div>

                        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 sm:col-span-1 col-span-2 text-center">
                            <span className="text-rose-600 text-xs font-bold block mb-1">ปฏิเสธ</span>
                            <span className="text-2xl font-black text-rose-700 font-mono">{stats.statusCounts.rejected}</span>
                            <span className="text-[10px] text-rose-500 block mt-1 font-semibold">
                                {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.rejected / stats.totalApplicants) * 100) : 0}%
                            </span>
                        </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>สัดส่วนความคืบหน้า</span>
                            <span>{stats.aiScreened}/{stats.totalApplicants} ประเมิน AI แล้ว</span>
                        </div>
                        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
                            {stats.totalApplicants > 0 && (
                                <>
                                    <div
                                        style={{ width: `${(stats.statusCounts.passed / stats.totalApplicants) * 100}%` }}
                                        className="bg-emerald-500 h-full rounded-l-full transition-all"
                                        title="ผ่านการคัดเลือก"
                                    />
                                    <div
                                        style={{ width: `${(stats.statusCounts.interview / stats.totalApplicants) * 100}%` }}
                                        className="bg-blue-500 h-full transition-all"
                                        title="นัดสัมภาษณ์แล้ว"
                                    />
                                    <div
                                        style={{ width: `${(stats.statusCounts.shortlisted / stats.totalApplicants) * 100}%` }}
                                        className="bg-purple-500 h-full transition-all"
                                        title="รอนัดสัมภาษณ์"
                                    />
                                    <div
                                        style={{ width: `${(stats.statusCounts.pending / stats.totalApplicants) * 100}%` }}
                                        className="bg-amber-400 h-full transition-all"
                                        title="รอพิจารณา"
                                    />
                                    <div
                                        style={{ width: `${(stats.statusCounts.rejected / stats.totalApplicants) * 100}%` }}
                                        className="bg-rose-400 h-full rounded-r-full transition-all"
                                        title="ปฏิเสธ"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Score Average Banner */}
                <div className="bg-gradient-to-br from-[#4169E1] to-[#3152c4] text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="space-y-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-white/80 text-xs font-bold uppercase tracking-wider block">คะแนนเฉลี่ย AI ทั้งหมด</span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-5xl font-black font-mono tracking-tight">{stats.avgScore}</span>
                                <span className="text-xl font-bold text-white/80">/ 100 PTS</span>
                            </div>
                        </div>
                        <p className="text-white/80 text-xs leading-relaxed">
                            คะแนนรวมจากการวิเคราะห์เกณฑ์ Resume ผู้สมัครทั้งหมดด้วย Typhoon AI 2.5
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/15 flex items-center justify-between relative z-10">
                        <span className="text-xs font-medium text-white/90">ประเมินแล้ว {stats.aiScreened} คน</span>
                        <Link
                            to="/hr/candidates"
                            className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                        >
                            ดูผู้สมัคร <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mid Section: Positions & Interviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Positions List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-800 font-bold text-base flex items-center gap-2">
                                <Briefcase className="w-4.5 h-4.5 text-[#4169E1]" />
                                ตำแหน่งงานที่เปิดรับสมัคร
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">จำนวนผู้สมัครแยกตามตำแหน่งงาน</p>
                        </div>
                        <Link to="/hr/positions" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                            จัดการตำแหน่ง <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="p-4 divide-y divide-slate-50 flex-1 max-h-[350px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 text-xs animate-pulse">กำลังโหลดตำแหน่งงาน...</div>
                        ) : jobs.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีตำแหน่งงานในระบบ</div>
                        ) : (
                            jobs.map((pos, i) => {
                                const pId = pos.ID?.toString() || pos.id?.toString();
                                const count = jobApplicantsMap[pId] || 0;
                                return (
                                    <div key={i} className="py-3.5 px-3 flex items-center justify-between hover:bg-slate-50/60 rounded-2xl transition-all">
                                        <div className="space-y-0.5">
                                            <p className="text-slate-800 font-bold text-sm">{pos.title || pos.Title}</p>
                                            <p className="text-slate-400 text-xs">{pos.department || pos.Department || "ทั่วไป"}</p>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-[#4169E1] border border-indigo-100">
                                                {count} ผู้สมัคร
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Interviews List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-800 font-bold text-base flex items-center gap-2">
                                <CalendarCheck className="w-4.5 h-4.5 text-amber-500" />
                                การนัดหมายสัมภาษณ์ล่าสุด
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">ตารางนัดสัมภาษณ์ผู้สมัครที่รอนัดหมาย</p>
                        </div>
                        <Link to="/hr/interviews" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                            ดูตารางทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="p-4 divide-y divide-slate-50 flex-1 max-h-[350px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 text-xs animate-pulse">กำลังโหลดตารางสัมภาษณ์...</div>
                        ) : interviews.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีรายการนัดสัมภาษณ์ในระบบ</div>
                        ) : (
                            interviews.slice(0, 5).map((item, i) => {
                                const candName = item.Candidate?.first_name || item.candidate_name || "ผู้สมัครงาน";
                                const posTitle = item.JobPosition?.title || item.position || "ตำแหน่งงาน";
                                const dateStr = item.interview_date || item.CreatedAt
                                    ? new Date(item.interview_date || item.CreatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
                                    : "ไม่ระบุ";

                                return (
                                    <div key={i} className="py-3.5 px-3 flex items-center justify-between hover:bg-slate-50/60 rounded-2xl transition-all">
                                        <div className="space-y-0.5">
                                            <p className="text-slate-800 font-bold text-sm">{candName}</p>
                                            <p className="text-slate-400 text-xs">{posTitle}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-700 font-bold text-xs">{dateStr}</p>
                                            <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                                                {item.status || "ยืนยันแล้ว"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Candidates Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-slate-800 font-bold text-base flex items-center gap-2">
                            <Users className="w-4.5 h-4.5 text-[#4169E1]" />
                            ผู้สมัครงานล่าสุดในระบบ
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">รายชื่อผู้สมัครที่ยื่นเข้ามาล่าสุด พร้อมคะแนนประเมิน AI</p>
                    </div>
                    <Link to="/hr/candidates" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1">
                        ดูผู้สมัครทั้งหมด ({stats.totalApplicants}) <ArrowUpRight className="w-3.5 h-3.5" />
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
                                <th className="py-3.5 px-6 text-right">วันที่ยื่นสมัคร</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                        กำลังโหลดข้อมูลผู้สมัคร...
                                    </td>
                                </tr>
                            ) : candidates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                        ยังไม่มีผู้สมัครงานในระบบ
                                    </td>
                                </tr>
                            ) : (
                                candidates.slice(0, 6).map((app, i) => {
                                    const cand = app.Candidate || app.candidate || {};
                                    const rawName = `${cand.first_name || cand.FirstName || ""} ${cand.last_name || cand.LastName || ""}`.trim();
                                    const name = rawName && rawName !== "0 0" ? rawName : cand.email || "ไม่ระบุชื่อ";
                                    const position = app.JobPosition?.title || app.position || "ไม่ระบุตำแหน่ง";
                                    const aiScr = app.AIScreening || app.ai_screening;
                                    const score = aiScr?.skill_score || app.AIScore || app.ai_score || 0;
                                    const status = app.status || "รอพิจารณา";
                                    const dateStr = app.created_at || app.CreatedAt
                                        ? new Date(app.created_at || app.CreatedAt).toLocaleDateString("th-TH", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                        })
                                        : "ไม่ระบุ";

                                    return (
                                        <tr key={i} className="hover:bg-slate-50/60 transition-all">
                                            <td className="py-4 px-6 font-bold text-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4169E1] font-bold text-sm flex items-center justify-center shrink-0">
                                                        {name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-800 font-bold">{name}</p>
                                                        <p className="text-slate-400 text-xs">{cand.email || "-"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 font-medium">{position}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-20 bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-xs font-mono text-slate-800">{score} PTS</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.includes("ผ่าน")
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : status.includes("สัมภาษณ์")
                                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                        : status.includes("ไม่ผ่าน")
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}>
                                                    {status.includes("ผ่าน") ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right text-slate-400 text-xs font-medium">{dateStr}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
