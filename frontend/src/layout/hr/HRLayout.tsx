import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { hrMenuItems } from "./hrMenu";
import { LogOut, Bell, User } from "lucide-react";

export default function HRLayout() {
    const { logout, firstName, lastName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "HR Admin";
    const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "HR";

    // หา label ของหน้าปัจจุบัน
    const currentPage = hrMenuItems.find(item => location.pathname.startsWith(item.path));
    const pageTitle = currentPage?.label || "Dashbord";

    return (
        <div className="flex h-screen bg-[#f4f6fb] font-sans">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-slate-100 flex flex-col z-20 shadow-sm">
                {/* Logo */}
                <div className="px-6 pt-5 pb-5 border-b border-slate-100">
                    <img src={logo} alt="HireAI Logo" className="h-14 w-auto object-contain" />
                </div>

                {/* Nav items */}
                <div className="px-4 pt-4 flex-1">
                    <nav className="space-y-0.5">
                        {hrMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${isActive
                                        ? "bg-indigo-50 text-[#4169E1]"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                        }`}
                                >
                                    <Icon
                                        className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-[#4169E1]" : "text-slate-400 group-hover:text-slate-600"
                                            }`}
                                    />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom: HR Access + Logout */}
                <div className="mt-auto px-6 pb-6 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 px-3 py-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-[#4169E1]" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 tracking-wide">HR Access</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-red-500 font-semibold text-sm hover:bg-red-50 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h2 className="text-slate-800 font-bold text-base">{pageTitle}</h2>

                    <div className="flex items-center gap-4">
                        {/* Bell */}
                        <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all border border-slate-100">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border border-white rounded-full"></span>
                        </button>

                        {/* User */}
                        <div className="flex items-center gap-2.5 pl-4 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-slate-800 text-sm font-bold leading-tight">นาย{fullName}</p>
                                <p className="text-slate-400 text-[11px]">ทรัพยากรบุคคล</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4169E1] to-[#4834d4] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                {initials}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dynamic Content */}
                <main className="flex-1 overflow-y-auto bg-[#f4f6fb]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
