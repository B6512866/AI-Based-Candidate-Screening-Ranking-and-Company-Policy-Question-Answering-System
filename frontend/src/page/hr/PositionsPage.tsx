import { useState, useEffect } from "react";
import { Briefcase, Plus, Save, Trash2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import {
    getalljobs,
    createjob,
    updatejob,
    deletejob
} from "../../services/jobPositionService";

interface JobPosition {
    ID: number;
    title: string;
    description: string;
    criteria: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export default function PositionsPage() {
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Form fields
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editCriteria, setEditCriteria] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const data = await getalljobs();
            if (data && data.data) {
                setJobs(data.data);
                if (data.data.length > 0 && !selectedJob) {
                    selectJob(data.data[0]);
                } else if (selectedJob) {
                    const updated = data.data.find((j: JobPosition) => j.ID === selectedJob.ID);
                    if (updated) selectJob(updated);
                }
            }
        } catch {
            setMessage({ text: "ไม่สามารถดึงข้อมูลตำแหน่งงานได้", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const selectJob = (job: JobPosition) => {
        setSelectedJob(job);
        setEditTitle(job.title);
        setEditDescription(job.description);
        setEditCriteria(job.criteria);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!editTitle.trim() || !editDescription.trim() || !editCriteria.trim()) {
            setMessage({ text: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง", type: "error" });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            if (isCreating) {
                const data = await createjob(editTitle, editDescription, editCriteria);
                if (data) {
                    setMessage({ text: "สร้างตำแหน่งงานใหม่สำเร็จ!", type: "success" });
                    setIsCreating(false);
                    await fetchJobs();
                    if (data.data) selectJob(data.data);
                }
            } else if (selectedJob) {
                const data = await updatejob(selectedJob.ID, editTitle, editDescription, editCriteria);
                if (data) {
                    setMessage({ text: "อัปเดตข้อมูลตำแหน่งงานสำเร็จ!", type: "success" });
                    await fetchJobs();
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
            setMessage({ text: msg, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("คุณต้องการลบตำแหน่งงานนี้ใช่หรือไม่?")) return;
        try {
            const data = await deletejob(id);
            if (data) {
                setMessage({ text: "ลบตำแหน่งงานสำเร็จ", type: "success" });
                setSelectedJob(null);
                fetchJobs();
            }
        } catch {
            setMessage({ text: "ลบตำแหน่งงานไม่สำเร็จ", type: "error" });
        }
    };

    const startNewJob = () => {
        setIsCreating(true);
        setSelectedJob(null);
        setEditTitle("ตำแหน่งงานใหม่");
        setEditDescription("");
        setEditCriteria("");
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">ตำแหน่งงานองค์กร</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        จัดการลักษณะงานและเกณฑ์การคัดสรร เพื่อนำไปวิเคราะห์คัดกรอง Resume ด้วย AI
                    </p>
                </div>
                <button
                    onClick={startNewJob}
                    className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    เพิ่มตำแหน่งงานใหม่
                </button>
            </div>

            {/* Alert Message */}
            {message && (
                <div
                    className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold transition-all ${
                        message.type === "success"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                            : "bg-red-50 border-red-100 text-red-600"
                    }`}
                >
                    {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Split Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Job Positions List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[650px] overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <h3 className="font-bold text-slate-700 text-sm">ตำแหน่งงานในระบบ</h3>
                        </div>
                        <span className="text-xs font-bold bg-blue-50 text-[#4169E1] px-2.5 py-1 rounded-full">
                            {jobs.length} ตำแหน่ง
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="py-12 text-center text-slate-400 text-sm">กำลังโหลดตำแหน่งงาน...</div>
                        ) : jobs.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีตำแหน่งงานในฐานข้อมูล</div>
                        ) : (
                            jobs.map(job => {
                                const isSelected = selectedJob?.ID === job.ID && !isCreating;
                                return (
                                    <div
                                        key={job.ID}
                                        onClick={() => selectJob(job)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                            isSelected ? "bg-blue-50/70 border border-blue-100" : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[#4169E1] text-white" : "bg-slate-100 text-slate-500"}`}>
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${isSelected ? "text-[#4169E1]" : "text-slate-800"}`}>
                                                    {job.title}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                    {job.description || "ไม่มีคำอธิบายลักษณะงาน"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(job.ID); }}
                                            className="text-slate-300 hover:text-red-500 p-1 transition-all shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Job Editor */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[650px] overflow-hidden">
                    {!selectedJob && !isCreating ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Briefcase className="w-8 h-8 text-[#4169E1]" />
                            </div>
                            <p className="text-slate-700 font-bold text-lg">เลือกตำแหน่งงานเพื่อดูรายละเอียด</p>
                            <p className="text-slate-400 text-sm">คลิกเลือกจากรายการทางซ้าย หรือกดปุ่ม "เพิ่มตำแหน่งงานใหม่"</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Editor Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3 flex-1 mr-4">
                                    <FileText className="w-5 h-5 text-[#4169E1] shrink-0" />
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        placeholder="ชื่อตำแหน่งงาน (เช่น Software Engineer)"
                                        className="font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#4169E1]/30"
                                    />
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-100 text-sm shrink-0 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "กำลังบันทึก..." : isCreating ? "สร้างตำแหน่งงาน" : "บันทึกใน DB"}
                                </button>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-white">
                                {/* Job Description */}
                                <div className="flex flex-col flex-1 min-h-[180px]">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        ลักษณะงานที่ทำ (Job Description):
                                    </label>
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        placeholder="ระบุหน้าที่ความรับผิดชอบ ลักษณะงาน..."
                                        className="flex-1 w-full bg-slate-50/60 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed font-sans outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                    />
                                </div>

                                {/* Selection Criteria */}
                                <div className="flex flex-col flex-1 min-h-[180px]">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        เกณฑ์ในการคัดเลือกเข้ารับตำแหน่ง (Criteria):
                                    </label>
                                    <textarea
                                        value={editCriteria}
                                        onChange={e => setEditCriteria(e.target.value)}
                                        placeholder="ระบุเกณฑ์การคัดเลือก เช่น ทักษะขั้นต่ำ ประสบการณ์การทำงาน..."
                                        className="flex-1 w-full bg-slate-50/60 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed font-sans outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
