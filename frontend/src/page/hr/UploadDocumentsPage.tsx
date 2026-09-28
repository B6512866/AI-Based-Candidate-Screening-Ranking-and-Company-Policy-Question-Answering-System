import { useEffect, useMemo, useState, useRef } from "react";
import { deleteApplicationDocument, getalljobs, getJobPositionDocuments, uploadApplicationDocument } from "../../services/jobPositionService";
import { Upload, Link as LinkIcon, BriefcaseBusiness, ClipboardCheck, NotebookText, Trash2, ChevronDown, Check } from "lucide-react";
import { openFileInNewTab } from "../../utils/fileViewer";
import rules from "../../components/rules/rule";
import { useConfirm } from "../../context/ConfirmContext";

interface JobPosition {
  ID: number;
  title: string;
  department: string;
  status: string;
}

interface DocumentItem {
  ID: number;
  title: string;
  file_name: string;
  file_url: string;
  document_type: string;
  description: string;
  created_at?: string;
  CreatedAt?: string;
}

const documentTypeLabels: Record<string, string> = {
  score_criteria: "เกณฑ์การให้คะแนน",
  additional_info_form: "แบบฟอร์มข้อมูลเพิ่มเติม",
  interview_material: "เอกสารประกอบสัมภาษณ์",
  job_description: "รายละเอียดตำแหน่ง",
  other: "อื่น ๆ",
};

export default function UploadDocumentsPage() {
  const { confirm } = useConfirm();
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("score_criteria");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement>(null);
  const docsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) {
        setIsJobDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatThaiDate = (item: DocumentItem) => {
    const raw = item.created_at || item.CreatedAt;
    if (!raw) return "-";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await getalljobs();
        const openJobs = (res?.data || []).filter((job: JobPosition) => job.status === "เปิดรับสมัคร");
        setJobs(openJobs);
        if (openJobs.length > 0) {
          setSelectedJobId(openJobs[0].ID);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;

    const fetchDocs = async () => {
      try {
        const res = await getJobPositionDocuments(Number(selectedJobId));
        setDocuments(res?.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchDocs();
  }, [selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.ID === Number(selectedJobId)) || null,
    [jobs, selectedJobId]
  );

  const handleUpload = async () => {
    if (!selectedJobId) {
      setError("กรุณาเลือกตำแหน่งงานก่อน");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("กรุณาเลือกไฟล์ที่ต้องการอัปโหลดอย่างน้อย 1 ไฟล์");
      return;
    }
    if (!title.trim() && selectedFiles.length === 1) {
      setError("กรุณาใส่ชื่อเอกสาร");
      return;
    }

    // ตรวจสอบความถูกต้องของขนาดและนามสกุลไฟล์
    for (const f of selectedFiles) {
      const val = rules.file.validate(f, { maxSizeMB: 25 });
      if (!val.isValid) {
        setError(`ไฟล์ "${f.name}": ${val.error}`);
        return;
      }
    }

    try {
      setIsUploading(true);
      setError("");
      setSuccess("");

      const res = await uploadApplicationDocument(
        Number(selectedJobId),
        selectedFiles,
        documentType,
        title,
        description
      );

      const newDocs = Array.isArray(res?.data) ? res.data : [res?.data].filter(Boolean);
      setDocuments((prev) => [...newDocs, ...prev]);
      setSelectedFiles([]);
      setTitle("");
      setDescription("");
      setDocumentType("score_criteria");
      setSuccess(`อัปโหลดสำเร็จ ${newDocs.length} ไฟล์`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "เกิดข้อผิดพลาดในการอัปโหลดเอกสาร");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    const doc = documents.find((d) => d.ID === docId);
    const docName = doc?.title ? ` "${doc.title}"` : "";

    const isConfirmed = await confirm({
      title: "ยืนยันการลบเอกสาร?",
      message: `คุณต้องการลบเอกสาร${docName} ใช่หรือไม่?\n\nการกระทำนี้จะลบไฟล์และข้อมูลเอกสารออกจากระบบอย่างถาวร`,
      confirmText: "ลบเอกสาร",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      await deleteApplicationDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.ID !== docId));
      setSuccess("ลบเอกสารสำเร็จ");
    } catch (err: any) {
      setError(err?.response?.data?.error || "ลบเอกสารไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-16 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">เอกสารประกอบสัมภาษณ์และคัดเลือก</h1>
          <p className="text-sm text-slate-500 mt-1">จัดเก็บเอกสารที่ใช้ร่วมกันสำหรับทุกผู้สมัครในตำแหน่งเดียวกัน เช่น เกณฑ์การให้คะแนนและแบบฟอร์มกรอกข้อมูลเพิ่มเติม</p>
        </div>
        {documents.length > 0 && (
          <div className="xl:hidden">
            <button
              type="button"
              onClick={() => docsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-[#4169E1] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <NotebookText className="w-4 h-4" />
              <span>ดูเอกสารที่บันทึกไว้ ({documents.length}) ↓</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <BriefcaseBusiness className="w-5 h-5 text-[#4169E1]" />
            <h2 className="text-lg font-bold text-slate-800">เลือกตำแหน่งงาน</h2>
          </div>

          {/* Custom Responsive Dropdown for Job Position (Never breaks out of screen) */}
          <div className="relative" ref={jobDropdownRef}>
            <button
              type="button"
              onClick={() => setIsJobDropdownOpen(!isJobDropdownOpen)}
              className="w-full flex items-center justify-between border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-left outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-2xs hover:border-indigo-300"
            >
              <div className="min-w-0 flex-1 pr-2">
                {selectedJob ? (
                  <div className="truncate">
                    <span className="font-bold text-slate-800">{selectedJob.title}</span>
                    <span className="text-slate-400 text-xs ml-1.5">({selectedJob.department})</span>
                  </div>
                ) : (
                  <span className="text-slate-400">-- เลือกตำแหน่งงาน --</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isJobDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isJobDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-30 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                {jobs.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">ไม่มีตำแหน่งงานที่เปิดรับสมัคร</div>
                ) : (
                  jobs.map((job) => {
                    const isSelected = job.ID === Number(selectedJobId);
                    return (
                      <button
                        key={job.ID}
                        type="button"
                        onClick={() => {
                          setSelectedJobId(job.ID);
                          setIsJobDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                          isSelected
                            ? "bg-indigo-50/60 border-indigo-200 text-[#4169E1]"
                            : "border-transparent hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-800 truncate">{job.title}</p>
                          <p className="text-xs text-slate-400 truncate">{job.department}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#4169E1] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {selectedJob && (
            <div className="mt-4 rounded-xl bg-indigo-50/80 border border-indigo-100 p-3.5 sm:p-4 text-sm text-slate-700">
              <div className="font-bold text-indigo-700 mb-0.5 text-xs uppercase tracking-wide">ตำแหน่งที่เลือก</div>
              <div className="font-bold text-slate-800 text-sm truncate">{selectedJob.title}</div>
              <div className="text-slate-500 text-xs mt-0.5">{selectedJob.department}</div>
              <div className="mt-2 text-[11px] font-semibold text-indigo-600">ใช้ร่วมกันกับทุกผู้สมัครในตำแหน่งนี้</div>
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-700">
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>เอกสารที่ใช้สำหรับการคัดเลือกและสัมภาษณ์</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-white px-2.5 py-0.5 border border-indigo-100 shadow-2xs font-medium">เกณฑ์การให้คะแนน</span>
                <span className="rounded-full bg-white px-2.5 py-0.5 border border-indigo-100 shadow-2xs font-medium">แบบฟอร์มข้อมูลเพิ่มเติม</span>
                <span className="rounded-full bg-white px-2.5 py-0.5 border border-indigo-100 shadow-2xs font-medium">เอกสารสัมภาษณ์</span>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700">ประเภทเอกสาร</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
              >
                <option value="score_criteria">เกณฑ์การให้คะแนน</option>
                <option value="additional_info_form">แบบฟอร์มกรอกข้อมูลเพิ่มเติม</option>
                <option value="interview_material">เอกสารประกอบสัมภาษณ์</option>
                <option value="job_description">รายละเอียดตำแหน่ง</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700">ชื่อเอกสาร</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ถ้าอัปโหลดหลายไฟล์ ให้เว้นว่างเพื่อใช้ชื่อไฟล์แต่ละต้นฉบับ"
                className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700">คำอธิบาย</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="รายละเอียดหรือประเด็นสำคัญของเอกสาร"
                className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 leading-relaxed font-sans resize-none"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700">เลือกไฟล์</label>
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 sm:py-6 text-sm text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                <Upload className="w-5 h-5 text-indigo-500" />
                <span className="font-semibold text-xs sm:text-sm">{selectedFiles.length > 0 ? `${selectedFiles.length} ไฟล์ที่เลือก` : "คลิกเพื่อเลือกไฟล์"}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-xs text-slate-500 break-all space-y-0.5">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-slate-400">•</span>
                      <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-600">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm text-green-600">{success}</div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || loading || !selectedJobId}
              className="w-full rounded-xl bg-[#4169E1] hover:bg-[#3154c4] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 transition-all cursor-pointer shadow-md shadow-indigo-100"
            >
              {isUploading ? "กำลังอัปโหลด..." : "บันทึกเอกสาร"}
            </button>
          </div>
        </div>

        <div ref={docsSectionRef} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <NotebookText className="w-5 h-5 text-[#4169E1]" />
              <h2 className="text-lg font-bold text-slate-800">เอกสารที่บันทึกไว้</h2>
            </div>
            {documents.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {documents.length} รายการ
              </span>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
              ยังไม่มีเอกสารสำหรับตำแหน่งนี้
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.ID} className="rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 hover:border-indigo-200 transition-all bg-white shadow-2xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">{doc.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {documentTypeLabels[doc.document_type] || doc.document_type} • {doc.file_name}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0 whitespace-nowrap">
                      {documentTypeLabels[doc.document_type] || doc.document_type}
                    </span>
                  </div>

                  {doc.description && (
                    <div className="mt-2 text-xs text-slate-500 leading-relaxed bg-slate-50/70 p-2 rounded-xl">
                      {doc.description}
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openFileInNewTab(doc.file_url, doc.file_name)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#4169E1] hover:underline cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>เปิดไฟล์</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.ID)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      {formatThaiDate(doc)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
