import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Upload, Plus, Edit3, Save, Trash2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { getallknowledge, getbyidknowledge, createknowledge, updateknowledge, deleteknowledge } from "../../services/knowledgeService";

interface Document {
    ID: number;
    filename: string;
    content: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export default function KnowledgePage() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [editFilename, setEditFilename] = useState("");
    const [editContent, setEditContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // New Doc Modal
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const data = await getallknowledge();
            if (data && data.data) {
                setDocs(data.data);
                if (data.data.length > 0) {
                    selectDoc(data.data[0]);
                }
                console.log(data);
            }
        } catch (err: unknown) {
            setMessage({ text: "เกิดข้อผิดพลาดในการโหลดข้อมูล", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const selectDoc = (doc: Document) => {
        setSelectedDoc(doc);
        setEditFilename(doc.filename);
        setEditContent(doc.content);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!editFilename.trim() || !editContent.trim()) {
            setMessage({ text: "กรุณากรอกชื่อไฟล์และเนื้อหาเอกสารให้ครบถ้วน", type: "error" });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            if (isCreating) {
                // POST Create
                const data = await createknowledge(editFilename, editContent)
                if (data) {
                    setMessage({ text: "สร้างเอกสารใหม่สำเร็จ! ข้อมูลถูกเก็บลง Database แล้ว", type: "success" });
                    setIsCreating(false);
                    await fetchDocs();
                    if (data.data) selectDoc(data.data);
                } else {
                    throw new Error(data.error || "สร้างเอกสารไม่สำเร็จ");
                }
            } else if (selectedDoc) {
                // PUT Update
                const data = await updateknowledge(selectedDoc.ID, editFilename, editContent);
                if (data) {
                    setMessage({ text: "บันทึกแก้ไขเอกสารลง Database สำเร็จแล้ว!", type: "success" });
                    await fetchDocs();
                } else {
                    throw new Error(data.error || "อัปเดตไม่สำเร็จ");
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
        if (!window.confirm("คุณต้องการลบเอกสารนี้ใช่หรือไม่?")) return;
        try {
            const data = await deleteknowledge(id);
            if (data) {
                setMessage({ text: "ลบเอกสารสำเร็จ", type: "success" });
                setSelectedDoc(null);
                fetchDocs();
            }
        } catch {
            setMessage({ text: "ลบเอกสารไม่สำเร็จ", type: "error" });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = evt => {
            const content = evt.target?.result as string || "";
            setIsCreating(true);
            setSelectedDoc(null);
            setEditFilename(file.name);
            setEditContent(content);
        };
        reader.readAsText(file, "utf-8");
    };

    const startNewDoc = () => {
        setIsCreating(true);
        setSelectedDoc(null);
        setEditFilename("เอกสารนโยบายใหม่.txt");
        setEditContent("");
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">คลังความรู้และนโยบายองค์กร</h1>
                    <p className="text-slate-400 text-sm mt-1">จัดการเอกสารนโยบายและระเบียบบริษัท (เก็บใน Database สำหรับให้ AI ตอบคำถาม)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm text-sm"
                    >
                        <Upload className="w-4 h-4 text-[#4169E1]" />
                        อัปโหลดไฟล์ .txt
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={startNewDoc}
                        className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มเอกสารใหม่
                    </button>
                </div>
            </div>

            {/* Notification message */}
            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm animate-fadeIn ${message.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    {message.text}
                </div>
            )}

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Document list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#4169E1]" />
                            <h3 className="font-bold text-slate-700 text-sm">รายการเอกสารใน Database</h3>
                        </div>
                        <span className="text-xs font-bold bg-indigo-50 text-[#4169E1] px-2.5 py-1 rounded-full">
                            {docs.length} รายการ
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-50">
                        {loading ? (
                            <div className="py-12 text-center text-slate-400 text-sm">กำลังโหลดเอกสาร...</div>
                        ) : docs.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">ยังไม่มีเอกสารในคลัง</div>
                        ) : (
                            docs.map(doc => {
                                const isSelected = selectedDoc?.ID === doc.ID && !isCreating;
                                return (
                                    <div
                                        key={doc.ID}
                                        onClick={() => selectDoc(doc)}
                                        className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${isSelected ? "bg-indigo-50/70 border border-indigo-100" : "hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[#4169E1] text-white" : "bg-slate-100 text-slate-500"}`}>
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-sm truncate ${isSelected ? "text-[#4169E1]" : "text-slate-800"}`}>
                                                    {doc.filename}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                    {doc.content.substring(0, 60)}...
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.ID); }}
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

                {/* Right: Document Editor */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    {!selectedDoc && !isCreating ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Edit3 className="w-8 h-8 text-[#4169E1]" />
                            </div>
                            <p className="text-slate-700 font-bold text-lg">เลือกเอกสารเพื่อดูหรือแก้ไข</p>
                            <p className="text-slate-400 text-sm">คลิกที่รายการเอกสารทางซ้าย หรือกด "เพิ่มเอกสารใหม่"</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Editor Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3 flex-1 mr-4">
                                    <FileText className="w-5 h-5 text-[#4169E1] shrink-0" />
                                    <input
                                        type="text"
                                        value={editFilename}
                                        onChange={e => setEditFilename(e.target.value)}
                                        placeholder="ชื่อไฟล์เอกสาร (เช่น นโยบายการลา.txt)"
                                        className="font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#4169E1]/30"
                                    />
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200 text-sm shrink-0 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "กำลังบันทึก..." : isCreating ? "บันทึกสร้างใหม่" : "บันทึกแก้ไขใน DB"}
                                </button>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 p-6 flex flex-col bg-white">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    เนื้อหาเอกสาร (ข้อความระเบียบ/นโยบายบริษัท):
                                </label>
                                <textarea
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    placeholder="กรอกเนื้อหานโยบายบริษัทที่นี่..."
                                    className="flex-1 w-full bg-slate-50/60 border border-slate-100 rounded-xl p-5 text-sm text-slate-800 leading-relaxed font-sans outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
