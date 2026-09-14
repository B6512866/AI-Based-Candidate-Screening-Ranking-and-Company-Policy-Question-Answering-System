import { useState, JSX } from "react";
import {
    RefreshCw,
    Calendar,
    Video,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    Edit3,
    Trash2,
    ExternalLink,
} from "lucide-react";
import { parseInterviewFormatDescription } from "./interviewTemplates";
import { formatPhoneNumber } from "../rules/rule";

export interface InterviewTableTabProps {
    interviews: any[];
    loadingInterviews: boolean;
    onRefresh: () => void;
    onEditInterview: (iv: any) => void;
    onDeleteInterview: (id: number) => void;
    statusMap: Record<string, string>;
    statusStyles: Record<string, string>;
    formatIcons: Record<string, JSX.Element>;
    formatLabels: Record<string, string>;
    formatThaiDate: (dateStr: string) => string;
    formatTime: (dateStr: string) => string;
}

/**
 * แท็บที่ 2: ตารางการสัมภาษณ์ (ค้นหา/กรองตามสถานะ, ปุ่มรีเฟรช, ตารางแสดงรายการนัดหมาย พร้อมปุ่มแก้ไข/ลบ)
 */
export function InterviewTableTab({
    interviews,
    loadingInterviews,
    onRefresh,
    onEditInterview,
    onDeleteInterview,
    statusMap,
    statusStyles,
    formatIcons,
    formatLabels,
    formatThaiDate,
    formatTime,
}: InterviewTableTabProps) {
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    const filteredInterviews =
        filterStatus === "ทั้งหมด"
            ? interviews
            : interviews.filter((iv) => {
                  const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
                  return thaiStatus === filterStatus;
              });

    return (
        <div className="p-6 space-y-6">
            {/* Header + Filter & Refresh */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-slate-800">ตารางเวลาสัมภาษณ์</h3>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        ทั้งหมด {filteredInterviews.length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold">กรองด้วยสถานะสัมภาษณ์</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all cursor-pointer"
                        >
                            <option>ทั้งหมด</option>
                            <option>ยืนยันแล้ว</option>
                            <option>รอยืนยัน</option>
                            <option>ขอเลื่อนนัด</option>
                            <option>ยกเลิก</option>
                        </select>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loadingInterviews}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm hover:shadow"
                        title="รีเฟรชข้อมูลตารางเวลาสัมภาษณ์"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${
                                loadingInterviews ? "animate-spin text-[#4169E1]" : "text-slate-500"
                            }`}
                        />
                        <span>รีเฟรชข้อมูล</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                ผู้สมัคร / ตำแหน่ง
                            </th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                วันและเวลาสัมภาษณ์
                            </th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                รูปแบบสัมภาษณ์
                            </th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                ลิงก์ / สถานที่ / เบอร์โทรศัพท์
                            </th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                สถานะ
                            </th>
                            <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">
                                จัดการ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loadingInterviews ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-400 text-sm font-medium">
                                    กำลังโหลดข้อมูล...
                                </td>
                            </tr>
                        ) : filteredInterviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-400 text-sm font-medium">
                                    ไม่พบข้อมูลนัดสัมภาษณ์
                                </td>
                            </tr>
                        ) : (
                            filteredInterviews.map((iv) => {
                                const cand = iv.application?.Candidate || iv.Application?.Candidate;
                                const job = iv.application?.JobPosition || iv.Application?.JobPosition;
                                const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
                                return (
                                    <tr key={iv.ID} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                                                {cand?.first_name} {cand?.last_name}
                                            </p>
                                            {(() => {
                                                const rawTitle = job?.title || iv.position || "-";
                                                const match = rawTitle.match(/^(.*?)\s*(\(.*?\))$/);
                                                const mainTitle = match ? match[1] : rawTitle;
                                                const subTitle = match ? match[2] : "";

                                                return (
                                                    <div className="mt-0.5">
                                                        <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                                            {mainTitle}
                                                        </p>
                                                        {subTitle && (
                                                            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                                                                {subTitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 whitespace-nowrap">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span className="whitespace-nowrap">{formatThaiDate(iv.interview_datetime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>เวลา {formatTime(iv.interview_datetime)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {(() => {
                                                const fullLabel = formatLabels[iv.format] || iv.format;
                                                const match = fullLabel.match(/^(.*?)\s*(\(.*?\))$/);
                                                const mainLabel = match ? match[1] : fullLabel;
                                                const subLabel = match ? match[2] : "";

                                                return (
                                                    <div className="flex items-start gap-2 text-slate-700">
                                                        <div className="mt-0.5 shrink-0">
                                                            {formatIcons[iv.format] || (
                                                                <Video className="w-4 h-4 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                                                                {mainLabel}
                                                            </p>
                                                            {subLabel && (
                                                                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                                                                    {subLabel}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-5 py-4">
                                            {(() => {
                                                const parsed = parseInterviewFormatDescription(iv.format_description);
                                                if (iv.format === "online") {
                                                    const hasLink = !!parsed.link;
                                                    const href = hasLink && parsed.link.startsWith("http") ? parsed.link : `https://${parsed.link}`;
                                                    return (
                                                        <div className="space-y-1.5 max-w-xs">
                                                            {hasLink ? (
                                                                <a
                                                                    href={href}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[#4169E1] text-xs font-semibold hover:underline inline-flex items-center gap-1 group"
                                                                >
                                                                    <span className="truncate max-w-[200px]">{parsed.link}</span>
                                                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">-</span>
                                                            )}
                                                            {(parsed.meetingId || parsed.passcode) && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                                                                    {parsed.meetingId && (
                                                                        <span
                                                                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60"
                                                                            title="Meeting ID"
                                                                        >
                                                                            <span className="text-slate-400 font-semibold">Meeting ID:</span>
                                                                            <span>{parsed.meetingId}</span>
                                                                        </span>
                                                                    )}
                                                                    {parsed.passcode && (
                                                                        <span
                                                                            className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md font-medium"
                                                                            title="Passcode"
                                                                        >
                                                                            <span className="text-amber-600/80 font-semibold">Passcode:</span>
                                                                            <span>{parsed.passcode}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                if (iv.format === "onsite") {
                                                    return (
                                                        <div className="space-y-1.5 max-w-xs">
                                                            <p className="text-xs font-bold text-slate-800 break-words">
                                                                {parsed.venue || parsed.link || "-"}
                                                            </p>
                                                            {parsed.address && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                                                                    <span
                                                                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60"
                                                                        title="ที่อยู่"
                                                                    >
                                                                        <span className="text-slate-400 font-semibold shrink-0">ที่อยู่:</span>
                                                                        <span className="break-all">{parsed.address}</span>
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                if (iv.format === "phone") {
                                                    const rawPhone = parsed.link || cand?.phone || cand?.Phone || "";
                                                    return (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                            <span>{formatPhoneNumber(rawPhone) || rawPhone || "-"}</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <span className="text-sm text-slate-700 font-medium">
                                                        {parsed.link || parsed.venue || "-"}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 shadow-xs ${
                                                    statusStyles[thaiStatus] ||
                                                    "bg-slate-50 text-slate-500 border-slate-200"
                                                }`}
                                            >
                                                {thaiStatus === "ยืนยันแล้ว" && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                )}
                                                {thaiStatus === "รอยืนยัน" && (
                                                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                )}
                                                {thaiStatus === "ขอเลื่อนนัด" && (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                )}
                                                {thaiStatus === "ยกเลิก" && (
                                                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                )}
                                                {thaiStatus === "เสร็จสิ้น" && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                )}
                                                <span className="whitespace-nowrap">{thaiStatus}</span>
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => onEditInterview(iv)}
                                                    className="p-2 rounded-lg bg-indigo-50 text-[#4169E1] hover:bg-indigo-100 transition-all cursor-pointer"
                                                    title="แก้ไข"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteInterview(iv.ID)}
                                                    className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
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
    );
}

export default InterviewTableTab;
