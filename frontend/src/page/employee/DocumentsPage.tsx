import { useState, useEffect } from "react";
import {
    FileText,
    Search,
    Download,
    Eye,
    BookOpen,
    Shield,
    Award,
    FileCheck,
    Clock,
    Sparkles,
    X,
    Copy,
    Check,
    Filter,
    UploadCloud,
    FolderKanban,
    ChevronRight,
    ExternalLink,
} from "lucide-react";
import { getallknowledge } from "../../services/knowledgeService";

interface PolicyDoc {
    id: string | number;
    title: string;
    category: "policy" | "welfare" | "contract" | "guide";
    categoryLabel: string;
    updatedAt: string;
    size: string;
    content: string;
    isFromDb?: boolean;
    format: "PDF" | "DOCX" | "TXT";
}

const DEFAULT_DOCUMENTS: PolicyDoc[] = [
    {
        id: "doc-1",
        title: "คู่มือพนักงานและข้อบังคับการทำงานประจำปี 2026",
        category: "policy",
        categoryLabel: "นโยบาย & ข้อบังคับ",
        updatedAt: "2026-01-10",
        size: "2.4 MB",
        format: "PDF",
        content: `ข้อบังคับเกี่ยวกับการทำงานและระเบียบบริษัท (ฉบับปี 2569)
1. เวลาปฏิบัติงานปกติ: วันจันทร์ - ศุกร์ เวลา 08:30 น. - 17:30 น.
2. การลงเวลาเข้า-ออกงาน: บันทึกผ่านระบบแอปพลิเคชันหรือสแกนใบหน้า
3. วันหยุดและสิทธิการลา:
   - ลาป่วย: ได้ไม่เกิน 30 วันทำงานต่อปี (ยื่นใบรับรองแพทย์เมื่อลาติดต่อกัน 3 วันขึ้นไป)
   - ลากิจได้รับค่าจ้าง: 6 วันทำงานต่อปี
   - ลาพักร้อนประจำปี: 10-15 วัน ตามอายุงาน
4. นโยบายการรักษาความลับและจริยธรรมองค์กร (Code of Conduct)`,
    },
    {
        id: "doc-2",
        title: "รายละเอียดสวัสดิการค่ารักษาพยาบาลและประกันกลุ่ม",
        category: "welfare",
        categoryLabel: "สวัสดิการ & ประกันสังคม",
        updatedAt: "2026-02-01",
        size: "1.8 MB",
        format: "PDF",
        content: `รายละเอียดความคุ้มครองประกันสุขภาพกลุ่มสำหรับพนักงานประจำ
- ค่ารักษาพยาบาลผู้ป่วยนอก (OPD): 2,000 บาท / ครั้ง (ไม่เกิน 30 ครั้งต่อปี)
- ค่ารักษาพยาบาลผู้ป่วยใน (IPD): ค่าห้องและอาหาร 4,000 บาท / วัน
- ค่าทำฟันและตรวจสุขภาพประจำปี: วงเงิน 5,000 บาท / ปี
- การเคลมประกัน: สามารถใช้บัตรประชาชนยื่นสิทธิกับโรงพยาบาลในเครือคู่สัญญาได้ทันที`,
    },
    {
        id: "doc-3",
        title: "สัญญาจ้างงานและข้อตกลงการรักษาความลับ (NDA)",
        category: "contract",
        categoryLabel: "เอกสารส่วนตัว & สัญญา",
        updatedAt: "2025-11-15",
        size: "950 KB",
        format: "PDF",
        content: `หนังสือสัญญาจ้างงานและข้อตกลงพนักงาน
- ตำแหน่งการจ้างงาน: พนักงานประจำองค์กร
- เงื่อนไขการรักษาความลับทางการค้า ข้อมูลลูกค้า และซอร์สโค้ดระบบ
- ห้ามนำข้อมูลทรัพย์สินทางปัญญาของบริษัทไปเผยแพร่แก่บุคคลภายนอก`,
    },
    {
        id: "doc-4",
        title: "แนวทางการทำงานแบบ Hybrid Work & Flexible Hours",
        category: "guide",
        categoryLabel: "คู่มือพนักงาน",
        updatedAt: "2026-03-01",
        size: "1.2 MB",
        format: "DOCX",
        content: `แนวทางการปฏิบัติงานแบบผสมผสาน (Hybrid Workplace Model)
- พนักงานสามารถเข้าปฏิบัติงาน ณ สำนักงานอย่างน้อย 3 วันต่อสัปดาห์
- การทำงานจากที่พักอาศัย (WFH) ต้องลงทะเบียนแจ้งหัวหน้างานผ่านระบบล่วงหน้า
- อุปกรณ์คอมพิวเตอร์และเบี้ยเลี้ยงค่าอินเทอร์เน็ตสนับสนุน 1,000 บาท / เดือน`,
    },
];

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<PolicyDoc[]>(DEFAULT_DOCUMENTS);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<PolicyDoc | null>(null);
    const [copied, setCopied] = useState(false);

    // Request Document Modal State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestType, setRequestType] = useState("salary_cert");
    const [requestNote, setRequestNote] = useState("");
    const [requestSubmitted, setRequestSubmitted] = useState(false);

    // Fetch DB documents from Knowledge API
    useEffect(() => {
        const fetchDbDocs = async () => {
            setLoading(true);
            try {
                const res = await getallknowledge();
                if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
                    const mappedDbDocs: PolicyDoc[] = res.data.map((item: any) => ({
                        id: `db-${item.ID}`,
                        title: item.filename || `เอกสารนโยบาย #${item.ID}`,
                        category: "policy",
                        categoryLabel: "นโยบายบริษัท (Database)",
                        updatedAt: item.UpdatedAt ? new Date(item.UpdatedAt).toISOString().split("T")[0] : "2026-03-10",
                        size: "1.5 MB",
                        format: "TXT",
                        content: item.content || "ไม่มีเนื้อหา",
                        isFromDb: true,
                    }));

                    // Combine unique documents
                    setDocuments([...mappedDbDocs, ...DEFAULT_DOCUMENTS]);
                }
            } catch (err) {
                console.error("Failed to fetch knowledge docs:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDbDocs();
    }, []);

    // Filtering logic
    const filteredDocs = documents.filter((doc) => {
        const matchesCategory =
            activeTab === "all" ||
            (activeTab === "db" && doc.isFromDb) ||
            doc.category === activeTab;
        const matchesSearch =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    const handleCopyContent = () => {
        if (!selectedDoc) return;
        navigator.clipboard.writeText(`${selectedDoc.title}\n\n${selectedDoc.content}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadDoc = (doc: PolicyDoc) => {
        const blob = new Blob([`${doc.title}\n\n${doc.content}`], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.title.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setRequestSubmitted(true);
        setTimeout(() => {
            setRequestSubmitted(false);
            setIsRequestModalOpen(false);
            setRequestNote("");
        }, 2000);
    };

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            {/* Executive Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold backdrop-blur-md">
                            <Shield className="w-3.5 h-3.5" />
                            ศูนย์รวมเอกสารและข้อบังคับองค์กร
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">เอกสารของฉัน</h1>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                            เข้าถึงสัญญาจ้างงาน นโยบายบริษัท สวัสดิการ และขอเอกสารรับรองทางการได้ง่ายๆ ในที่เดียว
                        </p>
                    </div>

                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm shadow-lg shadow-teal-500/30 hover:shadow-teal-400/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <FileCheck className="w-4 h-4" />
                        ขอหนังสือรับรอง / เอกสาร
                    </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-teal-700/50">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-teal-400/20 text-teal-300">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black">{documents.length}</p>
                                <p className="text-xs text-teal-200/80 font-medium">เอกสารทั้งหมด</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-400/20 text-emerald-300">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black">
                                    {documents.filter((d) => d.category === "policy" || d.isFromDb).length}
                                </p>
                                <p className="text-xs text-teal-200/80 font-medium">นโยบายองค์กร</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-400/20 text-cyan-300">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black">
                                    {documents.filter((d) => d.category === "welfare").length}
                                </p>
                                <p className="text-xs text-teal-200/80 font-medium">สวัสดิการ & ประกัน</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black">2026</p>
                                <p className="text-xs text-teal-200/80 font-medium">อัปเดตล่าสุด</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    {[
                        { id: "all", label: "ทั้งหมด" },
                        { id: "policy", label: "นโยบายบริษัท" },
                        { id: "welfare", label: "สวัสดิการ" },
                        { id: "contract", label: "สัญญาจ้างงาน" },
                        { id: "guide", label: "คู่มือพนักงาน" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/20"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[260px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาเอกสารหรือข้อความ..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Documents Cards Grid */}
            {loading ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
                    <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 font-semibold text-sm">กำลังโหลดเอกสารบริษัท...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <FolderKanban className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                        <h3 className="text-slate-800 font-bold text-lg">ไม่พบเอกสารตรงตามที่ค้นหา</h3>
                        <p className="text-slate-400 text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่เอกสารใหม่อีกครั้ง</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="bg-white rounded-3xl border border-slate-200/70 hover:border-teal-300 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/5 group flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="space-y-4">
                                {/* Badge & Format Header */}
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border ${
                                            doc.category === "policy"
                                                ? "bg-teal-50 text-teal-700 border-teal-100"
                                                : doc.category === "welfare"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                : doc.category === "contract"
                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                        }`}
                                    >
                                        {doc.categoryLabel}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {doc.format}
                                    </span>
                                </div>

                                {/* Title & Snippet */}
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-teal-700 transition-colors line-clamp-2">
                                        {doc.title}
                                    </h3>
                                    <p className="text-slate-400 text-xs mt-2 line-clamp-3 leading-relaxed">
                                        {doc.content}
                                    </p>
                                </div>
                            </div>

                            {/* Footer & Actions */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                                    {doc.updatedAt}
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownloadDoc(doc)}
                                        title="ดาวน์โหลด"
                                        className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedDoc(doc)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        อ่านเอกสาร
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Document Reader Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-slate-800 truncate">{selectedDoc.title}</h2>
                                    <p className="text-xs text-slate-400 flex items-center gap-2">
                                        <span>{selectedDoc.categoryLabel}</span>
                                        <span>•</span>
                                        <span>อัปเดต: {selectedDoc.updatedAt}</span>
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedDoc(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Document Content Reader Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white space-y-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-teal-900 text-xs font-medium flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-teal-600" />
                                    คุณสามารถถามข้อมูลเพิ่มเติมจากเอกสารนี้กับ AI Advisor ได้ทันที
                                </span>
                            </div>

                            <div className="prose max-w-none text-slate-700 leading-relaxed font-sans pt-2">
                                {selectedDoc.content}
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <button
                                onClick={handleCopyContent}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? "คัดลอกสำเร็จ!" : "คัดลอกเนื้อหา"}
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedDoc(null)}
                                    className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-200/60 transition-colors"
                                >
                                    ปิดหน้าต่าง
                                </button>
                                <button
                                    onClick={() => handleDownloadDoc(selectedDoc)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-md shadow-teal-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    ดาวน์โหลดไฟล์
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Certificate Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">ขอหนังสือรับรอง / เอกสาร</h3>
                                    <p className="text-xs text-slate-400">ยื่นคำร้องขอเอกสารรับรองจากแผนก HR</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRequestModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {requestSubmitted ? (
                            <div className="py-8 text-center space-y-3">
                                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg">ยื่นคำขอสำเร็จ!</h4>
                                <p className="text-slate-400 text-xs">
                                    เจ้าหน้าที่ HR จะดำเนินการจัดทำเอกสารและแจ้งเตือนคุณภายใน 1-2 วันทำการ
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        ประเภทเอกสารที่ต้องการ
                                    </label>
                                    <select
                                        value={requestType}
                                        onChange={(e) => setRequestType(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="salary_cert">หนังสือรับรองเงินเดือน (Salary Certificate)</option>
                                        <option value="work_cert">หนังสือรับรองการทำงาน (Employment Certificate)</option>
                                        <option value="visa_cert">หนังสือรับรองการทำงานสำหรับยื่นขอ Visa</option>
                                        <option value="welfare_claim">เอกสารคำขอเบิกสวัสดิการเพิ่มเติม</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        วัตถุประสงค์ / หมายเหตุเพิ่มเติม
                                    </label>
                                    <textarea
                                        value={requestNote}
                                        onChange={(e) => setRequestNote(e.target.value)}
                                        rows={4}
                                        placeholder="เช่น นำไปยื่นเรื่องทำธุรกรรมธนาคาร / ยื่นขอวีซ่าท่องเที่ยว..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                        required
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsRequestModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20"
                                    >
                                        ส่งคำขอเอกสาร
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
