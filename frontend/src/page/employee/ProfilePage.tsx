import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    updateUserByID,
    uploadAvatar,
    getFullImageUrl,
    UserProfile,
} from "../../services/userService";
import {
    User,
    Mail,
    Phone,
    Briefcase,
    Building,
    Shield,
    HeartPulse,
    Award,
    Lock,
    Edit3,
    Check,
    X,
    Sparkles,
    Camera,
    Loader2,
    Users,
    Search,
    AlertCircle,
    UserCheck,
} from "lucide-react";

export default function ProfilePage() {
    const { role, updateUser } = useAuth();
    const isHR = role === "HRManager";

    // Data States
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [allEmployees, setAllEmployees] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Tabs
    const [activeTab, setActiveTab] = useState<"personal" | "work" | "benefits" | "security" | "employees">("personal");
    const [searchQuery, setSearchQuery] = useState("");

    // Selected User to view/edit (for HR mode or current user)
    const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        address: "",
        position: "",
        department: "",
        bio: "",
        emergency_contact: "",
        emergency_phone: "",
        profile_image: "",
    });
    const [saving, setSaving] = useState(false);

    // Password Form State
    const [passwords, setPasswords] = useState({ current: "", newPass: "", confirmPass: "" });
    const [passSaving, setPassSaving] = useState(false);
    const [passError, setPassError] = useState("");
    const [passSuccess, setPassSuccess] = useState(false);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch initial profile data
    const loadProfileData = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const data = await getProfile();
            setProfile(data);

            if (isHR) {
                const emps = await getAllUsers();
                setAllEmployees(emps);
            }
        } catch (err: any) {
            console.error("Failed to fetch profile:", err);
            setErrorMsg("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [isHR]);

    const targetUser = selectedEmployee || profile;

    const fullName = targetUser
        ? `${targetUser.first_name || ""} ${targetUser.last_name || ""}`.trim()
        : "ผู้ใช้งาน";
    const initials = targetUser
        ? `${(targetUser.first_name?.[0] || "U")}${(targetUser.last_name?.[0] || "")}`.toUpperCase()
        : "U";
    const avatarUrl = getFullImageUrl(targetUser?.profile_image);

    // Handle Open Edit Modal
    const handleOpenEditModal = (empToEdit?: UserProfile) => {
        const u = empToEdit || targetUser;
        if (!u) return;
        setEditForm({
            first_name: u.first_name || "",
            last_name: u.last_name || "",
            phone: u.phone || "",
            address: u.address || "",
            position: u.position || "พนักงานองค์กร",
            department: u.department || "ทั่วไป",
            bio: u.bio || "",
            emergency_contact: u.emergency_contact || "",
            emergency_phone: u.emergency_phone || "",
            profile_image: u.profile_image || "",
        });
        setIsEditModalOpen(true);
    };

    // Handle Image Upload
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErrorMsg("");
        try {
            const uploadedUrl = await uploadAvatar(file);
            if (targetUser?.ID === profile?.ID) {
                const updated = await updateProfile({ profile_image: uploadedUrl });
                setProfile(updated);
            } else if (targetUser && isHR) {
                const updated = await updateUserByID(targetUser.ID, { profile_image: uploadedUrl });
                setSelectedEmployee(updated);
                setAllEmployees((prev) => prev.map((emp) => (emp.ID === updated.ID ? updated : emp)));
            }
            setSuccessMsg("อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setErrorMsg("ไม่สามารถอัปเดตรูปภาพได้ กรุณาลองใหม่");
        } finally {
            setUploading(false);
        }
    };

    // Handle Save Edit Form
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetUser) return;

        setSaving(true);
        setErrorMsg("");
        try {
            if (!isHR || targetUser.ID === profile?.ID) {
                const updated = await updateProfile({
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    phone: editForm.phone,
                    address: editForm.address,
                    bio: editForm.bio,
                    emergency_contact: editForm.emergency_contact,
                    emergency_phone: editForm.emergency_phone,
                    position: isHR ? editForm.position : targetUser.position,
                    department: isHR ? editForm.department : targetUser.department,
                });
                setProfile(updated);
                updateUser(updated.first_name, updated.last_name);
            } else {
                const updated = await updateUserByID(targetUser.ID, {
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    phone: editForm.phone,
                    address: editForm.address,
                    position: editForm.position,
                    department: editForm.department,
                    bio: editForm.bio,
                    emergency_contact: editForm.emergency_contact,
                    emergency_phone: editForm.emergency_phone,
                });
                setSelectedEmployee(updated);
                setAllEmployees((prev) => prev.map((emp) => (emp.ID === updated.ID ? updated : emp)));
            }

            setSuccessMsg("บันทึกการเปลี่ยนแปลงโปรไฟล์สำเร็จ!");
            setTimeout(() => setSuccessMsg(""), 3000);
            setIsEditModalOpen(false);
        } catch (err: any) {
            console.error("Save profile error:", err);
            setErrorMsg(err.response?.data?.error || "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setSaving(false);
        }
    };

    // Handle Password Change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError("");
        setPassSuccess(false);

        if (passwords.newPass !== passwords.confirmPass) {
            setPassError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
            return;
        }

        if (passwords.newPass.length < 6) {
            setPassError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setPassSaving(true);
        try {
            await changePassword({
                current_password: passwords.current,
                new_password: passwords.newPass,
            });
            setPassSuccess(true);
            setPasswords({ current: "", newPass: "", confirmPass: "" });
            setTimeout(() => setPassSuccess(false), 3000);
        } catch (err: any) {
            setPassError(err.response?.data?.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาตรวจสอบรหัสผ่านเดิม");
        } finally {
            setPassSaving(false);
        }
    };

    const filteredEmployees = allEmployees.filter((emp) => {
        const query = searchQuery.toLowerCase();
        const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const pos = (emp.position || "").toLowerCase();
        const dept = (emp.department || "").toLowerCase();
        return name.includes(query) || email.includes(query) || pos.includes(query) || dept.includes(query);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
                <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลโปรไฟล์...</p>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Notification Messages */}
            {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <span>{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <span>{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Selected Employee Switch Bar (If HR inspecting someone else) */}
            {selectedEmployee && selectedEmployee.ID !== profile?.ID && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-amber-600" />
                        <span>
                            กำลังดูและแก้ไขโปรไฟล์ของพนักงาน: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong> ({selectedEmployee.email})
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedEmployee(null)}
                        className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold transition-all text-xs"
                    >
                        กลับสู่โปรไฟล์ของฉัน
                    </button>
                </div>
            )}

            {/* Profile Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar with Upload Capability */}
                        <div className="relative group">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={fullName}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white/10 shadow-xl"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-xl ring-4 ring-white/10">
                                    {initials}
                                </div>
                            )}

                            {/* Camera overlay button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                title="เปลี่ยนรูปโปรไฟล์"
                                className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-bold text-xs transition-all backdrop-blur-xs cursor-pointer"
                            >
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 mb-1 text-teal-200" />
                                        <span>เปลี่ยนรูป</span>
                                    </>
                                )}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        {/* Name & Position Info */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold backdrop-blur-md">
                                    EMP-{targetUser?.ID ? 1000 + targetUser.ID : "000"}
                                </span>
                                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold backdrop-blur-md">
                                    {targetUser?.Role?.Name || role || "Employee"}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName}</h1>
                            <p className="text-teal-200/90 text-sm font-medium flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-teal-400" />
                                {targetUser?.position || "พนักงานองค์กร"}
                            </p>
                            <p className="text-slate-400 text-xs flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                แผนก: {targetUser?.department || "เทคโนโลยีสารสนเทศ"}
                            </p>
                        </div>
                    </div>

                    {/* Edit Profile Action Button */}
                    <button
                        onClick={() => handleOpenEditModal()}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    >
                        <Edit3 className="w-4 h-4 text-teal-300" />
                        แก้ไขข้อมูลโปรไฟล์
                    </button>
                </div>

                {/* Stat Counters / Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-teal-800/60">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">อีเมลติดต่อ</p>
                        <p className="text-sm font-bold mt-1 text-white truncate">{targetUser?.email || "-"}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">เบอร์โทรศัพท์</p>
                        <p className="text-sm font-bold mt-1 text-emerald-300">{targetUser?.phone || "ไม่ได้ระบุ"}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">สิทธิ์การใช้งาน</p>
                        <p className="text-sm font-bold mt-1 text-white">{targetUser?.Role?.Name || role}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-xs text-teal-200/80 font-medium">สถานะการทำงาน</p>
                        <p className="text-sm font-bold mt-1 text-teal-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            ทำงานปกติ (Active)
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
                {[
                    { id: "personal", label: "ข้อมูลส่วนตัว", icon: User },
                    { id: "work", label: "ข้อมูลการทำงาน", icon: Briefcase },
                    { id: "benefits", label: "สวัสดิการ & ประกัน", icon: HeartPulse },
                    { id: "security", label: "ความปลอดภัยบัญชี", icon: Shield },
                    ...(isHR ? [{ id: "employees", label: "รายชื่อพนักงานทั้งหมด (HR)", icon: Users }] : []),
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-3 rounded-t-2xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap border-b-2 cursor-pointer ${
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
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <User className="w-5 h-5 text-teal-600" />
                                รายละเอียดส่วนบุคคล
                            </h3>
                            <button
                                onClick={() => handleOpenEditModal()}
                                className="text-teal-600 hover:text-teal-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> แก้ไข
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">ชื่อ-นามสกุล:</span>
                                <span className="font-bold text-slate-800">{fullName}</span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">อีเมลองค์กร:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-teal-600" />
                                    {targetUser?.email || "-"}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">เบอร์โทรศัพท์มือถือ:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                                    {targetUser?.phone || "ยังไม่ได้ระบุ"}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-400 font-medium">ที่อยู่ปัจจุบัน:</span>
                                <span className="font-bold text-slate-800 text-right max-w-xs leading-relaxed">
                                    {targetUser?.address || "ยังไม่ได้ระบุที่อยู่"}
                                </span>
                            </div>

                            <div className="flex justify-between py-2">
                                <span className="text-slate-400 font-medium">คำอธิบาย/Bio:</span>
                                <span className="font-bold text-slate-700 text-right max-w-xs leading-relaxed">
                                    {targetUser?.bio || "ยังไม่ได้ระบุข้อมูล Bio"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-6 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Phone className="w-5 h-5 text-emerald-600" />
                                ผู้ติดต่อกรณีฉุกเฉิน
                            </h3>
                            <button
                                onClick={() => handleOpenEditModal()}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> แก้ไข
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">ชื่อผู้ติดต่อ:</span>
                                    <span className="font-bold text-slate-800">
                                        {targetUser?.emergency_contact || "ยังไม่ได้ระบุชื่อผู้ติดต่อฉุกเฉิน"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">เบอร์โทรศัพท์ฉุกเฉิน:</span>
                                    <span className="font-bold text-emerald-700">
                                        {targetUser?.emergency_phone || "ยังไม่ได้ระบุเบอร์โทรฉุกเฉิน"}
                                    </span>
                                </div>
                            </div>

                            <p className="text-slate-400 text-[11px] leading-relaxed pt-2">
                                * ข้อมูลผู้ติดต่อฉุกเฉินเป็นสิ่งสำคัญสำหรับองค์กรในกรณีที่เกิดเหตุสุดวิสัย หากเปลี่ยนแปลงสามารถอัปเดตได้ทันที
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Work Details */}
            {activeTab === "work" && (
                <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 space-y-6 shadow-2xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-teal-600" />
                            ข้อมูลตำแหน่งและองค์กร
                        </h3>
                        {isHR && (
                            <button
                                onClick={() => handleOpenEditModal()}
                                className="text-teal-600 hover:text-teal-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> แก้ไขตำแหน่ง (HR)
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">ตำแหน่งงานปัจจุบัน</p>
                                <p className="font-black text-slate-800 text-sm">{targetUser?.position || "พนักงานองค์กร"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">แผนก / สังกัด</p>
                                <p className="font-bold text-slate-800 text-sm">{targetUser?.department || "ทั่วไป"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">รหัสพนักงาน</p>
                                <p className="font-bold text-teal-700 text-sm">EMP-{targetUser?.ID ? 1000 + targetUser.ID : "000"}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">บทบาทสิทธิ์ใช้งานระบบ</p>
                                <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-teal-600" />
                                    {targetUser?.Role?.Name || role}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">อีเมลทางการ</p>
                                <p className="font-bold text-slate-800 text-sm">{targetUser?.email}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <p className="text-slate-400 font-medium">สถานะการจ้างงาน</p>
                                <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> พนักงานประจำ (Full-Time)
                                </p>
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

            {/* Tab 4: Security (Password Change) */}
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

                    {passError && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            {passError}
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
                                placeholder="อย่างน้อย 6 ตัวอักษร"
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
                                disabled={passSaving}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                            >
                                {passSaving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                                อัปเดตรหัสผ่าน
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tab 5: Employees List (HR Mode Only) */}
            {activeTab === "employees" && isHR && (
                <div className="bg-white rounded-3xl border border-slate-200/70 p-6 sm:p-8 space-y-6 shadow-2xs animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Users className="w-5 h-5 text-teal-600" />
                                การจัดการข้อมูลพนักงานในองค์กร
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                HR สามารถดูและแก้ไขโปรไฟล์ของพนักงานในองค์กรได้จากรายการด้านล่าง
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อ, อีเมล, ตำแหน่ง..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>
                    </div>

                    {filteredEmployees.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">ไม่พบพนักงานที่ตรงกับเงื่อนไขการค้นหา</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                                        <th className="p-3.5 rounded-l-xl">พนักงาน</th>
                                        <th className="p-3.5">อีเมล</th>
                                        <th className="p-3.5">ตำแหน่ง / แผนก</th>
                                        <th className="p-3.5">เบอร์โทร</th>
                                        <th className="p-3.5">สิทธิ์</th>
                                        <th className="p-3.5 text-right rounded-r-xl">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEmployees.map((emp) => {
                                        const empInitials = `${emp.first_name?.[0] || "E"}${emp.last_name?.[0] || ""}`.toUpperCase();
                                        const empImg = getFullImageUrl(emp.profile_image);
                                        const isSelected = selectedEmployee?.ID === emp.ID;

                                        return (
                                            <tr
                                                key={emp.ID}
                                                className={`hover:bg-teal-50/40 transition-colors ${
                                                    isSelected ? "bg-amber-50/60 font-semibold" : ""
                                                }`}
                                            >
                                                <td className="p-3.5 flex items-center gap-3">
                                                    {empImg ? (
                                                        <img
                                                            src={empImg}
                                                            alt={emp.first_name}
                                                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                                                            {empInitials}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-800">
                                                            {emp.first_name} {emp.last_name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">EMP-{1000 + emp.ID}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3.5 text-slate-600 font-medium">{emp.email}</td>
                                                <td className="p-3.5">
                                                    <p className="font-bold text-slate-700">{emp.position || "-"}</p>
                                                    <p className="text-[10px] text-slate-400">{emp.department || "-"}</p>
                                                </td>
                                                <td className="p-3.5 text-slate-600">{emp.phone || "-"}</td>
                                                <td className="p-3.5">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                            emp.Role?.Name === "HRManager"
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-teal-100 text-teal-700"
                                                        }`}
                                                    >
                                                        {emp.Role?.Name || "Employee"}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEmployee(emp);
                                                            setActiveTab("personal");
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] transition-all cursor-pointer"
                                                    >
                                                        ดูโปรไฟล์
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditModal(emp)}
                                                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                                                    >
                                                        แก้ไข
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-base">
                                แก้ไขข้อมูลโปรไฟล์ - {editForm.first_name} {editForm.last_name}
                            </h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">ชื่อ</label>
                                    <input
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">นามสกุล</label>
                                    <input
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="08X-XXX-XXXX"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">ตำแหน่งงาน {isHR && "(HR แก้ไขได้)"}</label>
                                    <input
                                        type="text"
                                        value={editForm.position}
                                        onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                                        disabled={!isHR}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            {isHR && (
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">แผนก / สังกัด</label>
                                    <input
                                        type="text"
                                        value={editForm.department}
                                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-slate-700 mb-1.5">ที่อยู่ปัจจุบัน</label>
                                <textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    rows={2}
                                    placeholder="ที่อยู่สำหรับจัดส่งเอกสารและติดต่อ..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1.5">แนะนำตัวเอง / Bio</label>
                                <textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    rows={2}
                                    placeholder="ประวัติย่อ ความเชี่ยวชาญ หรือข้อมูลทั่วไป..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">ชื่อผู้ติดต่อฉุกเฉิน</label>
                                    <input
                                        type="text"
                                        value={editForm.emergency_contact}
                                        onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                                        placeholder="ชื่อ-นามสกุล / ความสัมพันธ์"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1.5">เบอร์โทรผู้ติดต่อฉุกเฉิน</label>
                                    <input
                                        type="text"
                                        value={editForm.emergency_phone}
                                        onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                                        placeholder="08X-XXX-XXXX"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-500/20 cursor-pointer"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                                    บันทึกการเปลี่ยนแปลง
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
