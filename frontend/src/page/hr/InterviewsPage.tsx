import { JSX, useState, useEffect } from "react";
import {
    Users, Calendar, CheckCircle2, Clock, AlertTriangle,
    Search, Video, MapPin, Phone, Link as LinkIcon,
    Trash2, Edit3, Send, CalendarDays, Save, Loader2
} from "lucide-react";
import {
    getAllInterviews, createInterview, updateInterview,
    deleteInterview, getCandidatesForInterview, sendInterviewEmail
} from "../../services/interviewService";

// ── Helper ──────────────────────────────────────────────────────────
const statusMap: Record<string, string> = {
    pending: "รอยืนยัน",
    confirmed: "ยืนยันแล้ว",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    rescheduled: "ขอเลื่อนนัด",
};

const statusStyles: Record<string, string> = {
    "ยืนยันแล้ว": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "รอยืนยัน": "bg-amber-50 text-amber-700 border-amber-200",
    "ขอเลื่อนนัด": "bg-rose-50 text-rose-700 border-rose-200",
    "เสร็จสิ้น": "bg-sky-50 text-sky-700 border-sky-200",
    "ยกเลิก": "bg-slate-50 text-slate-500 border-slate-200",
};

const formatIcons: Record<string, JSX.Element> = {
    online: <Video className="w-4 h-4 text-indigo-500" />,
    onsite: <MapPin className="w-4 h-4 text-rose-500" />,
    phone: <Phone className="w-4 h-4 text-teal-500" />,
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
        return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
    } catch {
        return dateStr;
    }
}

// ══════════════════════════════════════════════════════════════════
export default function InterviewsPage() {
    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<"create" | "table">("create");

    // ── Data from API ──
    const [interviews, setInterviews] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // ── Create tab state ──
    const [searchCandidate, setSearchCandidate] = useState("");
    const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewTime, setInterviewTime] = useState("10:00");
    const [interviewFormat, setInterviewFormat] = useState("online");
    const [interviewLink, setInterviewLink] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [lastSavedInterviewId, setLastSavedInterviewId] = useState<number | null>(null);
    const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);


    // ── Email content (auto-filled after save) ──
    const [emailContent, setEmailContent] = useState("");

    // ── Table tab state ──
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    // ── Fetch data ──
    const fetchInterviews = async () => {
        setLoadingInterviews(true);
        try {
            const res = await getAllInterviews();
            if (res?.data) setInterviews(res.data);
        } catch (err) {
            console.error("Failed to fetch interviews:", err);
        } finally {
            setLoadingInterviews(false);
        }
    };

    const fetchCandidates = async () => {
        setLoadingCandidates(true);
        try {
            const res = await getCandidatesForInterview();
            if (res?.data) setCandidates(res.data);
        } catch (err) {
            console.error("Failed to fetch candidates:", err);
        } finally {
            setLoadingCandidates(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
        fetchCandidates();
    }, []);

    // ── Derived ──
    const filteredCandidates = candidates.filter(app => {
        const name = `${app.Candidate?.first_name || ""} ${app.Candidate?.last_name || ""}`.toLowerCase();
        const pos = (app.JobPosition?.title || app.position || "").toLowerCase();
        const q = searchCandidate.toLowerCase();
        return name.includes(q) || pos.includes(q);
    });

    const filteredInterviews = filterStatus === "ทั้งหมด"
        ? interviews
        : interviews.filter(iv => {
            const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
            return thaiStatus === filterStatus;
        });

    const selectedApp = candidates.find(c => c.ID === selectedAppId) || null;

    // Stats
    const totalCount = interviews.length;
    const confirmedCount = interviews.filter(iv => iv.interview_status === "confirmed").length;
    const pendingCount = interviews.filter(iv => iv.interview_status === "pending").length;
    const rescheduleCount = interviews.filter(iv => iv.interview_status === "rescheduled" || iv.interview_status === "cancelled").length;

    // ── Handlers ──
    const handleSaveInterview = async () => {
        if (!selectedAppId || !interviewDate || !interviewTime) {
            alert("กรุณาเลือกผู้สมัครและกำหนดวัน/เวลา");
            return;
        }
        setSaving(true);
        setSaveSuccess(false);
        try {
            let res;
            if (editingInterviewId) {
                // อัปเดต interview ที่มีอยู่
                res = await updateInterview(editingInterviewId, {
                    interview_date: interviewDate,
                    interview_time: interviewTime,
                    format: interviewFormat,
                    format_description: interviewLink,
                });
            } else {
                // สร้าง interview ใหม่
                res = await createInterview(
                    selectedAppId,
                    interviewDate,
                    interviewTime,
                    interviewFormat,
                    interviewLink
                );
            }
            if (res?.data) {
                const savedId = res.data.ID || editingInterviewId;
                setLastSavedInterviewId(savedId);
                // Auto-fill email content
                const cand = selectedApp?.Candidate;
                const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
                const posTitle = selectedApp?.JobPosition?.title || selectedApp?.position || "ตำแหน่งงาน";
                setEmailContent(
`เรียน คุณ${candName}

ทางบริษัทขอเรียนเชิญท่านเข้าสัมภาษณ์งาน ตำแหน่ง ${posTitle} ตามรายละเอียดดังนี้:

📅 วันที่: ${interviewDate}
🕐 เวลา: ${interviewTime} น.
📹 รูปแบบ: ${formatLabels[interviewFormat] || interviewFormat}
🔗 ลิงก์/สถานที่: ${interviewLink || "-"}

กรุณายืนยันการเข้าร่วมภายใน 3 วันทำการ

ขอแสดงความนับถือ
ฝ่ายทรัพยากรบุคคล`
                );
                setSaveSuccess(true);
                setEditingInterviewId(null);
                fetchInterviews();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกนัดสัมภาษณ์");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (iv: any) => {
        // เปลี่ยนไป tab สร้าง และ prefill ข้อมูลจาก interview ที่เลือก
        const dt = new Date(iv.interview_datetime);
        const appId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
        const dateStr = dt.toISOString().split("T")[0];
        const timeStr = dt.toTimeString().slice(0, 5);
        const formatStr = iv.format || "online";
        const linkStr = iv.format_description || "";
        const cand = iv.application?.Candidate || iv.Application?.Candidate;
        const job = iv.application?.JobPosition || iv.Application?.JobPosition;
        const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
        const posTitle = job?.title || iv.position || "ตำแหน่งงาน";

        setSelectedAppId(appId);
        setInterviewDate(dateStr);
        setInterviewTime(timeStr);
        setInterviewFormat(formatStr);
        setInterviewLink(linkStr);
        setEditingInterviewId(iv.ID);
        setLastSavedInterviewId(iv.ID);

        setEmailContent(
`เรียน คุณ${candName}

ทางบริษัทขอเรียนเชิญท่านเข้าสัมภาษณ์งาน ตำแหน่ง ${posTitle} ตามรายละเอียดดังนี้:

📅 วันที่: ${dateStr}
🕐 เวลา: ${timeStr} น.
📹 รูปแบบ: ${formatLabels[formatStr] || formatStr}
🔗 ลิงก์/สถานที่: ${linkStr || "-"}

กรุณายืนยันการเข้าร่วมภายใน 3 วันทำการ

ขอแสดงความนับถือ
ฝ่ายทรัพยากรบุคคล`
        );
        setSaveSuccess(false);
        setActiveTab("create");
    };



    const handleDelete = async (id: number) => {
        if (!confirm("ต้องการลบนัดสัมภาษณ์นี้หรือไม่?")) return;
        try {
            await deleteInterview(id);
            fetchInterviews();
        } catch (err: any) {
            alert(err.response?.data?.error || "ลบไม่สำเร็จ");
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 font-sans">

            {/* ── Statistics Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-[#4169E1]" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{totalCount}</p>
                        <p className="text-xs text-slate-400 font-semibold">นัดหมายทั้งหมด</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{confirmedCount}</p>
                        <p className="text-xs text-slate-400 font-semibold">ยืนยันแล้ว</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
                        <p className="text-xs text-slate-400 font-semibold">รอยืนยัน</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800">{rescheduleCount}</p>
                        <p className="text-xs text-slate-400 font-semibold">ขอเลื่อนนัด</p>
                    </div>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "create"
                            ? "text-[#4169E1] border-b-2 border-[#4169E1] bg-indigo-50/40"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        สร้างการนัดสัมภาษณ์
                    </button>
                    <button
                        onClick={() => setActiveTab("table")}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "table"
                            ? "text-[#4169E1] border-b-2 border-[#4169E1] bg-indigo-50/40"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        ตารางการสัมภาษณ์
                    </button>
                </div>

                {/* ═══════════ TAB: CREATE ═══════════════════════════ */}
                {activeTab === "create" && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* ── Column 1: Candidate List ───────── */}
                            <div className="lg:col-span-3 bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-3">
                                <h3 className="text-sm font-black text-slate-700">เลือกผู้สมัคร</h3>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาผู้สมัคร..."
                                        value={searchCandidate}
                                        onChange={e => setSearchCandidate(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                    />
                                </div>

                                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                                    {loadingCandidates ? (
                                        <p className="text-xs text-slate-400 text-center py-6">กำลังโหลดข้อมูล...</p>
                                    ) : filteredCandidates.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">ไม่พบผู้สมัคร</p>
                                    ) : (
                                        filteredCandidates.map(app => (
                                            <label
                                                key={app.ID}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                                    selectedAppId === app.ID
                                                        ? "bg-[#4169E1]/10 border border-[#4169E1]/30 shadow-sm"
                                                        : "hover:bg-white border border-transparent"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="candidate"
                                                    checked={selectedAppId === app.ID}
                                                    onChange={() => setSelectedAppId(app.ID)}
                                                    className="accent-[#4169E1] w-4 h-4"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {app.Candidate?.first_name} {app.Candidate?.last_name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {app.JobPosition?.title || app.position || "-"}
                                                    </p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ── Column 2: Schedule Form ────────── */}
                            <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-5">
                                <h3 className="text-sm font-black text-slate-700">กำหนดวันและเวลาการนัดสัมภาษณ์</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">วันสัมภาษณ์</label>
                                        <div className="relative">
                                            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="date"
                                                value={interviewDate}
                                                onChange={e => setInterviewDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">เวลานัดหมาย</label>
                                        <div className="relative">
                                            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="time"
                                                value={interviewTime}
                                                onChange={e => setInterviewTime(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">รูปแบบสัมภาษณ์</label>
                                        <select
                                            value={interviewFormat}
                                            onChange={e => setInterviewFormat(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                        >
                                            <option value="online">Video Call (Google Meet)</option>
                                            <option value="onsite">On-site (สถานที่จริง)</option>
                                            <option value="phone">Phone Interview (โทรศัพท์)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                            ลิงก์เข้าสัมภาษณ์ / สถานที่ / เบอร์โทร
                                        </label>
                                        <div className="relative">
                                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder={interviewFormat === "online" ? "https://meet.google.com/..." : interviewFormat === "phone" ? "02-xxx-xxxx" : "ห้องประชุม A ชั้น 3"}
                                                value={interviewLink}
                                                onChange={e => setInterviewLink(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Card */}
                                {selectedApp && interviewDate && (
                                    <div className="mt-4 bg-white border border-indigo-100 rounded-xl p-4 space-y-2">
                                        <p className="text-xs font-bold text-[#4169E1] uppercase tracking-wider">ตัวอย่าง</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {selectedApp.Candidate?.first_name} {selectedApp.Candidate?.last_name}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {interviewDate}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {interviewTime}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                            {formatIcons[interviewFormat]}
                                            <span>{formatLabels[interviewFormat]}</span>
                                        </div>
                                        {interviewLink && <p className="text-xs text-indigo-600 font-medium break-all">{interviewLink}</p>}
                                    </div>
                                )}

                                {saveSuccess && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        บันทึกนัดสัมภาษณ์สำเร็จ! ข้อมูลถูกเติมในจดหมายเชิญแล้ว
                                    </div>
                                )}

                                <button
                                    disabled={saving || !selectedAppId || !interviewDate}
                                    onClick={handleSaveInterview}
                                    className="w-full mt-2 bg-white border-2 border-dashed border-[#4169E1]/40 text-[#4169E1] font-bold py-2.5 rounded-xl text-xs hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลการนัดสัมภาษณ์"}
                                </button>
                            </div>

                            {/* ── Column 3: Email Content ────────── */}
                            <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col">
                                <h3 className="text-sm font-black text-slate-700">เนื้อหาจดหมายเชิญผู้สมัคร</h3>

                                {!emailContent && (
                                    <div className="flex-1 flex items-center justify-center text-center p-6">
                                        <div className="space-y-2">
                                            <Send className="w-10 h-10 text-slate-200 mx-auto" />
                                            <p className="text-sm text-slate-400 font-medium">กรุณาบันทึกข้อมูลการนัดสัมภาษณ์ก่อน</p>
                                            <p className="text-xs text-slate-300">ระบบจะสร้างเนื้อหาจดหมายเชิญให้อัตโนมัติ</p>
                                        </div>
                                    </div>
                                )}

                                {emailContent && (
                                    <>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">คำเชิญ</label>
                                            <textarea
                                                rows={14}
                                                value={emailContent}
                                                onChange={e => setEmailContent(e.target.value)}
                                                className="w-full h-full min-h-[280px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all leading-relaxed"
                                            />
                                        </div>

                                        <button
                                            className="w-full bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={sendingEmail || !lastSavedInterviewId}
                                            onClick={async () => {
                                                if (!lastSavedInterviewId) {
                                                    alert("กรุณาบันทึกข้อมูลการนัดสัมภาษณ์ก่อน");
                                                    return;
                                                }
                                                setSendingEmail(true);
                                                try {
                                                    await sendInterviewEmail(lastSavedInterviewId, emailContent);
                                                    alert("ส่งคำเชิญเรียบร้อยแล้ว");
                                                } catch (err: any) {
                                                    alert(err.response?.data?.error || "ส่งอีเมลไม่สำเร็จ");
                                                } finally {
                                                    setSendingEmail(false);
                                                }
                                            }}
                                        >
                                            {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {sendingEmail ? "กำลังส่ง..." : "ส่งคำเชิญให้ผู้สัมภาษณ์"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════ TAB: TABLE ════════════════════════════ */}
                {activeTab === "table" && (
                    <div className="p-6 space-y-6">

                        {/* Header + Filter */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h3 className="text-lg font-black text-slate-800">ตารางเวลาสัมภาษณ์</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 font-semibold">กรองด้วยสถานะสัมภาษณ์</span>
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                >
                                    <option>ทั้งหมด</option>
                                    <option>ยืนยันแล้ว</option>
                                    <option>รอยืนยัน</option>
                                    <option>ขอเลื่อนนัด</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้สมัคร / ตำแหน่ง</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">วันสัมภาษณ์</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">เวลานัดหมาย</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">รูปแบบสัมภาษณ์</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">ลิงก์ / สถานที่</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loadingInterviews ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">กำลังโหลดข้อมูล...</td></tr>
                                    ) : filteredInterviews.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">ไม่พบข้อมูลนัดสัมภาษณ์</td></tr>
                                    ) : (
                                        filteredInterviews.map(iv => {
                                            const cand = iv.application?.Candidate || iv.Application?.Candidate;
                                            const job = iv.application?.JobPosition || iv.Application?.JobPosition;
                                            const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
                                            return (
                                                <tr key={iv.ID} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {cand?.first_name} {cand?.last_name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {job?.title || "-"}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                            {formatThaiDate(iv.interview_datetime)}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-700 font-medium">
                                                        {formatTime(iv.interview_datetime)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                            {formatIcons[iv.format] || <Video className="w-4 h-4 text-slate-400" />}
                                                            <span>{formatLabels[iv.format] || iv.format}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {iv.format === "online" ? (
                                                            <a href={iv.format_description} target="_blank" rel="noopener noreferrer" className="text-[#4169E1] text-sm font-medium hover:underline break-all">
                                                                {iv.format_description || "-"}
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm text-slate-700 font-medium">{iv.format_description || "-"}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold border ${statusStyles[thaiStatus] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                                            {thaiStatus === "ยืนยันแล้ว" && <CheckCircle2 className="w-3 h-3" />}
                                                            {thaiStatus === "รอยืนยัน" && <Clock className="w-3 h-3" />}
                                                            {thaiStatus === "ขอเลื่อนนัด" && <AlertTriangle className="w-3 h-3" />}
                                                            {thaiStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => openEditModal(iv)}
                                                                className="p-2 rounded-lg bg-indigo-50 text-[#4169E1] hover:bg-indigo-100 transition-all"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(iv.ID)}
                                                                className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
