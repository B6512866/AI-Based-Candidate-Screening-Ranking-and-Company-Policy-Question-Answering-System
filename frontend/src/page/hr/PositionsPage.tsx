import { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, Save, Trash2, FileText, CheckCircle2, AlertCircle, MapPin, DollarSign, Clock, Users, Eye, Sparkles, X, Download } from "lucide-react";
import { getalljobs, createjob, updatejob, deletejob, getapplications } from "../../services/jobPositionService";
import apiClient from "../../services/apiClient";

interface JobPosition {
    ID: number;
    title: string;
    department: string;
    location: string;
    salary: string;
    type: string;
    benefits: string;
    contact_info: string;
    description: string;
    criteria: string;
    status: string;
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
    const [editDepartment, setEditDepartment] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editSalary, setEditSalary] = useState("");
    const [editJobType, setEditJobType] = useState("งานเต็มเวลา (Full-time)");
    const [editBenefits, setEditBenefits] = useState("");
    const [editContactInfo, setEditContactInfo] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editCriteria, setEditCriteria] = useState("");
    const [editStatus, setEditStatus] = useState("เปิดรับสมัคร");
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

    const navigate = useNavigate();
    // States สำหรับผู้สมัครในตำแหน่งนี้
    const [activeTab, setActiveTab] = useState<"editor" | "applicants">("editor");
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [viewingResume, setViewingResume] = useState<string | null>(null); // เก็บข้อความ Resume ที่ต้องการเปิดดู

    const fetchApplicants = async (jobId: number) => {
        setLoadingApplicants(true);
        try {
            const data = await getapplications(jobId);
            if (data && data.data) {
                setApplicants(data.data);
            }
        } catch {
            setMessage({ text: "ไม่สามารถโหลดรายชื่อผู้สมัครได้", type: "error" });
        } finally {
            setLoadingApplicants(false);
        }
    };
    // คอยโหลดรายชื่อผู้สมัครเมื่อมีการสลับแท็บ
    useEffect(() => {
        if (selectedJob && activeTab === "applicants" && !isCreating) {
            fetchApplicants(selectedJob.ID);
        }
    }, [selectedJob, activeTab, isCreating]);
    // คอยโหลดรายชื่อผู้สมัครเมื่อมีการสลับแท็บ
    useEffect(() => {
        if (selectedJob && activeTab === "applicants" && !isCreating) {
            fetchApplicants(selectedJob.ID);
        }
    }, [selectedJob, activeTab, isCreating]);

    useEffect(() => {
        fetchJobs();
    }, []);

    const selectJob = (job: JobPosition) => {
        setSelectedJob(job);
        setEditTitle(job.title || "");
        setEditDepartment(job.department || "");
        setEditLocation(job.location || "");
        setEditSalary(job.salary || "");
        setEditJobType(job.type || "งานเต็มเวลา (Full-time)");
        setEditBenefits(job.benefits || "");
        setEditContactInfo(job.contact_info || "");
        setEditDescription(job.description || "");
        setEditCriteria(job.criteria || "");
        setEditStatus(job.status || "เปิดรับสมัคร");
        setIsCreating(false);
        setActiveTab("editor");
        setApplicants([]);
    };

    const handleSave = async () => {
        if (!editTitle.trim() || !editDescription.trim() || !editCriteria.trim()) {
            setMessage({ text: "กรุณากรอกข้อมูล ตำแหน่งงาน, ลักษณะงาน และเกณฑ์คัดเลือก เป็นขั้นต่ำ", type: "error" });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            if (isCreating) {
                const data = await createjob(
                    editTitle,
                    editDescription,
                    editCriteria,
                    editDepartment,
                    editLocation,
                    editSalary,
                    editJobType,
                    editBenefits,
                    editContactInfo,
                    editStatus
                );
                if (data) {
                    setMessage({ text: "โพสต์และบันทึกตำแหน่งงานใหม่สำเร็จ!", type: "success" });
                    setIsCreating(false);
                    await fetchJobs();
                    if (data.data) selectJob(data.data);
                }
            } else if (selectedJob) {
                const data = await updatejob(
                    selectedJob.ID,
                    editTitle,
                    editDescription,
                    editCriteria,
                    editDepartment,
                    editLocation,
                    editSalary,
                    editJobType,
                    editBenefits,
                    editContactInfo,
                    editStatus
                );
                if (data) {
                    setMessage({ text: "อัปเดตประกาศงานสำเร็จ!", type: "success" });
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
        if (!window.confirm("คุณต้องการลบตำแหน่งงานนี้ใช่หรือไม่? การลบจะทำให้ตำแหน่งนี้หายไปจากหน้าแรกด้วย")) return;
        try {
            const data = await deletejob(id);
            if (data) {
                setMessage({ text: "ลบประกาศตำแหน่งงานสำเร็จ", type: "success" });
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
        setEditDepartment("");
        setEditLocation("");
        setEditSalary("");
        setEditJobType("งานเต็มเวลา (Full-time)");
        setEditBenefits("");
        setEditContactInfo("");
        setEditDescription("");
        setEditCriteria("");
        setEditStatus("เปิดรับสมัคร");
        setActiveTab("editor");
        setApplicants([]);
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">จัดการประกาศรับสมัครงาน</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        บันทึกตำแหน่งงานลงฐานข้อมูล เพื่อแสดงผลบน Landing Page และใช้เป็นเกณฑ์ให้ AI ช่วยคัดกรอง Resume
                    </p>
                </div>
                <button
                    onClick={startNewJob}
                    className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95 text-sm font-sans"
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[750px] overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <h3 className="font-bold text-slate-700 text-sm">ตำแหน่งงานทั้งหมด</h3>
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
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                            isSelected ? "bg-blue-50/40 border-blue-100" : "bg-transparent border-transparent hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        job.status === "เปิดรับสมัคร" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                                    }`}>
                                                        {job.status || "เปิดรับสมัคร"}
                                                    </span>
                                                    {job.department && (
                                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-semibold truncate max-w-[120px]">
                                                            {job.department}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`font-bold text-sm truncate ${isSelected ? "text-[#4169E1]" : "text-slate-800"}`}>
                                                    {job.title}
                                                </p>
                                                
                                                {/* Mini details */}
                                                <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-400">
                                                    {job.location && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{job.location}</span>
                                                        </div>
                                                    )}
                                                    {job.salary && (
                                                        <div className="flex items-center gap-1.5">
                                                            <DollarSign className="w-3 h-3 shrink-0" />
                                                            <span>{job.salary}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(job.ID); }}
                                                className="text-slate-300 hover:text-red-500 p-1 transition-all shrink-0 mt-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Job Editor */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[750px] overflow-hidden">
                    {!selectedJob && !isCreating ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Briefcase className="w-8 h-8 text-[#4169E1]" />
                            </div>
                            <p className="text-slate-700 font-bold text-lg">เลือกตำแหน่งงานเพื่อแก้ไขข้อมูล</p>
                            <p className="text-slate-400 text-sm">คลิกเลือกจากรายการทางซ้าย หรือกดปุ่ม "เพิ่มตำแหน่งงานใหม่"</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Editor Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-[#4169E1] shrink-0" />
                                    <input
                                        type="text"
                                        disabled={activeTab === "applicants"}
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        placeholder="ชื่อตำแหน่งงาน"
                                        className="font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#4169E1]/30 font-sans disabled:bg-slate-100/50"
                                    />
                                </div>
                                
                                {/* ปุ่มแท็บเลือกโหมดการดู */}
                                {!isCreating && (
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("editor")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "editor" ? "bg-white text-[#4169E1] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            ประกาศงาน
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("applicants")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "applicants" ? "bg-white text-[#4169E1] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            รายชื่อผู้สมัคร
                                        </button>
                                    </div>
                                )}

                                {activeTab === "editor" && (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-100 text-sm shrink-0 disabled:opacity-50 font-sans"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? "กำลังบันทึก..." : isCreating ? "สร้างประกาศ" : "อัปเดตประกาศ"}
                                    </button>
                                )}
                            </div>

                            {/* Editor Body */}
                            <div className="flex-1 p-6 overflow-y-auto bg-white font-sans">
                                {activeTab === "editor" ? (
                                    <div className="space-y-4">
                                        {/* Metadata Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Department */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    แผนก / ฝ่าย
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editDepartment}
                                                    onChange={e => setEditDepartment(e.target.value)}
                                                    placeholder="เช่น IT & Innovation, HR"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                                />
                                            </div>

                                            {/* Location */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    สถานที่ปฏิบัติงาน
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editLocation}
                                                    onChange={e => setEditLocation(e.target.value)}
                                                    placeholder="เช่น กรุงเทพมหานคร (BTS พญาไท / Hybrid)"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                                />
                                            </div>

                                            {/* Salary */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    อัตราเงินเดือน
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editSalary}
                                                    onChange={e => setEditSalary(e.target.value)}
                                                    placeholder="เช่น 45,000 - 65,000 บาท หรือ ตามตกลง"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                                />
                                            </div>

                                            {/* Job Type */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    ประเภทการจ้างงาน
                                                </label>
                                                <select
                                                    value={editJobType}
                                                    onChange={e => setEditJobType(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                                >
                                                    <option value="งานเต็มเวลา (Full-time)">งานเต็มเวลา (Full-time)</option>
                                                    <option value="งานนอกเวลา (Part-time)">งานนอกเวลา (Part-time)</option>
                                                    <option value="งานสัญญาจ้าง (Contract)">งานสัญญาจ้าง (Contract)</option>
                                                    <option value="ฝึกงาน (Internship)">ฝึกงาน (Internship)</option>
                                                </select>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    สถานะการรับสมัคร
                                                </label>
                                                <select
                                                    value={editStatus}
                                                    onChange={e => setEditStatus(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                                >
                                                    <option value="เปิดรับสมัคร">เปิดรับสมัคร (แสดงบนเว็บหน้าแรก)</option>
                                                    <option value="ปิดรับสมัครแล้ว">ปิดรับสมัครแล้ว</option>
                                                </select>
                                            </div>
                                        </div>

                                        <hr className="border-slate-100" />

                                        {/* Description */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                ลักษณะงานที่ทำ (Job Description) *
                                            </label>
                                            <textarea
                                                value={editDescription}
                                                onChange={e => setEditDescription(e.target.value)}
                                                placeholder="ระบุความรับผิดชอบและลักษณะงาน..."
                                                rows={4}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>

                                        {/* Criteria */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                คุณสมบัติผู้สมัคร / เกณฑ์คัดเลือก (Criteria) *
                                            </label>
                                            <textarea
                                                value={editCriteria}
                                                onChange={e => setEditCriteria(e.target.value)}
                                                placeholder="ระบุประสบการณ์ ความรู้ ทักษะที่จำเป็นในการคัดเลือก..."
                                                rows={4}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>

                                        {/* Benefits */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                สวัสดิการพนักงาน (Benefits)
                                            </label>
                                            <textarea
                                                value={editBenefits}
                                                onChange={e => setEditBenefits(e.target.value)}
                                                placeholder="ระบุสวัสดิการ เช่น ประกันสุขภาพ ประกันสังคม โบนัส..."
                                                rows={3}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>

                                        {/* Contact Info */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                วิธีการสมัคร / ข้อมูลติดต่อ (Contact Info)
                                            </label>
                                            <textarea
                                                value={editContactInfo}
                                                onChange={e => setEditContactInfo(e.target.value)}
                                                placeholder="ระบุอีเมล เบอร์โทร หรือลิ้งค์สำหรับสมัครงาน..."
                                                rows={3}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* 📌 หน้ารายชื่อผู้สมัครตำแหน่งนี้ */
                                    <div className="space-y-4">
                                        {loadingApplicants ? (
                                            <div className="py-12 text-center text-slate-400 text-sm">กำลังโหลดรายชื่อผู้สมัคร...</div>
                                        ) : applicants.length === 0 ? (
                                            <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีผู้สมัครส่ง Resume เข้ามาในตำแหน่งนี้</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-slate-500">
                                                    <thead className="text-xs text-slate-400 uppercase bg-slate-50 rounded-lg">
                                                        <tr>
                                                            <th className="px-4 py-3">ผู้สมัคร</th>
                                                            <th className="px-4 py-3">ข้อมูลติดต่อ</th>
                                                            <th className="px-4 py-3 text-right">การจัดการ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {applicants.map(app => (
                                                            <tr key={app.ID} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-4 font-bold text-slate-800">
                                                                    {app.Candidate ? `${app.Candidate.first_name} ${app.Candidate.last_name}` : "ไม่ระบุชื่อ"}
                                                                </td>
                                                                <td className="px-4 py-4 space-y-1 text-xs">
                                                                    <p>{app.Candidate?.email}</p>
                                                                    <p className="text-slate-400">{app.Candidate?.phone}</p>
                                                                </td>
                                                                <td className="px-4 py-4 text-right space-x-2 shrink-0">
                                                                    {app.resume_url && (
                                                                        <a
                                                                            href={`${apiClient.defaults.baseURL?.replace("/api", "")}${app.resume_url}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                        >
                                                                            <Download className="w-3.5 h-3.5" /> เปิดไฟล์ Resume
                                                                        </a>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setViewingResume(app.ResumeText || app.resume_text)}
                                                                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" /> ดู Resume
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            // วิ่งไปหน้าคัดกรองประเมินอัตโนมัติพร้อมส่งข้อความ Resume และ ID ของตำแหน่งงาน
                                                                            navigate("/hr/screening", { 
                                                                                state: { 
                                                                                    resumeText: app.ResumeText || app.resume_text,
                                                                                    jobId: selectedJob?.ID 
                                                                                } 
                                                                            });
                                                                        }}
                                                                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[#4169E1] px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        <Sparkles className="w-3.5 h-3.5" /> ส่งให้ AI คัดกรอง
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 📌 MODAL: เปิดอ่านข้อความ Resume ผู้สมัคร */}
            {viewingResume && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 flex flex-col max-h-[80vh] font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#4169E1]" /> ประวัติผู้สมัคร (Resume Text)
                            </h3>
                            <button
                                onClick={() => setViewingResume(null)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                            {viewingResume}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                            <button
                                onClick={() => setViewingResume(null)}
                                className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
