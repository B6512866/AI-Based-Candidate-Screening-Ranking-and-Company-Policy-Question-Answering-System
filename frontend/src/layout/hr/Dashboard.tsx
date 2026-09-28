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
    ChevronRight,
    Calendar,
    Clock
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
    linkTo?: string;
}

function StatCard({ label, value, subtext, changePositive = true, icon: Icon, iconBg, iconColor, loading, linkTo }: StatCardProps) {
    const cardContent = (
        <div className={`bg-white rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm border border-slate-100 transition-all duration-200 h-full ${linkTo ? "cursor-pointer group hover:shadow-md hover:border-indigo-200 hover:-translate-y-1" : ""}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider group-hover:text-[#4169E1] transition-colors truncate">{label}</span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${iconBg} shadow-sm group-hover:scale-110 transition-transform shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                </div>
            </div>
            <div className="mt-2 sm:mt-3">
                {loading ? (
                    <div className="h-7 sm:h-8 w-16 sm:w-20 bg-slate-100 rounded-lg animate-pulse my-1" />
                ) : (
                    <p className="text-2xl sm:text-3xl font-black text-slate-800 font-mono tracking-tight group-hover:text-[#4169E1] transition-colors">{value}</p>
                )}
                <div className="flex items-center justify-between mt-1 sm:mt-1.5 gap-1">
                    <p className={`text-[11px] sm:text-xs font-bold flex items-center gap-1 min-w-0 ${changePositive ? "text-emerald-600" : "text-amber-600"}`}>
                        <span className="truncate">{subtext}</span>
                    </p>
                    {linkTo && (
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#4169E1] flex items-center gap-0.5 transition-colors shrink-0">
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    if (linkTo) {
        return (
            <Link to={linkTo} className="block no-underline">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
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
                } else if (st.includes("ผ่าน") || st.includes("รับเข้า") || st.includes("passed") || st.includes("approved") || st.includes("accepted")) {
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
            linkTo: "/hr/positions",
        },
        {
            label: "ผู้สมัครทั้งหมด",
            value: stats.totalApplicants,
            subtext: `${stats.totalApplicants} ใบสมัครที่ยื่นเข้ามา`,
            changePositive: true,
            icon: Users,
            iconBg: "bg-blue-50 border border-blue-100",
            iconColor: "text-blue-600",
            linkTo: "/hr/candidates",
        },
        {
            label: "ผ่านการประเมิน AI",
            value: stats.aiScreened,
            subtext: `${stats.totalApplicants > 0 ? Math.round((stats.aiScreened / stats.totalApplicants) * 100) : 0}% ของผู้สมัครทั้งหมด`,
            changePositive: true,
            icon: Sparkles,
            iconBg: "bg-purple-50 border border-purple-100",
            iconColor: "text-purple-600",
            linkTo: "/hr/screening",
        },
        {
            label: "นัดหมายสัมภาษณ์",
            value: stats.scheduledInterviews,
            subtext: `${stats.scheduledInterviews} รายการในตาราง`,
            changePositive: stats.scheduledInterviews > 0,
            icon: CalendarCheck,
            iconBg: "bg-amber-50 border border-amber-100",
            iconColor: "text-amber-600",
            linkTo: "/hr/interviews",
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Header Banner */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800">
                        ยินดีต้อนรับ คุณ{fullName} 
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        ระบบวิเคราะห์คัดกรองผู้สมัครและคำนวณคะแนนด้วย (HireAI Management System)
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={loadDashboardData}
                        disabled={loading}
                        className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 text-xs font-bold disabled:opacity-50"
                        title="รีเฟรชข้อมูลล่าสุด"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
                        <span>รีเฟรช</span>
                    </button>
                    <Link
                        to="/hr/screening"
                        className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap"
                    >
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>ไปหน้าคัดกรอง AI</span>
                    </Link>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map((stat, i) => (
                    <StatCard key={i} {...stat} loading={loading} />
                ))}
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                    <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4169E1] shrink-0" />
                            <span>สัดส่วนสถานะการคัดกรองผู้สมัคร</span>
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">ภาพรวมสถานะใบสมัครทั้งหมดในระบบ ณ ปัจจุบัน</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                        รวม {stats.totalApplicants} คน
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 py-1 sm:py-2">
                    <Link to="/hr/candidates" className="bg-amber-50/60 hover:bg-amber-100/70 border border-amber-100 rounded-2xl p-3 sm:p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-xs cursor-pointer block no-underline">
                        <span className="text-amber-600 text-[11px] sm:text-xs font-bold block mb-1">รอพิจารณา</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">{stats.statusCounts.pending}</span>
                        <span className="text-[10px] text-amber-500 block mt-1 font-semibold">
                            {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.pending / stats.totalApplicants) * 100) : 0}%
                        </span>
                    </Link>

                    <Link to="/hr/candidates" className="bg-purple-50/60 hover:bg-purple-100/70 border border-purple-100 rounded-2xl p-3 sm:p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-xs cursor-pointer block no-underline">
                        <span className="text-purple-600 text-[11px] sm:text-xs font-bold block mb-1">รอนัดสัมภาษณ์</span>
                        <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">{stats.statusCounts.shortlisted}</span>
                        <span className="text-[10px] text-purple-500 block mt-1 font-semibold">
                            {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.shortlisted / stats.totalApplicants) * 100) : 0}%
                        </span>
                    </Link>

                    <Link to="/hr/interviews" className="bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100 rounded-2xl p-3 sm:p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-xs cursor-pointer block no-underline">
                        <span className="text-blue-600 text-[11px] sm:text-xs font-bold block mb-1">นัดสัมภาษณ์แล้ว</span>
                        <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono">{stats.statusCounts.interview}</span>
                        <span className="text-[10px] text-blue-500 block mt-1 font-semibold">
                            {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.interview / stats.totalApplicants) * 100) : 0}%
                        </span>
                    </Link>

                    <Link to="/hr/candidates" className="bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-100 rounded-2xl p-3 sm:p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-xs cursor-pointer block no-underline">
                        <span className="text-emerald-600 text-[11px] sm:text-xs font-bold block mb-1">ผ่านการคัดเลือก</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">{stats.statusCounts.passed}</span>
                        <span className="text-[10px] text-emerald-500 block mt-1 font-semibold">
                            {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.passed / stats.totalApplicants) * 100) : 0}%
                        </span>
                    </Link>

                    <Link to="/hr/candidates" className="bg-rose-50/60 hover:bg-rose-100/70 border border-rose-100 rounded-2xl p-3 sm:p-4 col-span-2 sm:col-span-1 text-center transition-all hover:-translate-y-0.5 hover:shadow-xs cursor-pointer block no-underline">
                        <span className="text-rose-600 text-[11px] sm:text-xs font-bold block mb-1">ปฏิเสธ</span>
                        <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono">{stats.statusCounts.rejected}</span>
                        <span className="text-[10px] text-rose-500 block mt-1 font-semibold">
                            {stats.totalApplicants > 0 ? Math.round((stats.statusCounts.rejected / stats.totalApplicants) * 100) : 0}%
                        </span>
                    </Link>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1.5 pt-1 sm:pt-2">
                    <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-500">
                        <span>สัดส่วนความคืบหน้า</span>
                        <span>{stats.aiScreened}/{stats.totalApplicants} ประเมิน AI แล้ว</span>
                    </div>
                    <div className="w-full h-3 sm:h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
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

            {/* Mid Section: Positions & Interviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Job Positions List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2">
                                <Briefcase className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4169E1] shrink-0" />
                                <span className="truncate">ตำแหน่งงานที่เปิดรับสมัคร</span>
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">จำนวนผู้สมัครแยกตามตำแหน่งงาน</p>
                        </div>
                        <Link to="/hr/positions" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <span>จัดการตำแหน่ง</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="p-3 sm:p-4 divide-y divide-slate-50 flex-1 max-h-[350px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 text-xs animate-pulse">กำลังโหลดตำแหน่งงาน...</div>
                        ) : jobs.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีตำแหน่งงานในระบบ</div>
                        ) : (
                            jobs.map((pos, i) => {
                                const pId = pos.ID?.toString() || pos.id?.toString();
                                const count = jobApplicantsMap[pId] || 0;
                                return (
                                    <div key={i} className="py-3 px-2 sm:px-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 rounded-2xl transition-all">
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <p className="text-slate-800 font-bold text-sm truncate">{pos.title || pos.Title}</p>
                                            <p className="text-slate-400 text-xs truncate">{pos.department || pos.Department || "ทั่วไป"}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-[#4169E1] border border-indigo-100 whitespace-nowrap">
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
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 shrink-0" />
                                <span className="truncate">การนัดหมายสัมภาษณ์ล่าสุด</span>
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">ตารางนัดสัมภาษณ์ผู้สมัครที่รอนัดหมาย</p>
                        </div>
                        <Link to="/hr/interviews" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <span>ดูตารางทั้งหมด</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="p-3 sm:p-4 divide-y divide-slate-50 flex-1 max-h-[350px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 text-xs animate-pulse">กำลังโหลดตารางสัมภาษณ์...</div>
                        ) : interviews.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีรายการนัดสัมภาษณ์ในระบบ</div>
                        ) : (
                            interviews.slice(0, 5).map((item, i) => {
                                const app = item.application || item.Application;
                                const cand = app?.Candidate || app?.candidate || item.Candidate || item.candidate;
                                const firstName = cand?.first_name || cand?.FirstName || "";
                                const lastName = cand?.last_name || cand?.LastName || "";
                                const rawName = `${firstName} ${lastName}`.trim();
                                const candFullName = rawName && rawName !== "0 0" 
                                    ? rawName 
                                    : (cand?.email || item.candidate_name || "ผู้สมัครงาน");

                                const job = app?.JobPosition || app?.job_position || item.JobPosition || item.job_position;
                                const posTitle = job?.title || job?.Title || app?.position || item.position || "ตำแหน่งงาน";

                                const rawDate = item.interview_datetime || item.InterviewDatetime || item.interview_date || item.CreatedAt;
                                let dateStr = "ไม่ระบุวัน";
                                let timeStr = "";
                                if (rawDate) {
                                    try {
                                        const d = new Date(rawDate);
                                        if (!isNaN(d.getTime())) {
                                            dateStr = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
                                            timeStr = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น.";
                                        }
                                    } catch {
                                        dateStr = String(rawDate);
                                    }
                                }

                                const statusMap: Record<string, string> = {
                                    pending: "รอยืนยัน",
                                    confirmed: "ยืนยันแล้ว",
                                    completed: "เสร็จสิ้น",
                                    cancelled: "ยกเลิก",
                                    rescheduled: "ขอเลื่อนนัด",
                                };

                                const statusBadgeStyles: Record<string, string> = {
                                    "ยืนยันแล้ว": "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    "รอยืนยัน": "bg-amber-50 text-amber-700 border-amber-200",
                                    "ขอเลื่อนนัด": "bg-orange-50 text-orange-700 border-orange-200",
                                    "ยกเลิก": "bg-rose-50 text-rose-700 border-rose-200",
                                    "เสร็จสิ้น": "bg-sky-50 text-sky-700 border-sky-200",
                                };

                                const rawStatus = item.interview_status || item.Interview_Status || item.status || "pending";
                                const thaiStatus = statusMap[rawStatus] || rawStatus;
                                const badgeStyle = statusBadgeStyles[thaiStatus] || "bg-emerald-50 text-emerald-700 border-emerald-200";

                                return (
                                    <Link
                                        key={i}
                                        to="/hr/interviews"
                                        className="py-3 px-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer group no-underline"
                                    >
                                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4169E1] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                                {candFullName.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <p className="text-slate-800 font-bold text-sm truncate group-hover:text-[#4169E1] transition-colors">{candFullName}</p>
                                                <p className="text-slate-400 text-xs truncate">{posTitle}</p>
                                            </div>
                                            {/* Badge shown in top row on mobile */}
                                            <div className="sm:hidden shrink-0">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle} whitespace-nowrap`}>
                                                    {thaiStatus}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 pl-11 sm:pl-3 shrink-0">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{dateStr}</span>
                                            </div>
                                            {timeStr && (
                                                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#4169E1] whitespace-nowrap">
                                                    <Clock className="w-3 h-3 text-[#4169E1]" />
                                                    <span>{timeStr}</span>
                                                </div>
                                            )}
                                            {/* Badge shown on desktop */}
                                            <div className="hidden sm:block">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle} whitespace-nowrap`}>
                                                    {thaiStatus}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Candidates */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2">
                            <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4169E1] shrink-0" />
                            <span className="truncate">ผู้สมัครงานล่าสุดในระบบ</span>
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">รายชื่อผู้สมัครที่ยื่นเข้ามาล่าสุด พร้อมคะแนนประเมิน AI</p>
                    </div>
                    <Link to="/hr/candidates" className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <span>ดูผู้สมัครทั้งหมด ({stats.totalApplicants})</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {/* Mobile View: Clean Card List (md:hidden) */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="py-8 text-center text-slate-400 text-xs animate-pulse">กำลังโหลดข้อมูลผู้สมัคร...</div>
                    ) : candidates.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีผู้สมัครงานในระบบ</div>
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
                                <Link
                                    key={i}
                                    to="/hr/candidates"
                                    className="p-4 flex flex-col gap-2.5 hover:bg-slate-50/70 transition-all block no-underline"
                                >
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4169E1] font-bold text-sm flex items-center justify-center shrink-0">
                                                {name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-slate-800 font-bold text-sm truncate">{name}</p>
                                                <p className="text-slate-400 text-xs truncate">{cand.email || "-"}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${status.includes("ผ่าน")
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : status.includes("สัมภาษณ์")
                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                : status.includes("ไม่ผ่าน")
                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                            {status.includes("ผ่าน") ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-xs">
                                        <div className="text-slate-600 font-medium truncate flex-1">
                                            <span className="text-slate-400">ตำแหน่ง: </span>
                                            <span className="font-semibold text-slate-700">{position}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-slate-400 text-[11px]">AI:</span>
                                            <span className={`px-2 py-0.5 rounded-md font-bold text-xs font-mono ${score >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : score >= 50 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                                                {score} PTS
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right text-[11px] text-slate-400 font-medium">
                                        วันที่ยื่นสมัคร: {dateStr}
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>

                {/* Desktop View: Full Table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
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
