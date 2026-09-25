import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { employeeMenuItems } from "./employeeMenu";
import { getProfile, getFullImageUrl, UserProfile } from "../../services/userService";
import { notificationService, NotificationItem } from "../../services/notificationService";
import {
    LogOut,
    Bell,
    ChevronRight,
    Sparkles,
    PanelLeftClose,
    PanelLeftOpen,
    UserCheck,
    Bot,
    CheckCheck,
} from "lucide-react";

export default function EmployeeLayout() {
    const { logout, firstName, lastName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        getProfile().then(data => setUserProfile(data)).catch(() => {});
        const loadNotifs = () => setNotifications(notificationService.getNotifications("EMPLOYEE"));
        loadNotifs();
        const unsubscribe = notificationService.subscribe(loadNotifs);
        const stopPolling = notificationService.startPolling("EMPLOYEE", 12000);
        return () => {
            unsubscribe();
            stopPolling();
        };
    }, [firstName, lastName, location.pathname]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const displayFirstName = userProfile?.first_name || firstName || "Employee";
    const displayLastName = userProfile?.last_name || lastName || "";
    const fullName = `${displayFirstName} ${displayLastName}`.trim() || "Employee";
    const initials = `${displayFirstName[0] || "E"}${displayLastName[0] || ""}`.toUpperCase();
    const avatarUrl = getFullImageUrl(userProfile?.profile_image);

    const currentPage = employeeMenuItems.find(item => location.pathname.startsWith(item.path));
    const pageTitle = currentPage?.label || "AI Advisor";

    const menuSections = [
        {
            title: "บริการ AI",
            items: employeeMenuItems.filter(item => item.id === "chat")
        },
        {
            title: "ส่วนตัว",
            items: employeeMenuItems.filter(item => item.id === "profile" || item.id === "documents" || item.id === "notifications")
        }
    ];

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 overflow-hidden ">
            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-slate-200/80 flex flex-col z-30 transition-all duration-300 ease-in-out shadow-xs relative ${
                    isCollapsed ? "w-20" : "w-64"
                }`}
            >
                {/* Logo Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between h-16">
                    {!isCollapsed ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold px-10 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100/60 ">
                                Employee
                            </span>
                        </div>
                    ) : (
                        <div className="mx-auto">
                            <img src={logo} alt="HireAI Logo" className="h-9 w-auto object-contain" />
                        </div>
                    )}

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors hidden sm:flex"
                        title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                {/* Employee AI Status Banner */}
                {!isCollapsed && (
                    <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-sm border border-teal-500/20">
                        <div className="flex items-center justify-between text-[11px] font-medium text-teal-300">
                            <span className="flex items-center gap-1.5 font-semibold">
                                <Bot className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
                                HR Policy Advisor
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                Ready
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">ถาม-ตอบ สวัสดิการ & นโยบายองค์กร</p>
                    </div>
                )}

                {/* Navigation Items */}
                <div className="px-3 py-4 flex-1 overflow-y-auto space-y-6">
                    {menuSections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {!isCollapsed && (
                                <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                    {section.title}
                                </p>
                            )}
                            <nav className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.id}
                                            to={item.path}
                                            title={isCollapsed ? item.label : undefined}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                                                isActive
                                                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/25"
                                                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                            }`}
                                        >
                                            <Icon
                                                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                                    isActive ? "text-white" : "text-slate-400 group-hover:text-teal-600"
                                                }`}
                                            />
                                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                                            {isActive && !isCollapsed && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* Bottom Access Card */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/60">
                    {!isCollapsed ? (
                        <div className="space-y-2">
                            <Link to="/employee/profile" className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs hover:border-teal-300 hover:bg-teal-50/30 transition-all group">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={fullName}
                                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                                        {initials}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-600">{fullName}</p>
                                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 truncate">
                                        <UserCheck className="w-3 h-3 text-emerald-500" /> พนักงานองค์กร
                                    </p>
                                </div>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-rose-600 font-semibold text-xs hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                ออกจากระบบ
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogout}
                            title="ออกจากระบบ"
                            className="w-10 h-10 mx-auto rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 hidden sm:inline">พนักงาน</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                        <h1 className="text-slate-800 font-bold text-base flex items-center gap-2">
                            {pageTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span>AI Assistant Powered</span>
                        </div>

                        {/* Notifications Popover */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all border border-slate-200/60 hover:text-teal-600 cursor-pointer"
                                title="การแจ้งเตือน"
                            >
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">การแจ้งเตือน</h4>
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] font-extrabold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
                                                    {unreadCount} ใหม่
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => notificationService.markAllAsRead("EMPLOYEE")}
                                                className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer flex items-center gap-1"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                อ่านทั้งหมด
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400">
                                                <p className="font-semibold text-xs">ไม่มีการแจ้งเตือน</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        notificationService.markAsRead(n.id, "EMPLOYEE");
                                                        setShowNotifications(false);
                                                        if (n.linkPath) navigate(n.linkPath);
                                                        else navigate("/employee/notifications");
                                                    }}
                                                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                                                        !n.isRead
                                                            ? "bg-teal-50/50 border-teal-100 hover:bg-teal-50/80"
                                                            : "bg-slate-50/70 border-slate-100 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-xs ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                                            {n.title}
                                                        </p>
                                                        {!n.isRead && (
                                                            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{n.message}</p>
                                                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100/60">
                                                        <span className="text-[10px] text-slate-400 font-medium">{n.timestamp}</span>
                                                        <span className="text-[10px] font-bold text-teal-600 flex items-center gap-0.5">
                                                            {n.linkText || "ดูรายละเอียด"}
                                                            <ChevronRight className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate("/employee/notifications");
                                            }}
                                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/60"
                                        >
                                            <Bell className="w-3.5 h-3.5 text-teal-600" />
                                            ดูการแจ้งเตือนทั้งหมด
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main View */}
                {(() => {
                    const isChatPage = location.pathname === "/employee" || location.pathname === "/employee/" || location.pathname.startsWith("/employee/chat");
                    return (
                        <main className={`flex-1 min-h-0 bg-[#f8fafc] animate-fadeIn ${
                            isChatPage ? "overflow-hidden p-2 sm:p-3 flex flex-col" : "overflow-y-auto p-6 sm:p-8"
                        }`}>
                            <div className={isChatPage ? "w-full h-full flex-1 flex flex-col min-h-0" : "max-w-7xl mx-auto"}>
                                <Outlet />
                            </div>
                        </main>
                    );
                })()}
            </div>
        </div>
    );
}
