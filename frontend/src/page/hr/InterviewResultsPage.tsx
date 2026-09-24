import { JSX, useState, useEffect, useMemo } from "react";
import {
    Award, CheckCircle2, XCircle, Search, Clock, Sparkles,
    Mail, Calendar, Video, MapPin, Phone,
    Edit3, Send, Loader2, X, Eye,
    RefreshCw, UserCheck, Check,
} from "lucide-react";
import {
    getAllInterviews, notifyInterviewResult, updateInterviewScore
} from "../../services/interviewService";
import { useAuth } from "../../context/AuthContext";
import { buildResultEmailContent } from "../../components/interview/interviewTemplates";

// ── Helpers & Format Maps ──────────────────────────────────────────────
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

const formatPillStyles: Record<string, string> = {
    online: "bg-indigo-50/80 text-indigo-700 border-indigo-100",
    onsite: "bg-rose-50/80 text-rose-700 border-rose-100",
    phone: "bg-teal-50/80 text-teal-700 border-teal-100",
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

function getInterviewCandDetails(iv: any) {
    if (!iv) return { candName: "ผู้สมัคร", jobTitle: "ตำแหน่งงาน", candEmail: "-" };
    const app = iv.Application || iv.application;
    const cand = app?.Candidate || iv.Candidate;
    const job = app?.JobPosition || iv.JobPosition;
    const candName = cand?.first_name ? `${cand.first_name} ${cand.last_name || ""}`.trim() : (iv.candidate_name || "ผู้สมัคร");
    const jobTitle = job?.title || app?.position || iv.position || "-";
    const candEmail = cand?.email || iv.candidate_email || "-";
    return { candName, jobTitle, candEmail };
}

// ── Reusable Modal Component ──────────────────────────────────────────
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-[fadeIn_0.2s_ease]" />
            <div
                className={`relative bg-white rounded-3xl shadow-2xl ${maxWidth} w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)] z-10 border border-slate-100`}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 flex-shrink-0">
                    <div className="text-base font-black text-slate-800 flex items-center gap-2.5">
                        {title}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        title="ปิดหน้าต่าง"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5">
                    {children}
                </div>

                {/* Modal Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex-shrink-0 backdrop-blur-sm">
                        {footer}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: InterviewResultsPage
// ══════════════════════════════════════════════════════════════════════
export default function InterviewResultsPage() {
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPosition, setFilterPosition] = useState("ทั้งหมด");
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    // Inline score editing state
    const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
    const [scoreErrors, setScoreErrors] = useState<Record<number, string>>({});
    const [savingScoreId, setSavingScoreId] = useState<number | null>(null);
    const [savedScoreId, setSavedScoreId] = useState<number | null>(null);

    // Modal state for Notify Result
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
    const [resultType, setResultType] = useState<"passed" | "failed">("passed");
    const [interviewerScore, setInterviewerScore] = useState<string>("");
    const [resultEmailContent, setResultEmailContent] = useState("");
    const [resultEmailTab, setResultEmailTab] = useState<"edit" | "preview">("edit");
    const [sendingResult, setSendingResult] = useState(false);

    // HR Information for email signature
    const { firstName, lastName } = useAuth();
    const hrFullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || "ฝ่ายทรัพยากรบุคคล (HR Recruitment Team)";
    const hrTel = "02-123-4567";
    const hrMobile = "081-234-5678";
    const hrEmail = "hr@hireai-recruitment.com";

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
    const handleOpenNotifyModal = (iv: any) => {
        setSelectedInterview(iv);
        const initialType = iv.interview_result === "failed" ? "failed" : "passed";
        setResultType(initialType);
        const currentScore = scoreInputs[iv.ID] !== undefined
            ? scoreInputs[iv.ID]
            : (iv.interviewer_score !== null && iv.interviewer_score !== undefined ? String(iv.interviewer_score) : "");
        setInterviewerScore(currentScore);

        const { candName, jobTitle } = getInterviewCandDetails(iv);
        setResultEmailContent(
            buildResultEmailContent({
                result: initialType,
                candidateName: candName,
                position: jobTitle,
                hrName: hrFullName,
                hrTel,
                hrMobile,
                hrEmail,
            })
        );
        setResultEmailTab("edit");
        setShowResultModal(true);
    };

    // ── Switch Result Type in Modal ──
    const handleSwitchResultType = (newType: "passed" | "failed") => {
        setResultType(newType);
        if (selectedInterview) {
            const { candName, jobTitle } = getInterviewCandDetails(selectedInterview);
            setResultEmailContent(
                buildResultEmailContent({
                    result: newType,
                    candidateName: candName,
                    position: jobTitle,
                    hrName: hrFullName,
                    hrTel,
                    hrMobile,
                    hrEmail,
                })
            );
        }
    };

    // ── Positions list for filter dropdown ──
    const positionList = useMemo(() => {
        const set = new Set<string>();
        interviews.forEach(iv => {
            const pos = iv.Application?.JobPosition?.title || iv.application?.JobPosition?.title || iv.Application?.position || iv.application?.position;
            if (pos) set.add(pos);
        });
        return ["ทั้งหมด", ...Array.from(set)];
    }, [interviews]);

    // ── Filtered list (Search by Candidate Name ONLY) ──
    const filteredInterviews = useMemo(() => {
        return interviews.filter(iv => {
            const cand = iv.application?.Candidate || iv.Application?.Candidate;
            const candName = `${cand?.first_name || ""} ${cand?.last_name || ""}`.toLowerCase();

            // Search by Candidate Name only
            const q = searchTerm.toLowerCase().trim();
            const matchSearch = !q || candName.includes(q);

            // Position filter
            const job = iv.application?.JobPosition || iv.Application?.JobPosition;
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

    // ── Quick Filter Toggle from KPI cards ──
    const handleStatCardClick = (statusKey: string) => {
        if (filterStatus === statusKey) {
            setFilterStatus("ทั้งหมด");
        } else {
            setFilterStatus(statusKey);
        }
    };

    // ── Inline Score Editing Handlers ──
    const handleInlineScoreChange = (id: number, val: string, originalVal?: number | null) => {
        if (val === "") {
            setScoreInputs(prev => ({ ...prev, [id]: "" }));
            setScoreErrors(prev => ({ ...prev, [id]: "" }));
            return;
        }

        const num = parseFloat(val);
        // If score is invalid (<0 or >100): reset to 0 or original value, and show red error message
        if (isNaN(num) || num < 0 || num > 100) {
            const fallback = originalVal !== null && originalVal !== undefined ? String(originalVal) : "0";
            setScoreInputs(prev => ({ ...prev, [id]: fallback }));
            setScoreErrors(prev => ({ ...prev, [id]: "กรุณาระบุคะแนนระหว่าง 0 ถึง 100" }));
            return;
        }

        // Valid score
        setScoreInputs(prev => ({ ...prev, [id]: val }));
        setScoreErrors(prev => ({ ...prev, [id]: "" }));
    };

    const handleInlineScoreSave = async (id: number, currentVal?: number | null) => {
        const rawVal = scoreInputs[id] !== undefined
            ? scoreInputs[id]
            : (currentVal !== null && currentVal !== undefined ? String(currentVal) : "");
        const trimmed = rawVal.trim();

        if (trimmed === "") {
            return;
        }

        const num = parseFloat(trimmed);
        if (isNaN(num) || num < 0 || num > 100) {
            const fallback = currentVal !== null && currentVal !== undefined ? String(currentVal) : "0";
            setScoreInputs(prev => ({ ...prev, [id]: fallback }));
            setScoreErrors(prev => ({ ...prev, [id]: "กรุณาระบุคะแนนระหว่าง 0 ถึง 100" }));
            return;
        }

        // Clear error
        setScoreErrors(prev => ({ ...prev, [id]: "" }));

        // If score didn't change, no need to call API
        if (currentVal === num) return;

        setSavingScoreId(id);
        try {
            await updateInterviewScore(id, { interviewer_score: num });
            setSavedScoreId(id);
            setTimeout(() => setSavedScoreId(null), 2000);
            setInterviews(prev => prev.map(iv => iv.ID === id ? { ...iv, interviewer_score: num } : iv));
        } catch (err: any) {
            alert(err.response?.data?.error || "ไม่สามารถบันทึกคะแนนได้");
        } finally {
            setSavingScoreId(null);
        }
    };

    // ── Submit Result & Send Email ──
    const handleSendResult = async () => {
        if (!selectedInterview) return;

        const scoreNum = interviewerScore.trim() !== ""
            ? parseFloat(interviewerScore)
            : (selectedInterview.interviewer_score ?? null);

        setSendingResult(true);
        try {
            await notifyInterviewResult(
                selectedInterview.ID,
                resultType,
                "", // notes removed as requested
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

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
            {/* ═══════════ INTERACTIVE KPI STAT CARDS ════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* 1. All Interviews */}
                <button
                    type="button"
                    onClick={() => setFilterStatus("ทั้งหมด")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        filterStatus === "ทั้งหมด"
                            ? "bg-white border-[#4169E1] ring-2 ring-[#4169E1]/15 shadow-md"
                            : "bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4169E1] transition-transform group-hover:scale-105">
                            <Calendar className="w-5 h-5" />
                        </div>
                        {filterStatus === "ทั้งหมด" && (
                            <span className="text-[10px] font-bold text-[#4169E1] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">นัดหมายทั้งหมด</p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-0.5">{stats.total}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">ผู้สัมภาษณ์ในระบบทั้งหมด</p>
                    </div>
                </button>

                {/* 2. Pending Decision */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("รอแจ้งผล")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        filterStatus === "รอแจ้งผล"
                            ? "bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-amber-200/80 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 transition-transform group-hover:scale-105">
                            <Clock className="w-5 h-5" />
                        </div>
                        {stats.pending > 0 && (
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รอแจ้งผล</p>
                        <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight mt-0.5">{stats.pending}</p>
                        <p className="text-[10px] text-amber-600/80 font-semibold mt-1">คลิกเพื่อดูรายการที่ต้องแจ้ง</p>
                    </div>
                </button>

                {/* 3. Passed */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ผ่านการสัมภาษณ์")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        filterStatus === "ผ่านการสัมภาษณ์"
                            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-emerald-200/80 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-105">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        {filterStatus === "ผ่านการสัมภาษณ์" && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ผ่านสัมภาษณ์</p>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">{stats.passed}</p>
                        <p className="text-[10px] text-emerald-600/80 font-medium mt-1">ส่งผลผ่านเกณฑ์แล้ว</p>
                    </div>
                </button>

                {/* 4. Failed */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ไม่ผ่านการสัมภาษณ์")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        filterStatus === "ไม่ผ่านการสัมภาษณ์"
                            ? "bg-white border-rose-400 ring-2 ring-rose-400/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-rose-200/80 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 transition-transform group-hover:scale-105">
                            <XCircle className="w-5 h-5" />
                        </div>
                        {filterStatus === "ไม่ผ่านการสัมภาษณ์" && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ไม่ผ่านเกณฑ์</p>
                        <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight mt-0.5">{stats.failed}</p>
                        <p className="text-[10px] text-rose-600/80 font-medium mt-1">ส่งผลไม่ผ่านแล้ว</p>
                    </div>
                </button>

                {/* 5. Acknowledged */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("รับทราบแล้ว")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group col-span-2 lg:col-span-1 ${
                        filterStatus === "รับทราบแล้ว"
                            ? "bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-teal-200/80 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 transition-transform group-hover:scale-105">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        {filterStatus === "รับทราบแล้ว" && (
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รับทราบแล้ว</p>
                        <p className="text-2xl sm:text-3xl font-black text-teal-600 tracking-tight mt-0.5">{stats.acknowledged}</p>
                        <p className="text-[10px] text-teal-600/80 font-medium mt-1">ผู้สมัครกดยืนยันในอีเมล</p>
                    </div>
                </button>
            </div>

            {/* ═══════════ SEARCH & FILTER CARD (WITH REFRESH BUTTON) ════ */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Search Candidate Name & Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                    {/* Search Input: Candidates Only */}
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้สมัคร..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all font-medium"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                title="ล้างคำค้นหา"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Position Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">ตำแหน่งงาน:</span>
                        <select
                            value={filterPosition}
                            onChange={e => setFilterPosition(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all cursor-pointer max-w-[180px] truncate"
                        >
                            {positionList.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">สถานะ:</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all cursor-pointer"
                        >
                            <option value="ทั้งหมด">ทั้งหมด</option>
                            <option value="รอแจ้งผล">รอแจ้งผล</option>
                            <option value="ผ่านการสัมภาษณ์">ผ่านสัมภาษณ์</option>
                            <option value="ไม่ผ่านการสัมภาษณ์">ไม่ผ่านเกณฑ์</option>
                            <option value="รับทราบแล้ว">รับทราบแล้ว</option>
                        </select>
                    </div>
                </div>

                {/* Right: Counter & Refresh Button */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                        ทั้งหมด {filteredInterviews.length} รายการ
                    </span>
                    <button
                        onClick={fetchInterviews}
                        disabled={loading}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm hover:shadow whitespace-nowrap"
                        title="รีเฟรชข้อมูลตารางเวลาสัมภาษณ์"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#4169E1]" : "text-slate-500"}`} />
                        <span>รีเฟรชข้อมูล</span>
                    </button>
                </div>
            </div>

            {/* ═══════════ TABLE SECTION ════════════════════════════════ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/70">
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    ผู้สมัคร / ตำแหน่งงาน
                                </th>
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                    คะแนน AI
                                </th>
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                    คะแนนผู้สัมภาษณ์
                                </th>
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    วัน-เวลานัด & รูปแบบ
                                </th>
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                    ผลการตัดสิน
                                </th>
                                <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                    การจัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-slate-400 text-sm font-medium">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4169E1]">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            </div>
                                            <p className="font-semibold text-slate-600">กำลังโหลดข้อมูลผลการสัมภาษณ์...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInterviews.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-slate-400 text-sm font-medium">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                                <Award className="w-7 h-7 stroke-[1.5]" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-base">ไม่พบข้อมูลการสัมภาษณ์ที่ตรงกับเงื่อนไข</p>
                                                <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเปลี่ยนตัวกรองสถานะ</p>
                                            </div>
                                        </div>
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
                                        <tr key={iv.ID} className="hover:bg-indigo-50/20 transition-colors group">
                                            {/* Column 1: ผู้สมัคร, ตำแหน่งงาน และแผนก (รวมกันเหมือนหน้านัดสัมภาษณ์) */}
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                                                    {cand?.first_name} {cand?.last_name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono text-[10px] font-bold text-[#4169E1] bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                                                        {app?.application_code || app?.ApplicationCode || iv.Application?.application_code || iv.Application?.ApplicationCode || `APP-${10000 + (iv.ApplicationID || app?.ID || 0)}`}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                                        {cand?.email || "-"}
                                                    </span>
                                                </div>
                                                {(() => {
                                                    const rawTitle = job?.title || app?.position || iv.position || "-";
                                                    const match = rawTitle.match(/^(.*?)\s*(\(.*?\))$/);
                                                    const mainTitle = match ? match[1] : rawTitle;
                                                    const subTitle = match ? match[2] : "";
                                                    const dept = job?.department;

                                                    return (
                                                        <div className="mt-1 space-y-0.5">
                                                            <p className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
                                                                {mainTitle}
                                                            </p>
                                                            {subTitle && (
                                                                <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                                                    {subTitle}
                                                                </p>
                                                            )}
                                                            {dept && (
                                                                <p className="text-[10px] text-slate-400 font-normal">
                                                                    {dept}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* AI Score */}
                                            <td className="px-5 py-4.5 text-center">
                                                {aiScore !== null && aiScore !== undefined ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <div className={`px-3 py-1.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 shadow-xs ${
                                                            aiScore >= 75
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : aiScore >= 50
                                                                    ? "bg-indigo-50 text-[#4169E1] border-indigo-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}>
                                                            <Sparkles className="w-3 h-3" />
                                                            <span>{Number(aiScore).toFixed(0)}</span>
                                                            <span className="text-[10px] font-normal opacity-70">/100</span>
                                                        </div>
                                                        <div className="w-16 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    aiScore >= 75
                                                                        ? "bg-emerald-500"
                                                                        : aiScore >= 50
                                                                            ? "bg-[#4169E1]"
                                                                            : "bg-amber-500"
                                                                }`}
                                                                style={{ width: `${Math.min(100, Math.max(0, Number(aiScore)))}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">วิเคราะห์ทักษะ AI</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-xs text-slate-300 font-medium">-</span>
                                                        <span className="text-[9px] text-slate-300 mt-0.5">ไม่มีข้อมูล</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Human Interviewer Score (Inline direct input with out-of-bounds reset and error warning) */}
                                            <td className="px-5 py-4.5 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <div className={`flex items-center bg-white border rounded-xl px-2.5 py-1.5 transition-all shadow-2xs ${
                                                        scoreErrors[iv.ID]
                                                            ? "border-rose-400 ring-2 ring-rose-100"
                                                            : "border-slate-200 hover:border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200/60"
                                                    }`}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            placeholder="-"
                                                            value={
                                                                scoreInputs[iv.ID] !== undefined
                                                                    ? scoreInputs[iv.ID]
                                                                    : (humanScore !== null && humanScore !== undefined ? String(humanScore) : "")
                                                            }
                                                            onChange={e => handleInlineScoreChange(iv.ID, e.target.value, humanScore)}
                                                            onBlur={() => handleInlineScoreSave(iv.ID, humanScore)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") {
                                                                    (e.target as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                            className="w-12 text-center text-xs font-black text-teal-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            title="พิมพ์คะแนน (0-100)"
                                                        />
                                                        <span className="text-[11px] font-bold text-slate-400 select-none">/ 100</span>
                                                        {savingScoreId === iv.ID ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 ml-1.5 flex-shrink-0" />
                                                        ) : savedScoreId === iv.ID ? (
                                                            <Check className="w-3.5 h-3.5 text-teal-600 ml-1.5 flex-shrink-0" />
                                                        ) : (
                                                            <Edit3 className="w-2.5 h-2.5 text-slate-300 ml-1.5 flex-shrink-0 pointer-events-none" />
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 mt-1 font-medium">กรอกคะแนนได้ทันที</span>
                                                    {scoreErrors[iv.ID] && (
                                                        <span className="text-[10px] text-rose-500 font-bold mt-0.5 text-center leading-tight">
                                                            {scoreErrors[iv.ID]}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Interview Date & Time */}
                                            <td className="px-5 py-4.5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{formatThaiDate(iv.interview_datetime)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span>{formatTime(iv.interview_datetime)}</span>
                                                    </div>
                                                    <div className="mt-0.5">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${formatPillStyles[iv.format] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                            {formatIcons[iv.format]}
                                                            <span>{formatLabels[iv.format] || iv.format}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Result Status */}
                                            <td className="px-5 py-4.5 text-center">
                                                {iv.interview_result === "passed" ? (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            ผ่านการสัมภาษณ์
                                                        </span>
                                                        {iv.result_acknowledged ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                                                <Check className="w-3 h-3" />
                                                                ผู้สมัครรับทราบแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                รอผู้สมัครรับทราบ
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : iv.interview_result === "failed" ? (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-black bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            ไม่ผ่านการสัมภาษณ์
                                                        </span>
                                                        {iv.result_acknowledged ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-100/60 px-2 py-0.5 rounded-md border border-rose-200/60">
                                                                <Check className="w-3 h-3" />
                                                                ผู้สมัครรับทราบแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                รอผู้สมัครรับทราบ
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        รอแจ้งผล
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action Button */}
                                            <td className="px-5 py-4.5 text-center">
                                                <button
                                                    onClick={() => handleOpenNotifyModal(iv)}
                                                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer ${
                                                        iv.interview_result
                                                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200"
                                                            : "bg-gradient-to-r from-[#4169E1] to-indigo-600 text-white hover:shadow-md hover:shadow-indigo-200/60 active:scale-[0.98]"
                                                    }`}
                                                >
                                                    {iv.interview_result ? (
                                                        <>
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                            <span>แก้ไข / ส่งอีกครั้ง</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-3.5 h-3.5" />
                                                            <span>แจ้งผลสัมภาษณ์</span>
                                                        </>
                                                    )}
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
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4169E1] flex items-center justify-center">
                            <Award className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800">ประเมินและส่งอีเมลแจ้งผลสัมภาษณ์</p>
                        </div>
                    </div>
                }
                maxWidth="max-w-2xl"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowResultModal(false)}
                            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={sendingResult}
                            onClick={handleSendResult}
                            className={`flex-2 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                resultType === "passed"
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200/60 hover:shadow-emerald-300"
                                    : "bg-gradient-to-r from-red-600 to-red-700 shadow-red-200/60 hover:shadow-red-300"
                            }`}
                        >
                            {sendingResult ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>กำลังส่งอีเมลแจ้งผล...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>ส่งอีเมลแจ้งผลสัมภาษณ์</span>
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                {selectedInterview && (() => {
                    const app = selectedInterview.Application || selectedInterview.application;
                    const cand = app?.Candidate || selectedInterview.Candidate;
                    const job = app?.JobPosition || selectedInterview.JobPosition;
                    const candName = cand?.first_name ? `${cand.first_name} ${cand.last_name || ""}` : (selectedInterview.candidate_name || "ผู้สมัคร");
                    const candEmail = cand?.email || selectedInterview.candidate_email || "-";
                    const jobTitle = job?.title || app?.position || selectedInterview.position || "-";
                    const jobDept = job?.department || "แผนกงานองค์กร";
                    const appId = selectedInterview.ApplicationID || app?.ID || selectedInterview.application_id || 0;
                    const aiScore = app?.ai_score ?? app?.AIScore ?? app?.AIScreening?.skill_score ?? selectedInterview.ai_score ?? null;
                    const currentHumanScore = interviewerScore !== "" ? Number(interviewerScore) : (selectedInterview.interviewer_score ?? null);

                    return (
                        <div className="space-y-5">
                            {/* Candidate Summary Card */}
                            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4.5 rounded-3xl border border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4169E1] to-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                                        {(cand?.first_name || candName || "?")[0]}
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-slate-900">
                                            {candName}
                                        </p>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                            {jobTitle} &bull; {jobDept}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            อีเมล: {candEmail}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right font-mono text-xs font-bold text-[#4169E1] bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-2xs">
                                    {app?.application_code || app?.ApplicationCode || `APP-${10000 + Number(appId)}`}
                                </div>
                            </div>

                            {/* Dual Scores Comparison (AI vs Human) - Both Read-Only! */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* AI Score Display */}
                                <div className="p-4 rounded-3xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs mb-1">
                                            <span>คะแนนวิเคราะห์จาก AI</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-3xl font-black text-indigo-900">
                                                {aiScore !== null && aiScore !== undefined ? Number(aiScore).toFixed(0) : "-"}
                                            </span>
                                            <span className="text-xs font-bold text-indigo-600">/ 100</span>
                                        </div>
                                        <div className="w-full bg-indigo-100/60 h-2 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-600"
                                                style={{ width: `${Math.min(100, Math.max(0, Number(aiScore || 0)))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Human Interviewer Score Display (Read-Only) */}
                                <div className="p-4 rounded-3xl bg-teal-50/60 border border-teal-100 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs mb-1">
                                            <span>คะแนนจากผู้สัมภาษณ์</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-3xl font-black text-teal-900">
                                                {currentHumanScore !== null && currentHumanScore !== undefined ? Number(currentHumanScore).toFixed(0) : "-"}
                                            </span>
                                            <span className="text-xs font-bold text-teal-700">/ 100</span>
                                        </div>
                                        <div className="w-full bg-teal-100/60 h-2 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-teal-600"
                                                style={{ width: `${Math.min(100, Math.max(0, Number(currentHumanScore || 0)))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Result Selection Toggle (Large Radio Cards) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                                    ผลการตัดสินการสัมภาษณ์ <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Passed Option */}
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchResultType("passed")}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                                            resultType === "passed"
                                                ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-md shadow-emerald-100"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        }`}
                                    >
                                        <span className="text-sm font-black">ผ่านการสัมภาษณ์</span>
                                    </button>

                                    {/* Failed Option */}
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchResultType("failed")}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                                            resultType === "failed"
                                                ? "border-red-600 bg-red-50 text-red-700 shadow-md shadow-red-100"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        }`}
                                    >
                                        <span className="text-sm font-black">ไม่ผ่านการสัมภาษณ์</span>
                                    </button>
                                </div>
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
                                            <Eye className="w-3 h-3 inline mr-1" /> ตัวอย่างอีเมลส่งจริง
                                        </button>
                                    </div>
                                </div>

                                {resultEmailTab === "edit" ? (
                                    <textarea
                                        value={resultEmailContent}
                                        onChange={e => setResultEmailContent(e.target.value)}
                                        rows={12}
                                        placeholder={
                                            resultType === "passed"
                                                ? "ระบุเนื้อหาอีเมลแจ้งผลการสัมภาษณ์ (ผ่านการคัดเลือก)..."
                                                : "ระบุเนื้อหาอีเมลแจ้งผลการสัมภาษณ์ (ไม่ผ่านการคัดเลือก)..."
                                        }
                                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y transition-all leading-relaxed bg-slate-50/50 focus:bg-white font-sans"
                                    />
                                ) : (
                                    /* Realistic Email Preview Card */
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-[11px] text-slate-500 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-600 w-12">จาก:</span>
                                                <span>ฝ่ายทรัพยากรบุคคล ({hrFullName})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-600 w-12">ถึง:</span>
                                                <span className="font-semibold text-slate-700">{candEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-600 w-12">หัวข้อ:</span>
                                                <span className="font-semibold text-slate-800">
                                                    แจ้งผลการสัมภาษณ์งาน ตำแหน่ง {jobTitle}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                            {resultEmailContent || (
                                                <span className="text-slate-600">
                                                    {buildResultEmailContent({
                                                        result: resultType,
                                                        candidateName: candName,
                                                        position: jobTitle,
                                                        hrName: hrFullName,
                                                        hrTel,
                                                        hrMobile,
                                                        hrEmail,
                                                    })}
                                                </span>
                                            )}
                                            {/* Simulated Confirmation Button in Email */}
                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center">
                                                <div className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm pointer-events-none text-center ${
                                                    resultType === "passed" ? "bg-[#059669]" : "bg-[#991b1b]"
                                                }`}>
                                                    ยืนยันรับทราบผลการสัมภาษณ์
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ═══════════ MODAL: ส่งผลสำเร็จ ═══════════════════════════ */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowSuccessModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)] z-10 border border-slate-100">
                        <div className={`px-6 py-8 text-center ${
                            lastResultType === "passed"
                                ? "bg-gradient-to-br from-emerald-50/80 via-white to-white"
                                : "bg-gradient-to-br from-red-50/80 via-white to-white"
                        }`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                                lastResultType === "passed"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-red-100 text-red-600"
                            }`}>
                                <Mail className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">ส่งอีเมลแจ้งผลสำเร็จ!</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {successMessage}
                            </p>

                            <button
                                type="button"
                                onClick={() => setShowSuccessModal(false)}
                                className={`w-full py-3 mt-5 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer ${
                                    lastResultType === "passed"
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                        : "bg-red-600 hover:bg-red-700 shadow-red-200"
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
