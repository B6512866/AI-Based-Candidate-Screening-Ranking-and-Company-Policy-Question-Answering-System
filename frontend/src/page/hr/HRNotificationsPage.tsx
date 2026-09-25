import { useState, useEffect } from "react";
import {
    Bell,
    CheckCheck,
    Search,
    X,
    Sparkles,
    CalendarCheck,
    Users,
    BookOpen,
    ShieldAlert,
    ChevronRight,
    Plus,
    Trash2,
    Clock,
    Send
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationService, NotificationItem } from "../../services/notificationService";

export default function HRNotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    // New Announcement / Notification Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [newCategory, setNewCategory] = useState<NotificationItem["category"]>("hr");
    const [newTargetRole, setNewTargetRole] = useState<"EMPLOYEE" | "HR" | "ALL">("EMPLOYEE");
    const [newLinkPath, setNewLinkPath] = useState("");
    const [newLinkText, setNewLinkText] = useState("");

    const loadNotifications = () => {
        const notifs = notificationService.getNotifications("HR");
        setNotifications(notifs);
    };

    useEffect(() => {
        notificationService.fetchNotifications("HR");
        loadNotifications();
        const unsubscribe = notificationService.subscribe(loadNotifications);
        return () => unsubscribe();
    }, []);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleMarkAllRead = () => {
        const updated = notificationService.markAllAsRead("HR");
        setNotifications(updated);
    };

    const handleSelectNotif = (notif: NotificationItem) => {
        setSelectedNotif(notif);
        if (!notif.isRead) {
            const updated = notificationService.markAsRead(notif.id, "HR");
            setNotifications(updated);
        }
    };

    const handleDeleteNotif = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = notificationService.deleteNotification(id, "HR");
        setNotifications(updated);
        if (selectedNotif?.id === id) setSelectedNotif(null);
    };

    const handleCreateNotification = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newMessage.trim()) return;

        const categoryLabelMap: Record<string, string> = {
            interview: "นัดสัมภาษณ์",
            candidate: "คัดกรอง AI",
            hr: "คลังความรู้ & HR",
            announcement: "ประกาศบริษัท",
            benefit: "สวัสดิการ & วันหยุด",
            system: "ระบบ & HR"
        };

        // If target is EMPLOYEE or ALL, add to EMPLOYEE notifications
        if (newTargetRole === "EMPLOYEE" || newTargetRole === "ALL") {
            notificationService.addNotification(
                {
                    title: newTitle,
                    message: newMessage,
                    category: newCategory,
                    categoryLabel: categoryLabelMap[newCategory] || "ประกาศ",
                    linkPath: newLinkPath || undefined,
                    linkText: newLinkText || undefined,
                    isPriority: true,
                    role: "EMPLOYEE"
                },
                "EMPLOYEE"
            );
        }

        // If target is HR or ALL, add to HR notifications
        if (newTargetRole === "HR" || newTargetRole === "ALL") {
            notificationService.addNotification(
                {
                    title: newTitle,
                    message: newMessage,
                    category: newCategory,
                    categoryLabel: categoryLabelMap[newCategory] || "ประกาศ",
                    linkPath: newLinkPath || undefined,
                    linkText: newLinkText || undefined,
                    isPriority: true,
                    role: "HR"
                },
                "HR"
            );
        }

        setShowAddModal(false);
        setNewTitle("");
        setNewMessage("");
        setNewLinkPath("");
        setNewLinkText("");
        alert("ส่งประกาศ / การแจ้งเตือนเรียบร้อยแล้ว");
    };

    const filteredNotifs = notifications.filter((n) => {
        const matchesTab =
            activeTab === "all" ||
            (activeTab === "unread" && !n.isRead) ||
            n.category === activeTab;
        const matchesSearch =
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getCategoryBadge = (category: string, categoryLabel: string) => {
        switch (category) {
            case "interview":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <CalendarCheck className="w-3 h-3" />
                        {categoryLabel}
                    </span>
                );
            case "candidate":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-[#4169E1] border border-indigo-200">
                        <Users className="w-3 h-3" />
                        {categoryLabel}
                    </span>
                );
            case "hr":
            case "knowledge":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <BookOpen className="w-3 h-3" />
                        {categoryLabel}
                    </span>
                );
            case "announcement":
            case "benefit":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {categoryLabel}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <ShieldAlert className="w-3 h-3" />
                        {categoryLabel}
                    </span>
                );
        }
    };

    return (
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto font-sans">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold backdrop-blur-md">
                            <Bell className="w-3.5 h-3.5" />
                            ศูนย์การแจ้งเตือน HR & ประกาศองค์กร
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">การแจ้งเตือน HR</h1>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                            ติดตามข่าวสาร การนัดสัมภาษณ์ รายงานผลคัดกรอง AI และประกาศข่าวสารไปยังพนักงาน
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#4169E1] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            สร้างประกาศ / ส่งแจ้งเตือน
                        </button>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer backdrop-blur-sm"
                            >
                                <CheckCheck className="w-4 h-4" />
                                อ่านทั้งหมด ({unreadCount})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    {[
                        { id: "all", label: `ทั้งหมด (${notifications.length})` },
                        { id: "unread", label: `ยังไม่อ่าน (${unreadCount})` },
                        { id: "interview", label: "นัดสัมภาษณ์" },
                        { id: "candidate", label: "คัดกรอง AI" },
                        { id: "hr", label: "คลังความรู้ & HR" },
                        { id: "system", label: "ระบบ" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                                activeTab === tab.id
                                    ? "bg-[#4169E1] text-white shadow-md shadow-indigo-200"
                                    : "bg-slate-100/70 hover:bg-slate-200/80 text-slate-600"
                            }`}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาการแจ้งเตือน..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Notification List & Detail View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${selectedNotif ? "lg:col-span-7" : "lg:col-span-12"} space-y-3 transition-all`}>
                    {filteredNotifs.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
                            <Bell className="w-12 h-12 text-slate-300 mx-auto opacity-50" />
                            <p className="font-bold text-slate-600 text-sm">ไม่พบการแจ้งเตือน</p>
                            <p className="text-xs text-slate-400">ยังไม่มีรายการแจ้งเตือนตามเงื่อนไขที่คุณเลือก</p>
                        </div>
                    ) : (
                        filteredNotifs.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleSelectNotif(item)}
                                className={`group bg-white rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden ${
                                    selectedNotif?.id === item.id
                                        ? "border-[#4169E1] ring-2 ring-indigo-500/20 shadow-md"
                                        : item.isRead
                                        ? "border-slate-200/70 hover:border-slate-300 opacity-85 hover:opacity-100"
                                        : "border-indigo-100 bg-gradient-to-r from-indigo-50/30 to-white shadow-xs hover:border-indigo-200"
                                }`}
                            >
                                {!item.isRead && (
                                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#4169E1] ring-4 ring-indigo-50"></span>
                                )}

                                <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getCategoryBadge(item.category, item.categoryLabel)}
                                            {item.isPriority && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                                    สำราญด่วน
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium ml-auto">
                                                <Clock className="w-3 h-3 text-slate-300" />
                                                {item.timestamp}
                                            </span>
                                        </div>

                                        <h3 className={`text-base ${item.isRead ? "font-semibold text-slate-700" : "font-black text-slate-900"} group-hover:text-[#4169E1] transition-colors`}>
                                            {item.title}
                                        </h3>

                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                            {item.message}
                                        </p>

                                        {item.linkPath && (
                                            <div className="pt-1 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4169E1] group-hover:underline">
                                                    {item.linkText || "ดูรายละเอียด"}
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </span>

                                                <button
                                                    onClick={(e) => handleDeleteNotif(item.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="ลบการแจ้งเตือน"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail View Panel */}
                {selectedNotif && (
                    <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-lg space-y-6 sticky top-24 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                {getCategoryBadge(selectedNotif.category, selectedNotif.categoryLabel)}
                            </div>
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-xl font-black text-slate-800 leading-snug">
                                {selectedNotif.title}
                            </h2>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {selectedNotif.timestamp}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-xs leading-relaxed font-medium whitespace-pre-wrap">
                            {selectedNotif.message}
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            {selectedNotif.linkPath && (
                                <button
                                    onClick={() => navigate(selectedNotif.linkPath!)}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#4169E1] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer"
                                >
                                    <span>{selectedNotif.linkText || "เปิดไปยังหน้าที่เกี่ยวข้อง"}</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={(e) => handleDeleteNotif(selectedNotif.id, e)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs transition-all cursor-pointer border border-transparent hover:border-rose-100"
                            >
                                <Trash2 className="w-4 h-4" />
                                ลบการแจ้งเตือนนี้
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Notification / Announcement Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-[#4169E1] rounded-2xl">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">สร้างประกาศ / ส่งการแจ้งเตือน</h2>
                                    <p className="text-slate-400 text-xs">ส่งข้อความแจ้งเตือนใหม่ไปยังกลุ่มผู้ใช้งานที่กำหนด</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNotification} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">กลุ่มเป้าหมายผู้รับ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "EMPLOYEE", label: "พนักงานทั้งหมด" },
                                        { id: "HR", label: "ทีม HR" },
                                        { id: "ALL", label: "ทุกคนในระบบ" }
                                    ].map((target) => (
                                        <button
                                            key={target.id}
                                            type="button"
                                            onClick={() => setNewTargetRole(target.id as any)}
                                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                newTargetRole === target.id
                                                    ? "bg-[#4169E1] text-white border-[#4169E1]"
                                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            {target.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อประกาศ / แจ้งเตือน *</label>
                                <input
                                    type="text"
                                    required
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="เช่น ประกาศวันหยุดบริษัท หรือ แจ้งกำหนดการอบรม"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#4169E1]"
                                >
                                    <option value="announcement">📢 ประกาศบริษัท</option>
                                    <option value="benefit">🎁 สวัสดิการ & วันหยุด</option>
                                    <option value="hr">📚 คลังความรู้ & HR</option>
                                    <option value="interview">📅 นัดสัมภาษณ์</option>
                                    <option value="candidate">👥 คัดกรอง AI / ผู้สมัคร</option>
                                    <option value="system">⚙️ ระบบ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียดข้อความ *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="กรอกรายละเอียดข้อความประกาศ..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Path ลิ้งก์ปลายทาง (ระบุหรือไม่ก็ได้)</label>
                                    <input
                                        type="text"
                                        value={newLinkPath}
                                        onChange={(e) => setNewLinkPath(e.target.value)}
                                        placeholder="เช่น /employee/documents"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#4169E1]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความปุ่มกด</label>
                                    <input
                                        type="text"
                                        value={newLinkText}
                                        onChange={(e) => setNewLinkText(e.target.value)}
                                        placeholder="เช่น ดูเอกสารแนบ"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#4169E1]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-xs transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-white bg-[#4169E1] hover:bg-blue-600 font-bold text-xs transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    ส่งประกาศทันที
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
