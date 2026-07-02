import { useState } from "react";
import { Plus, Clock, Video, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

interface Interview {
    id: string;
    candidateName: string;
    position: string;
    interviewer: string;
    date: string;
    time: string;
    type: "Online (Google Meet)" | "On-site (ห้องประชุม 3)";
    status: "ยืนยันแล้ว" | "รอตอบรับ";
}

const mockInterviews: Interview[] = [
    { id: "1", candidateName: "คุณสมชาย ใจดี", position: "Senior Full-Stack Developer", interviewer: "คุณทรัพยากร บุคคล (HR)", date: "วันนี้, 29 มิ.ย. 2026", time: "10:30 - 11:30 น.", type: "Online (Google Meet)", status: "ยืนยันแล้ว" },
    { id: "2", candidateName: "คุณวิภาวรรณ สุขเสริฐ", position: "UX/UI Designer", interviewer: "คุณทรัพยากร บุคคล (HR)", date: "วันนี้, 29 มิ.ย. 2026", time: "14:00 - 15:00 น.", type: "On-site (ห้องประชุม 3)", status: "รอตอบรับ" },
    { id: "3", candidateName: "คุณกิตติศักดิ์ พรหมดี", position: "HR Business Partner", interviewer: "คุณทรัพยากร บุคคล (HR)", date: "พรุ่งนี้, 30 มิ.ย. 2026", time: "11:00 - 12:00 น.", type: "Online (Google Meet)", status: "ยืนยันแล้ว" },
];

export default function InterviewsPage() {
    const [interviews] = useState<Interview[]>(mockInterviews);

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">นัดหมายสัมภาษณ์</h1>
                    <p className="text-slate-400 text-sm mt-1">ตารางนัดหมายสัมภาษณ์ผู้สมัครงาน</p>
                </div>
                <button className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 text-sm">
                    <Plus className="w-4 h-4" />
                    นัดหมายใหม่
                </button>
            </div>

            {/* List of interviews */}
            <div className="space-y-4">
                {interviews.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.status === "ยืนยันแล้ว" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                    }`}>
                                    {item.status === "ยืนยันแล้ว" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {item.status}
                                </span>
                                <span className="text-xs font-bold text-slate-400">{item.date}</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">{item.candidateName}</h3>
                            <p className="text-sm text-slate-500 font-medium">ตำแหน่ง: <span className="text-slate-700 font-semibold">{item.position}</span></p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                            <div className="space-y-1 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>{item.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.type.includes("Online") ? <Video className="w-4 h-4 text-indigo-500" /> : <MapPin className="w-4 h-4 text-rose-500" />}
                                    <span className="font-semibold text-slate-700">{item.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="bg-indigo-50 hover:bg-indigo-100 text-[#4169E1] font-bold px-4 py-2 rounded-xl text-xs transition-all">
                                    รายละเอียด
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
