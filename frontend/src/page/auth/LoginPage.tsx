import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. เรียกใช้งาน Service (ซึ่งใช้พอร์ตตาม .env หรือพอร์ตจริงเวลา Deploy อัตโนมัติ)
      const data = await loginService({ email, password });
      // 2. ใช้ login จาก context เพื่อบันทึก Session
      login(data.token, data.role, data.first_name, data.last_name);
      onOpenChange(false);
      // Redirect ตาม Role
      if (data.role === "HRManager") {
        navigate("/hr/dashboard");
      } else {
        navigate("/employee/chat");
      }
    } catch (err: any) {
      // ดึงข้อความ Error ที่ส่งมาจาก Backend ผ่าน Axios
      const errMsg = err.response?.data?.error || "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่ภายหลัง";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div
        className="bg-white rounded-[2.5rem] p-10 md:p-12 w-full max-w-lg shadow-2xl animate-fadeIn relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full translate-x-10 -translate-y-10"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-3 font-sans">ยินดีต้อนรับ</h2>
              <p className="text-slate-500 font-medium font-sans">ลงชื่อเข้าใช้งานระบบ HireAI</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-5 py-4 rounded-2xl mb-8 flex items-center gap-3 font-sans font-semibold">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <div className="space-y-6 mb-10 text-left">
            <div>
              <label className="block text-slate-700 font-bold mb-2 ml-1 text-sm font-sans underline decoration-indigo-200 underline-offset-4">อีเมล</label>
              <input
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/30 focus:bg-white transition-all font-sans"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-2 ml-1 text-sm font-sans underline decoration-indigo-200 underline-offset-4">รหัสผ่าน</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/30 focus:bg-white transition-all font-sans"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#4169E1] hover:bg-[#5a52e0] text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 font-sans text-lg flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                กำลังดำเนินการ...
              </>
            ) : "เข้าสู่ระบบ"}
          </button>

          <p className="mt-8 text-center text-slate-400 text-sm font-sans">
            มีปัญหาในการเข้าใช้งาน? <a href="#" className="text-[#4169E1] font-bold hover:underline">ติดต่อผู้ดูแลระบบ</a>
          </p>
        </div>
      </div>
    </div>
  );
}