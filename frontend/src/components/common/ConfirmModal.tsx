import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    showCancel?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText = "ยกเลิก",
    variant = "danger",
    showCancel = true,
    isLoading = false,
    onConfirm,
    onClose,
}) => {
    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Variant configurations
    const variantConfig = {
        danger: {
            iconBg: "bg-rose-50 border-rose-100 text-rose-600",
            icon: <Trash2 className="w-7 h-7" />,
            defaultTitle: "ยืนยันการลบข้อมูล",
            defaultConfirmText: "ยืนยันการลบ",
            confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200",
        },
        warning: {
            iconBg: "bg-amber-50 border-amber-100 text-amber-600",
            icon: <AlertTriangle className="w-7 h-7" />,
            defaultTitle: "แจ้งเตือนการดำเนินการ",
            defaultConfirmText: "ตกลงดำเนินการ",
            confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
        },
        info: {
            iconBg: "bg-blue-50 border-blue-100 text-[#4169E1]",
            icon: <Info className="w-7 h-7" />,
            defaultTitle: "ข้อมูลแจ้งเตือน",
            defaultConfirmText: "ตกลง",
            confirmBtn: "bg-[#4169E1] hover:bg-[#3152c4] text-white shadow-blue-200",
        },
        success: {
            iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
            icon: <CheckCircle2 className="w-7 h-7" />,
            defaultTitle: "ดำเนินการสำเร็จ",
            defaultConfirmText: "ตกลง",
            confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
        },
    };

    const config = variantConfig[variant] || variantConfig.danger;
    const resolvedTitle = title || config.defaultTitle;
    const resolvedConfirmText = confirmText || config.defaultConfirmText;

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-scaleUp font-sans border border-slate-100 relative">
                {/* Close Button Top Right */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Animated Variant Icon */}
                <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-sm transition-transform ${config.iconBg}`}
                >
                    {config.icon}
                </div>

                {/* Content */}
                <div className="space-y-1.5 pt-1">
                    <h3 className="text-lg font-black text-slate-800 leading-snug">
                        {resolvedTitle}
                    </h3>
                    <div className="text-slate-500 text-xs sm:text-sm leading-relaxed whitespace-pre-line px-2">
                        {message}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                    {showCancel && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${config.confirmBtn}`}
                    >
                        {isLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        <span>{resolvedConfirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
