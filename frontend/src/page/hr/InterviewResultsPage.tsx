import { JSX, useState, useEffect, useMemo } from "react";
import {
    Award, CheckCircle2, XCircle, Search, Clock, Sparkles,
    Mail, Calendar, Video, MapPin, Phone,
    Edit3, Send, Loader2, X, Eye, FileText,
    TrendingUp, RefreshCw, UserCheck
} from "lucide-react";
import {
    getAllInterviews, notifyInterviewResult, updateInterviewScore
} from "../../services/interviewService";

// ── Helpers & Maps ──────────────────────────────────────────────────
const formatIcons: Record<string, JSX.Element> = {
    online: <Video className="w-3.5 h-3.5 text-indigo-500" />,
    onsite: <MapPin className="w-3.5 h-3.5 text-rose-500" />,
    phone: <Phone className="w-3.5 h-3.5 text-teal-500" />,
};

const formatLabels: Record<string, string> = {
    online: "Video Call",
    onsite: "On-site",
    phone: "Phone Interview",
};

function formatThaiDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น.";
    } catch {
        return dateStr;
    }
}

// ── Reusable Modal ──────────────────────────────────────────────────
function Modal({ open, onClose, children, title, maxWidth = "max-w-xl", footer }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string | React.ReactNode;
    maxWidth?: string;
    footer?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />
            <div
                className={`relative bg-white rounded-3xl shadow-2xl ${maxWidth} w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-[slideUp_0.3s_ease] z-10 border border-slate-100`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                    <div className="text-base font-black text-slate-800 flex items-center gap-2">{title}</div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
export default function InterviewResultsPage() {
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPosition, setFilterPosition] = useState("ทั้งหมด");
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    // Modal state for Notify Result
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
    const [resultType, setResultType] = useState<"passed" | "failed">("passed");
    const [interviewerScore, setInterviewerScore] = useState<string>("");
    const [resultNotes, setResultNotes] = useState("");
    const [resultEmailContent, setResultEmailContent] = useState("");
    const [resultEmailTab, setResultEmailTab] = useState<"edit" | "preview">("edit");
    const [sendingResult, setSendingResult] = useState(false);

    // Quick edit score modal
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [savingScore, setSavingScore] = useState(false);

    // Success feedback modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [lastResultType, setLastResultType] = useState<"passed" | "failed">("passed");

    // ── Fetch interviews ──
    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const res = await getAllInterviews();
            if (res?.data) {
                setInterviews(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch interviews:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, []);

    // ── Positions list for filter dropdown ──
    const positionList = useMemo(() => {
        const set = new Set<string>();
        interviews.forEach(iv => {
            const pos = iv.Application?.JobPosition?.title || iv.application?.JobPosition?.title || iv.Application?.position || iv.application?.position;
            if (pos) set.add(pos);
        });
        return ["ทั้งหมด", ...Array.from(set)];
    }, [interviews]);

    // ── Filtered list ──
    const filteredInterviews = useMemo(() => {
        return interviews.filter(iv => {
            const cand = iv.application?.Candidate || iv.Application?.Candidate;
            const job = iv.application?.JobPosition || iv.Application?.JobPosition;
            const candName = `${cand?.first_name || ""} ${cand?.last_name || ""}`.toLowerCase();
            const jobTitle = (job?.title || iv.Application?.position || iv.application?.position || "").toLowerCase();
            const appCode = `app-${10000 + (iv.ApplicationID || iv.application_id || 0)}`.toLowerCase();

            // Search filter
            const matchSearch =
                candName.includes(searchTerm.toLowerCase()) ||
                jobTitle.includes(searchTerm.toLowerCase()) ||
                appCode.includes(searchTerm.toLowerCase());

            // Position filter
            const pos = job?.title || iv.Application?.position || iv.application?.position || "";
            const matchPosition = filterPosition === "ทั้งหมด" || pos === filterPosition;

            // Status filter
            let matchStatus = true;
            if (filterStatus === "รอแจ้งผล") {
                matchStatus = !iv.interview_result;
            } else if (filterStatus === "ผ่านการสัมภาษณ์") {
                matchStatus = iv.interview_result === "passed";
            } else if (filterStatus === "ไม่ผ่านการสัมภาษณ์") {
                matchStatus = iv.interview_result === "failed";
            } else if (filterStatus === "รับทราบแล้ว") {
                matchStatus = !!iv.result_acknowledged;
            }

            return matchSearch && matchPosition && matchStatus;
        });
    }, [interviews, searchTerm, filterPosition, filterStatus]);

    // ── Statistics ──
    const stats = useMemo(() => {
        const total = interviews.length;
        const pending = interviews.filter(i => !i.interview_result).length;
        const passed = interviews.filter(i => i.interview_result === "passed").length;
        const failed = interviews.filter(i => i.interview_result === "failed").length;
        const acknowledged = interviews.filter(i => i.result_acknowledged).length;
        return { total, pending, passed, failed, acknowledged };
    }, [interviews]);

    // ── Open Notify Modal ──
    const handleOpenNotifyModal = (iv: any) => {
        setSelectedInterview(iv);
        setResultType(iv.interview_result === "failed" ? "failed" : "passed");
        setInterviewerScore(
            iv.interviewer_score !== null && iv.interviewer_score !== undefined
                ? String(iv.interviewer_score)
                : ""
        );
        setResultNotes(iv.result_notes || "");
        setResultEmailContent("");
        setResultEmailTab("edit");
        setShowResultModal(true);
    };

    // ── Open Quick Edit Score Modal ──
    const handleOpenScoreModal = (iv: any) => {
        setSelectedInterview(iv);
        setInterviewerScore(
            iv.interviewer_score !== null && iv.interviewer_score !== undefined
                ? String(iv.interviewer_score)
                : ""
        );
        setResultNotes(iv.result_notes || "");
        setShowScoreModal(true);
    };

    // ── Submit Result & Send Email ──
    const handleSendResult = async () => {
        if (!selectedInterview) return;

        const scoreNum = interviewerScore.trim() !== "" ? parseFloat(interviewerScore) : null;
        if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
            alert("กรุณาระบุคะแนนผู้สัมภาษณ์ระหว่าง 0 ถึง 100");
            return;
        }

        setSendingResult(true);
        try {
            await notifyInterviewResult(
                selectedInterview.ID,
                resultType,
                resultNotes,
                resultEmailContent,
                scoreNum
            );
            setLastResultType(resultType);
            setShowResultModal(false);
            setSuccessMessage(
                resultType === "passed"
                    ? "ส่งอีเมลแจ้งผล \"ผ่านการสัมภาษณ์\" ให้ผู้สมัครเรียบร้อยแล้ว"
                    : "ส่งอีเมลแจ้งผล \"ไม่ผ่านการสัมภาษณ์\" ให้ผู้สมัครเรียบร้อยแล้ว"
            );
            setShowSuccessModal(true);
            fetchInterviews();
        } catch (err: any) {
            alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการส่งแจ้งผลสัมภาษณ์");
        } finally {
            setSendingResult(false);
        }
    };

    // ── Save Score Only ──
    const handleSaveScoreOnly = async () => {
        if (!selectedInterview) return;

        const scoreNum = interviewerScore.trim() !== "" ? parseFloat(interviewerScore) : null;
        if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
            alert("กรุณาระบุคะแนนผู้สัมภาษณ์ระหว่าง 0 ถึง 100");
            return;
        }

        setSavingScore(true);
        try {
            await updateInterviewScore(selectedInterview.ID, {
                interviewer_score: scoreNum,
                result_notes: resultNotes,
            });
            setShowScoreModal(false);
            fetchInterviews();
        } catch (err: any) {
            alert(err.response?.data?.error || "ไม่สามารถบันทึกคะแนนได้");
        } finally {
            setSavingScore(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* ═══════════ HEADER ══════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 rounded-2xl bg-indigo-50 text-[#4169E1]">
                            <Award className="w-6 h-6" />
                        </span>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">แจ้งผลการสัมภาษณ์</h1>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium ml-1">
                        บันทึกผลการประเมิน ตรวจสอบคะแนน AI เทียบกับคะแนนผู้สัมภาษณ์ และส่งอีเมลแจ้งผลให้ผู้สมัครกดยืนยันรับทราบ
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchInterviews}
                        disabled={loading}
                        className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#4169E1]" : ""}`} />
                        รีเฟรชข้อมูล
                    </button>
                </div>
            </div>

            {/* ═══════════ KPI STATS CARDS ══════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* Total */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4169E1] flex-shrink-0">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">นัดหมายทั้งหมด</p>
                        <p className="text-2xl font-black text-slate-800 mt-0.5">{stats.total}</p>
                    </div>
                </div>

                {/* Pending Evaluation */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รอแจ้งผล</p>
                        <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.pending}</p>
                    </div>
                </div>

                {/* Passed */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ผ่านสัมภาษณ์</p>
                        <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.passed}</p>
                    </div>
                </div>

                {/* Failed */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ไม่ผ่านเกณฑ์</p>
                        <p className="text-2xl font-black text-rose-600 mt-0.5">{stats.failed}</p>
                    </div>
                </div>

                {/* Acknowledged */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รับทราบแล้ว</p>
                        <p className="text-2xl font-black text-teal-600 mt-0.5">{stats.acknowledged}</p>
                    </div>
                </div>
            </div>

            {/* ═══════════ SEARCH & FILTER BAR ══════════════════════════ */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้สมัคร, ตำแหน่ง, รหัส APP-..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:border-[#4169E1] transition-all"
                    />
                </div>

                {/* Dropdown Filters */}
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
                    {/* Position Filter */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-[11px] font-bold text-slate-400 uppercase whitespace-nowrap">ตำแหน่ง:</span>
                        <select
                            value={filterPosition}
                            onChange={e => setFilterPosition(e.target.value)}
                            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 cursor-pointer"
                        >
                            {positionList.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-[11px] font-bold text-slate-400 uppercase whitespace-nowrap">สถานะ:</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 cursor-pointer"
                        >
                            <option value="ทั้งหมด">ทั้งหมด</option>
                            <option value="รอแจ้งผล">รอแจ้งผล</option>
                            <option value="ผ่านการสัมภาษณ์">ผ่านสัมภาษณ์</option>
                            <option value="ไม่ผ่านการสัมภาษณ์">ไม่ผ่านเกณฑ์</option>
                            <option value="รับทราบแล้ว">ผู้สมัครรับทราบแล้ว</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ═══════════ TABLE SECTION ════════════════════════════════ */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้สมัคร / ใบสมัคร</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ตำแหน่งงาน</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                                    <span className="inline-flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                        คะแนน AI
                                    </span>
                                </th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                                    <span className="inline-flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                                        คะแนนผู้สัมภาษณ์
                                    </span>
                                </th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">วัน-เวลานัด</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">ผลการตัดสิน</th>
                                <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-slate-400 text-sm font-medium">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#4169E1] mb-2" />
                                        กำลังโหลดข้อมูลการสัมภาษณ์...
                                    </td>
                                </tr>
                            ) : filteredInterviews.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-slate-400 text-sm font-medium">
                                        <Award className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                                        ไม่พบข้อมูลการสัมภาษณ์ที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filteredInterviews.map(iv => {
                                    const app = iv.Application || iv.application;
                                    const cand = app?.Candidate;
                                    const job = app?.JobPosition;
                                    const aiScore = app?.ai_score ?? app?.AIScore ?? app?.AIScreening?.skill_score ?? null;
                                    const humanScore = iv.interviewer_score;

                                    return (
                                        <tr key={iv.ID} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Candidate & App Code */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4169E1] to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                                                        {(cand?.first_name || "?")[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight">
                                                            {cand?.first_name} {cand?.last_name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-[10px] font-bold text-[#4169E1] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                APP-{10000 + (iv.ApplicationID || app?.ID || 0)}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                                                {cand?.email || "-"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Job Position */}
                                            <td className="px-5 py-4">
                                                <p className="text-xs font-bold text-slate-700">
                                                    {job?.title || app?.position || "-"}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {job?.department || "แผนกงานองค์กร"}
                                                </p>
                                            </td>

                                            {/* AI Score */}
                                            <td className="px-5 py-4 text-center">
                                                {aiScore !== null && aiScore !== undefined ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 shadow-sm ${
                                                            aiScore >= 75
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : aiScore >= 50
                                                                    ? "bg-indigo-50 text-[#4169E1] border-indigo-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}>
                                                            <Sparkles className="w-3 h-3" />
                                                            {Number(aiScore).toFixed(0)} / 100
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 mt-0.5 font-medium">คะแนนวิเคราะห์ AI</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 font-medium">-</span>
                                                )}
                                            </td>

                                            {/* Human Interviewer Score */}
                                            <td className="px-5 py-4 text-center">
                                                <div className="inline-flex flex-col items-center group">
                                                    {humanScore !== null && humanScore !== undefined ? (
                                                        <button
                                                            onClick={() => handleOpenScoreModal(iv)}
                                                            className="px-2.5 py-1 rounded-xl text-xs font-black border bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-300 shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                                                            title="คลิกเพื่อแก้ไขคะแนน"
                                                        >
                                                            {Number(humanScore).toFixed(0)} / 100
                                                            <Edit3 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenScoreModal(iv)}
                                                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 hover:text-[#4169E1] bg-slate-100 hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            ใส่คะแนน
                                                        </button>
                                                    )}
                                                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">คะแนนผู้สัมภาษณ์</span>
                                                </div>
                                            </td>

                                            {/* Interview Date & Time */}
                                            <td className="px-5 py-4 text-xs font-medium text-slate-700">
                                                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatThaiDate(iv.interview_datetime)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                                    {formatIcons[iv.format]}
                                                    <span>{formatTime(iv.interview_datetime)}</span>
                                                    <span>&bull;</span>
                                                    <span>{formatLabels[iv.format] || iv.format}</span>
                                                </div>
                                            </td>

                                            {/* Result Status */}
                                            <td className="px-5 py-4 text-center">
                                                {iv.interview_result === "passed" ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            ผ่านการสัมภาษณ์
                                                        </span>
                                                        {iv.result_acknowledged ? (
                                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded-md">
                                                                ✓ ผู้สมัครรับทราบแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                รอผู้สมัครรับทราบ
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : iv.interview_result === "failed" ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            ไม่ผ่านการสัมภาษณ์
                                                        </span>
                                                        {iv.result_acknowledged ? (
                                                            <span className="text-[10px] text-rose-500 font-bold bg-rose-100/50 px-2 py-0.5 rounded-md">
                                                                ✓ ผู้สมัครรับทราบแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                รอผู้สมัครรับทราบ
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        รอแจ้งผล
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action Button */}
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => handleOpenNotifyModal(iv)}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer ${
                                                        iv.interview_result
                                                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                            : "bg-gradient-to-r from-[#4169E1] to-indigo-600 text-white hover:shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
                                                    }`}
                                                >
                                                    <Award className="w-3.5 h-3.5" />
                                                    {iv.interview_result ? "แก้ไข/ส่งผลอีกครั้ง" : "แจ้งผลสัมภาษณ์"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════ MODAL: แจ้งผลสัมภาษณ์ ═════════════════════════ */}
            <Modal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                title={
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#4169E1]" />
                        <span>ประเมินและส่งอีเมลแจ้งผลสัมภาษณ์</span>
                    </div>
                }
                maxWidth="max-w-2xl"
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowResultModal(false)}
                            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={sendingResult}
                            onClick={handleSendResult}
                            className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                resultType === "passed"
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200/50 hover:shadow-emerald-300"
                                    : "bg-gradient-to-r from-indigo-600 to-[#4169E1] shadow-indigo-200/50 hover:shadow-indigo-300"
                            }`}
                        >
                            {sendingResult ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่งอีเมลแจ้งผล...</>
                            ) : (
                                <><Send className="w-4 h-4" /> ส่งอีเมลแจ้งผลสัมภาษณ์</>
                            )}
                        </button>
                    </div>
                }
            >
                {selectedInterview && (
                    <div className="space-y-5">
                        {/* Candidate Summary Card */}
                        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-[#4169E1] text-white font-black flex items-center justify-center text-base shadow-sm">
                                    {(selectedInterview.Application?.Candidate?.first_name || "?")[0]}
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-800">
                                        {selectedInterview.Application?.Candidate?.first_name} {selectedInterview.Application?.Candidate?.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-semibold">
                                        ตำแหน่ง: {selectedInterview.Application?.JobPosition?.title || selectedInterview.Application?.position || "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right font-mono text-xs font-bold text-[#4169E1] bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-xs">
                                APP-{10000 + (selectedInterview.ApplicationID || 0)}
                            </div>
                        </div>

                        {/* Scores Comparison (AI vs Human) */}
                        <div className="grid grid-cols-2 gap-3.5">
                            {/* AI Score Display */}
                            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
                                <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs mb-1">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    <span>คะแนนวิเคราะห์จาก AI</span>
                                </div>
                                <p className="text-2xl font-black text-indigo-900 mt-1">
                                    {selectedInterview.Application?.ai_score ?? selectedInterview.Application?.AIScore ?? "-"}
                                    <span className="text-xs font-semibold text-indigo-600 ml-1">/ 100</span>
                                </p>
                                <p className="text-[11px] text-indigo-600/80 mt-1 font-medium">
                                    ประเมินทักษะ Resume อัตโนมัติ
                                </p>
                            </div>

                            {/* Human Interviewer Score Input */}
                            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100">
                                <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs mb-1">
                                    <TrendingUp className="w-4 h-4 text-teal-600" />
                                    <span>คะแนนจากผู้สัมภาษณ์ (มนุษย์)</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="เช่น 85"
                                        value={interviewerScore}
                                        onChange={e => setInterviewerScore(e.target.value)}
                                        className="w-24 bg-white border border-teal-200 rounded-xl px-3 py-1.5 text-lg font-black text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-300 text-center"
                                    />
                                    <span className="text-xs font-bold text-teal-700">/ 100 คะแนน</span>
                                </div>
                                <p className="text-[11px] text-teal-600/80 mt-1 font-medium">
                                    กรอกคะแนนที่ได้จากการสัมภาษณ์
                                </p>
                            </div>
                        </div>

                        {/* Result Selection Toggle */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                ผลการตัดสินการสัมภาษณ์ <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setResultType("passed")}
                                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black border-2 transition-all cursor-pointer ${
                                        resultType === "passed"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100"
                                            : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                                    }`}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    ผ่านการสัมภาษณ์
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResultType("failed")}
                                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black border-2 transition-all cursor-pointer ${
                                        resultType === "failed"
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100"
                                            : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                                    }`}
                                >
                                    <XCircle className="w-5 h-5" />
                                    ไม่ผ่านการสัมภาษณ์
                                </button>
                            </div>
                        </div>

                        {/* Interviewer Notes */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                หมายเหตุ / ความเห็นจากการสัมภาษณ์ (ไม่บังคับ)
                            </label>
                            <textarea
                                value={resultNotes}
                                onChange={e => setResultNotes(e.target.value)}
                                rows={3}
                                placeholder="เช่น ทักษะการสื่อสารดีเยี่ยม, ความรู้ด้านเทคนิคตรงตามเป้าหมาย..."
                                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none transition-all leading-relaxed"
                            />
                        </div>

                        {/* Email Content Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    เนื้อหาอีเมลแจ้งผล
                                </label>
                                <div className="flex bg-slate-100 rounded-xl p-1">
                                    <button
                                        type="button"
                                        onClick={() => setResultEmailTab("edit")}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            resultEmailTab === "edit" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        <Edit3 className="w-3 h-3 inline mr-1" /> แก้ไขข้อความ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResultEmailTab("preview")}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            resultEmailTab === "preview" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        <Eye className="w-3 h-3 inline mr-1" /> ตัวอย่างอีเมล
                                    </button>
                                </div>
                            </div>

                            {resultEmailTab === "edit" ? (
                                <textarea
                                    value={resultEmailContent}
                                    onChange={e => setResultEmailContent(e.target.value)}
                                    rows={4}
                                    placeholder={
                                        resultType === "passed"
                                            ? "(เว้นว่าง = ใช้ข้อความเริ่มต้น) เช่น: ยินดีด้วยครับ คุณผ่านการสัมภาษณ์สำหรับตำแหน่งนี้..."
                                            : "(เว้นว่าง = ใช้ข้อความเริ่มต้น) เช่น: ขอบคุณที่ให้ความสนใจและสละเวลาเข้าร่วมสัมภาษณ์..."
                                    }
                                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none transition-all leading-relaxed"
                                />
                            ) : (
                                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 min-h-[110px] text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {resultEmailContent || (
                                        <span className="text-slate-400 italic">
                                            {resultType === "passed"
                                                ? "(ข้อความเริ่มต้น) ยินดีด้วย คุณผ่านการสัมภาษณ์สำหรับตำแหน่งนี้เรียบร้อยแล้ว ทีมงานยินดีต้อนรับคุณเข้าสู่ขั้นตอนถัดไป โดยฝ่ายบุคคลจะติดต่อกลับเพื่อแจ้งรายละเอียดเพิ่มเติม"
                                                : "(ข้อความเริ่มต้น) ขอบคุณที่ให้ความสนใจและสละเวลาเข้าร่วมสัมภาษณ์ หลังจากพิจารณาอย่างรอบคอบแล้ว เราเสียใจที่ต้องแจ้งว่าคุณยังไม่ผ่านเกณฑ์การคัดเลือกในรอบนี้"
                                            }
                                        </span>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {resultEmailContent ? "ใช้เนื้อหาที่คุณพิมพ์เอง" : "เว้นว่าง = ใช้ข้อความทางการของระบบ (แนะนำ)"}
                            </p>
                        </div>

                        {/* Instructions Alert */}
                        <div className={`rounded-2xl p-3.5 flex items-start gap-2.5 ${
                            resultType === "passed"
                                ? "bg-emerald-50/70 border border-emerald-200/80 text-emerald-800"
                                : "bg-indigo-50/70 border border-indigo-200/80 text-indigo-800"
                        }`}>
                            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed font-medium">
                                ผู้สมัครจะได้รับอีเมลพร้อมปุ่ม <b>"ยืนยันรับทราบผลการสัมภาษณ์"</b> เมื่อผู้สมัครกดปุ่มและยืนยันรับทราบ สถานะในตารางจะอัปเดตเป็น <b>"✓ ผู้สมัครรับทราบแล้ว"</b> โดยอัตโนมัติ
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══════════ MODAL: แก้ไขคะแนนอย่างรวดเร็ว (Score Only) ═════ */}
            <Modal
                open={showScoreModal}
                onClose={() => setShowScoreModal(false)}
                title="บันทึกคะแนนผู้สัมภาษณ์"
                maxWidth="max-w-md"
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowScoreModal(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={savingScore}
                            onClick={handleSaveScoreOnly}
                            className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {savingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                            บันทึกคะแนน
                        </button>
                    </div>
                }
            >
                {selectedInterview && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <p className="font-bold text-slate-800">
                                {selectedInterview.Application?.Candidate?.first_name} {selectedInterview.Application?.Candidate?.last_name}
                            </p>
                            <p className="text-slate-500">
                                {selectedInterview.Application?.JobPosition?.title || selectedInterview.Application?.position || "-"}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                คะแนนที่ผู้สัมภาษณ์ให้ (0-100)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="เช่น 85"
                                value={interviewerScore}
                                onChange={e => setInterviewerScore(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-200 text-center"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                หมายเหตุ / บันทึกย่อ
                            </label>
                            <textarea
                                value={resultNotes}
                                onChange={e => setResultNotes(e.target.value)}
                                rows={3}
                                placeholder="บันทึกความเห็นเกี่ยวกับผู้สมัคร..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 resize-none"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══════════ MODAL: ส่งผลสำเร็จ ═══════════════════════════ */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowSuccessModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-[slideUp_0.3s_ease] z-10 border border-slate-100">
                        <div className={`px-6 py-8 text-center ${
                            lastResultType === "passed"
                                ? "bg-gradient-to-br from-emerald-50 to-white"
                                : "bg-gradient-to-br from-indigo-50 to-white"
                        }`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                                lastResultType === "passed"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-indigo-100 text-indigo-600"
                            }`}>
                                <Mail className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">ส่งอีเมลแจ้งผลสำเร็จ!</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {successMessage}
                            </p>

                            <div className={`rounded-2xl p-3 flex items-start gap-2.5 mt-4 text-left ${
                                lastResultType === "passed"
                                    ? "bg-emerald-50/70 border border-emerald-100 text-emerald-800"
                                    : "bg-indigo-50/70 border border-indigo-100 text-indigo-800"
                            }`}>
                                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed font-medium">
                                    เมื่อผู้สมัครกดยืนยันรับทราบผลในอีเมล ระบบจะเปลี่ยนสถานะเป็น <b>"✓ ผู้สมัครรับทราบแล้ว"</b> ให้ทันที
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowSuccessModal(false)}
                                className={`w-full py-3 mt-5 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer ${
                                    lastResultType === "passed"
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                                }`}
                            >
                                ตกลง / เรียบร้อย
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
