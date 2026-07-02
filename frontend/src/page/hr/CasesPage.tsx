import { useState } from "react";
import { Plus, Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface HRCase {
    id: string;
    caseNumber: string;
    title: string;
    category: string;
    employeeName: string;
    priority: "สูง" | "ปานกลาง" | "ปกติ";
    status: "กำลังดำเนินการ" | "เสร็จสิ้นแล้ว" | "รอข้อมูลเพิ่มเติม";
    createdDate: string;
}

const mockCases: HRCase[] = [
    { id: "1", caseNumber: "CASE-2026-001", title: "คำร้องขออนุมัติทำงานแบบ Hybrid Work พิเศษ", category: "สวัสดิการและการทำงาน", employeeName: "คุณศิริพรรณ งามดี", priority: "ปกติ", status: "กำลังดำเนินการ", createdDate: "27 มิ.ย. 2026" },
    { id: "2", caseNumber: "CASE-2026-002", title: "สอบถามรายละเอียดประกันสุขภาพกลุ่มเพิ่มเติม", category: "สวัสดิการพนักงาน", employeeName: "คุณธนพล เจริญสุข", priority: "ปานกลาง", status: "เสร็จสิ้นแล้ว", createdDate: "25 มิ.ย. 2026" },
    { id: "3", caseNumber: "CASE-2026-003", title: "แจ้งปรับเปลี่ยนสายงานและโอนย้ายแผนก", category: "การบริหารอัตรากำลัง", employeeName: "คุณกมลวรรณ ชัยเจริญ", priority: "สูง", status: "รอข้อมูลเพิ่มเติม", createdDate: "24 มิ.ย. 2026" },
];

export default function CasesPage() {
    const [cases] = useState<HRCase[]>(mockCases);

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">ทะเบียนของกรณี</h1>
                    <p className="text-slate-400 text-sm mt-1">บันทึก ติดตาม และจัดการกรณีข้อร้องเรียนและคำขอจากพนักงาน</p>
                </div>
                <button className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 text-sm">
                    <Plus className="w-4 h-4" />
                    เพิ่มกรณีใหม่
                </button>
            </div>

            {/* Cases Grid */}
            <div className="grid grid-cols-1 gap-4">
                {cases.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-[#4169E1] bg-indigo-50 px-2.5 py-1 rounded-md">
                                    {c.caseNumber}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.status === "เสร็จสิ้นแล้ว"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : c.status === "กำลังดำเนินการ"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-amber-50 text-amber-600"
                                    }`}>
                                    {c.status === "เสร็จสิ้นแล้ว" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {c.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{c.title}</h3>
                            <p className="text-xs text-slate-400 font-medium">
                                ผู้ยื่นคำร้อง: <span className="text-slate-700 font-semibold">{c.employeeName}</span> • หมวดหมู่: {c.category}
                            </p>
                        </div>

                        <div className="flex items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50 justify-between md:justify-end">
                            <div className="text-right text-xs text-slate-400 font-medium">
                                <div className="flex items-center gap-1.5 justify-end">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{c.createdDate}</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all border border-slate-100">
                                <FileText className="w-3.5 h-3.5" />
                                เปิดกรณี
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
