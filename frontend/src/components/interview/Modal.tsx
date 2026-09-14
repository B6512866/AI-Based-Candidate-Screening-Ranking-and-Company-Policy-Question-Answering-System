import React from "react";
import { X } from "lucide-react";

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    maxWidth?: string;
    footer?: React.ReactNode;
}

/**
 * Reusable base Modal dialog component with backdrop blur,
 * scrollable body, fixed header and footer.
 */
export function Modal({
    open,
    onClose,
    children,
    title,
    maxWidth = "max-w-lg",
    footer,
}: ModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />

            {/* Modal Container */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[85vh] flex flex-col my-auto overflow-hidden animate-[slideUp_0.3s_ease] z-10`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header (fixed) */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                    <h3 className="text-base font-black text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                    {children}
                </div>

                {/* Footer (fixed) */}
                {footer && (
                    <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

export default Modal;
