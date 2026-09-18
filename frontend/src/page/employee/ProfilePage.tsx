import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Building,
    Calendar,
    Shield,
    HeartPulse,
    Award,
    Clock,
    Lock,
    Edit3,
    Check,
    X,
    UserCheck,
    KeyRound,
    Sparkles,
    FileText,
    Bell,
    ChevronRight,
} from "lucide-react";

export default function EmployeeProfile() {
    const { firstName, lastName, role } = useAuth();
    const [activeTab, setActiveTab] = useState<"personal" | "work" | "benefits" | "security">("personal");

    // Profile Details State
    const [profile, setProfile] = useState({
        firstName: firstName || "เจษฎา",
        lastName: lastName || "ชัยวัฒนกุล",
        email: "employee@company.com",
        phone: "089-123-4567",
        empId: "EMP-2026-089",
        position: "Software Developer & AI Specialist",
        department: "Technology & Innovation",
        manager: "คุณวิภาวรรณ สุขเสริฐ (Head of IT)",
        joinDate: "15 มกราคม 2024",
        status: "พนักงานประจำ (Full-Time)",
        location: "สำนักงานใหญ่ กรุงเทพฯ (Hybrid)",
        address: "99/100 แขวงพญาไท เขตราชเทวี กรุงเทพมหานคร 10400",
        emergencyName: "คุณสมชาย ชัยวัฒนกุล (บิดา)",
        emergencyPhone: "081-987-6543",
        leaveDaysRemaining: 8,
        leaveDaysTotal: 12,
        insuranceTier: "Gold Executive Care",
        pvdRate: "5%",
    });

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        phone: profile.phone,
        address: profile.address,
        emergencyName: profile.emergencyName,
        emergencyPhone: profile.emergencyPhone,
    });
    const [savedMessage, setSavedMessage] = useState(false);

    // Password State
    const [passwords, setPasswords] = useState({ current: "", newPass: "", confirmPass: "" });
    const [passSuccess, setPassSuccess] = useState(false);

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const initials = `${profile.firstName[0] || "E"}${profile.lastName[0] || ""}`.toUpperCase();

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        setProfile((prev) => ({
            ...prev,
            phone: editForm.phone,
            address: editForm.address,
            emergencyName: editForm.emergencyName,
            emergencyPhone: editForm.emergencyPhone,
        }));
        setSavedMessage(true);
        setTimeout(() => {
            setSavedMessage(false);
            setIsEditModalOpen(false);
        }, 1500);
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPass !== passwords.confirmPass) {
            alert("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
            return;
        }
        setPassSuccess(true);
        setTimeout(() => {
            setPassSuccess(false);
            setPasswords({ current: "", newPass: "", confirmPass: "" });
        }, 2000);
    };

    return (
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Executive Profile Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-xl ring-4 ring-white/10">
                                {initials}
                            </div>
                            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-950 font-bold shadow-xs">
                                ✓
                            </span>
                        </div>

                        {/* Name & Position */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold backdrop-blur-md">
                                    {profile.empId}
                                </span>
                                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold backdrop-blur-md">
                                    {profile.status}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName}</h1>
                            <p className="text-teal-200/90 text-sm font-medium flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-teal-400" />
                                {profile.position}
                            </p>
                            <p className="text-slate-400 text-xs flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                {profile.department}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-md"
                    >
                        <Edit3 className="w-4 h-4 text-teal-300" />
                        แก้ไขข้อมูลส่วนตัว
                    </button>
                </div>

                {/* Stat Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-teal-800/60">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">วันลาพักร้อนคงเหลือ</p>
                        <p className="text-2xl font-black mt-1 text-white">
                            {profile.leaveDaysRemaining} <span className="text-xs font-normal text-teal-300">/ {profile.leaveDaysTotal} วัน</span>
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">ระดับสวัสดิการสุขภาพ</p>
                        <p className="text-lg font-bold mt-1 text-emerald-300 truncate">{profile.insuranceTier}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">กองทุนสำรองเลี้ยงชีพ (PVD)</p>
                        <p className="text-2xl font-black mt-1 text-white">{profile.pvdRate}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">วันที่เริ่มงาน</p>
                        <p className="text-sm font-bold mt-1.5 text-teal-200">{profile.joinDate}</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
                {[
                    { id: "personal", label: "ข้อมูลส่วนตัว", icon: User },
                    { id: "work", label: "ข้อมูลการทำงาน", icon: Briefcase },
                    { id: "benefits", label: "สวัสดิการ & ประกัน", icon: HeartPulse },
                    { id: "security", label: "ความปลอดภัยบัญชี", icon: Shield },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-3 rounded-t-2xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap border-b-2 ${
                                activeTab === tab.id
                                    ? "border-teal-600 text-teal-700 bg-teal-50/50"
                                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${activeTab === tab.id ? "text-teal-600" : "text-slate-400"}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: Personal Details */}
            {activeTab === "personal" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-6 shadow-2xs">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                            <User className="w-5 h-5 text-teal-600" />
                            รายละเอียดส่วนบุคคล
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">ชื่อ-นามสกุล (ภาษาไทย):</span>
                                <span className="font-bold text-slate-800">{fullName}</span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">อีเมลองค์กร:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-teal-600" />
                                    {profile.email}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">เบอร์โทรศัพท์มือถือ:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                                    {profile.phone}
                                </span>
                            </div>

                            <div className="flex justify-between py-2">
                                <span className="text-slate-400 font-medium">ที่อยู่ปัจจุบัน:</span>
                                <span className="font-bold text-slate-800 text-right max-w-xs leading-relaxed">
                                    {profile.address}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-6 shadow-2xs">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Phone className="w-5 h-5 text-emerald-600" />
                            ผู้ติดต่อกรณีฉุกเฉิน
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">ชื่อผู้ติดต่อ:</span>
                                    <span className="font-bold text-slate-800">{profile.emergencyName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">เบอร์โทรศัพท์ฉุกเฉิน:</span>
                                    <span className="font-bold text-emerald-700">{profile.emergencyPhone}</span>
                                </div>
                            </div>

                            <p className="text-slate-400 text-[11px] leading-relaxed pt-2">
                                * หากต้องการเปลี่ยนแปลงผู้ติดต่อฉุกเฉิน สามารถกดปุ่ม "แก้ไขข้อมูลส่วนตัว" ด้านบนเพื่อทำการอัปเดตได้ทันที
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Work Details */}
            {activeTab === "work" && (
                <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 space-y-6 shadow-2xs animate-fadeIn">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Briefcase className="w-5 h-5 text-teal-600" />
                        ข้อมูลตำแหน่งและองค์กร
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">ตำแหน่งงานปัจจุบัน</p>
                                <p className="font-black text-slate-800 text-sm">{profile.position}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">แผนก / สังกัด</p>
                                <p className="font-bold text-slate-800 text-sm">{profile.department}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">ผู้บังคับบัญชาโดยตรง (Manager)</p>
                                <p className="font-bold text-slate-800 text-sm">{profile.manager}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">สถานที่ปฏิบัติงานหลัก</p>
                                <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-teal-600" />
                                    {profile.location}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">รหัสพนักงาน</p>
                                <p className="font-bold text-teal-700 text-sm">{profile.empId}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">สถานะสัญญาจ้าง</p>
                                <p className="font-bold text-emerald-700 text-sm">{profile.status}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Benefits */}
            {activeTab === "benefits" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-4 shadow-2xs">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                            <HeartPulse className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">ประกันสุขภาพกลุ่ม (OPD/IPD)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            วงเงินผู้ป่วยนอก OPD 2,000 บาท/ครั้ง (30 ครั้ง/ปี) และสิทธิผู้ป่วยใน IPD ตามมาตรฐานบริษัท
                        </p>
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                            สิทธิใช้งานได้ปกติ
                        </span>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-4 shadow-2xs">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Award className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">ตรวจสุขภาพ & ทำฟันประจำปี</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            วงเงินสนับสนุนค่าทันตกรรมและตรวจสุขภาพประจำปีสูงสุด 5,000 บาทต่อปีงบประมาณ
                        </p>
                        <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-bold text-[11px]">
                            วงเงินคงเหลือ 5,000 บาท
                        </span>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-4 shadow-2xs">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">กองทุนสำรองเลี้ยงชีพ (PVD)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            สะสมเข้ากองทุน 5% โดยบริษัทสมทบให้ 5% ตามเงื่อนไขอายุงานพนักงาน
                        </p>
                        <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 font-bold text-[11px]">
                            อัตราสะสม 5%
                        </span>
                    </div>
                </div>
            )}

            {/* Tab 4: Security */}
            {activeTab === "security" && (
                <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 max-w-2xl space-y-6 shadow-2xs animate-fadeIn">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Lock className="w-5 h-5 text-teal-600" />
                        เปลี่ยนรหัสผ่านเข้าสู่ระบบ
                    </h3>

                    {passSuccess && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว!
                        </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
                            <input
                                type="password"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5">รหัสผ่านใหม่</label>
                            <input
                                type="password"
                                value={passwords.newPass}
                                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                                required
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                            <input
                                type="password"
                                value={passwords.confirmPass}
                                onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                                required
                                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
                            >
                                อัปเดตรหัสผ่าน
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-base">แก้ไขข้อมูลติดต่อส่วนตัว</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {savedMessage ? (
                            <div className="py-8 text-center space-y-2">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                    <Check className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-slate-800 text-sm">บันทึกข้อมูลสำเร็จ!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์มือถือ</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">ที่อยู่ปัจจุบัน</label>
                                    <textarea
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">ผู้ติดต่อฉุกเฉิน</label>
                                        <input
                                            type="text"
                                            value={editForm.emergencyName}
                                            onChange={(e) => setEditForm({ ...editForm, emergencyName: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1.5">เบอร์โทรผู้ติดต่อฉุกเฉิน</label>
                                        <input
                                            type="text"
                                            value={editForm.emergencyPhone}
                                            onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-500/20"
                                    >
                                        บันทึกการเปลี่ยนแปลง
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
