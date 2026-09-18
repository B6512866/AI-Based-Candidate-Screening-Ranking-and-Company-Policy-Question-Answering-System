import { useEffect, useMemo, useState } from "react";
import { deleteApplicationDocument, getalljobs, getJobPositionDocuments, uploadApplicationDocument } from "../../services/jobPositionService";
import { Upload, FileText, Link as LinkIcon, BriefcaseBusiness, ClipboardCheck, NotebookText, Trash2 } from "lucide-react";
import { getBackendBaseUrl } from "../../services/apiClient";

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
  created_at: string;
}

export default function UploadDocumentsPage() {
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
    try {
      await deleteApplicationDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.ID !== docId));
      setSuccess("ลบเอกสารสำเร็จ");
    } catch (err: any) {
      setError(err?.response?.data?.error || "ลบเอกสารไม่สำเร็จ");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">เอกสารประกอบสัมภาษณ์และคัดเลือก</h1>
          <p className="text-sm text-slate-500 mt-1">จัดเก็บเอกสารที่ใช้ร่วมกันสำหรับทุกผู้สมัครในตำแหน่งเดียวกัน เช่น เกณฑ์การให้คะแนนและแบบฟอร์มกรอกข้อมูลเพิ่มเติม</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BriefcaseBusiness className="w-5 h-5 text-[#4169E1]" />
            <h2 className="text-lg font-bold text-slate-800">เลือกตำแหน่งงาน</h2>
          </div>

          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">-- เลือกตำแหน่ง --</option>
            {jobs.map((job) => (
              <option key={job.ID} value={job.ID}>
                {job.title} ({job.department})
              </option>
            ))}
          </select>

          {selectedJob && (
            <div className="mt-5 rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-slate-700">
              <div className="font-bold text-indigo-700 mb-1">ตำแหน่งที่เลือก</div>
              <div>{selectedJob.title}</div>
              <div className="text-slate-500 mt-1">{selectedJob.department}</div>
              <div className="mt-2 text-xs font-semibold text-indigo-700">ใช้ร่วมกันกับทุกผู้สมัครในตำแหน่งนี้</div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <ClipboardCheck className="w-4 h-4" />
                เอกสารที่ใช้สำหรับการคัดเลือกและสัมภาษณ์
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-white px-2 py-1">เกณฑ์การให้คะแนน</span>
                <span className="rounded-full bg-white px-2 py-1">แบบฟอร์มข้อมูลเพิ่มเติม</span>
                <span className="rounded-full bg-white px-2 py-1">เอกสารสัมภาษณ์</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">ประเภทเอกสาร</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="score_criteria">เกณฑ์การให้คะแนน</option>
                <option value="additional_info_form">แบบฟอร์มกรอกข้อมูลเพิ่มเติม</option>
                <option value="interview_material">เอกสารประกอบสัมภาษณ์</option>
                <option value="job_description">รายละเอียดตำแหน่ง</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">ชื่อเอกสาร (สำหรับไฟล์เดียว)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ถ้าอัปโหลดหลายไฟล์ ให้เว้นว่างเพื่อใช้ชื่อไฟล์แต่ละต้นฉบับ"
                className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">คำอธิบาย</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="รายละเอียดหรือประเด็นสำคัญของเอกสาร"
                className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">เลือกไฟล์หลายไฟล์พร้อมกัน</label>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                <Upload className="w-4 h-4" />
                <span>{selectedFiles.length > 0 ? `${selectedFiles.length} ไฟล์ที่เลือก` : "คลิกเพื่อเลือกไฟล์"}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  {selectedFiles.map((file) => file.name).join(", ")}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">{success}</div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || loading || !selectedJobId}
              className="w-full rounded-xl bg-[#4169E1] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploading ? "กำลังอัปโหลด..." : "บันทึกเอกสาร"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <NotebookText className="w-5 h-5 text-[#4169E1]" />
            <h2 className="text-lg font-bold text-slate-800">เอกสารที่บันทึกไว้</h2>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              ยังไม่มีเอกสารสำหรับตำแหน่งนี้
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.ID} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{doc.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{doc.document_type} • {doc.file_name}</div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      {doc.document_type}
                    </span>
                  </div>

                  {doc.description && (
                    <div className="mt-2 text-xs text-slate-500">{doc.description}</div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <a
                      href={`${getBackendBaseUrl()}${doc.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#4169E1]"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      เปิดไฟล์
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.ID)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบ
                    </button>
                    <span className="text-[11px] text-slate-400">{new Date(doc.created_at).toLocaleDateString("th-TH")}</span>
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
