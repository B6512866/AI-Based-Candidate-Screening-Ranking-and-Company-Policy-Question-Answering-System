import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ConfirmModal, { ConfirmVariant } from "../components/common/ConfirmModal";

export interface ConfirmOptions {
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    showCancel?: boolean;
}

export interface ConfirmContextType {
    confirm: (optionsOrMessage: ConfirmOptions | string) => Promise<boolean>;
    alert: (optionsOrMessage: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title?: string;
        message: React.ReactNode;
        confirmText?: string;
        cancelText?: string;
        variant: ConfirmVariant;
        showCancel: boolean;
    }>({
        isOpen: false,
        title: "",
        message: "",
        confirmText: "ยืนยัน",
        cancelText: "ยกเลิก",
        variant: "danger",
        showCancel: true,
    });

    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((optionsOrMessage: ConfirmOptions | string): Promise<boolean> => {
        const options: ConfirmOptions =
            typeof optionsOrMessage === "string"
                ? { message: optionsOrMessage }
                : optionsOrMessage;

        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setModalState({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText,
                cancelText: options.cancelText || "ยกเลิก",
                variant: options.variant || "danger",
                showCancel: options.showCancel !== false,
            });
        });
    }, []);

    const alert = useCallback((optionsOrMessage: ConfirmOptions | string): Promise<boolean> => {
        const options: ConfirmOptions =
            typeof optionsOrMessage === "string"
                ? { message: optionsOrMessage }
                : optionsOrMessage;

        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setModalState({
                isOpen: true,
                title: options.title || "แจ้งเตือน",
                message: options.message,
                confirmText: options.confirmText || "ตกลง",
                cancelText: "ยกเลิก",
                variant: options.variant || "info",
                showCancel: false,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (resolverRef.current) {
            resolverRef.current(true);
            resolverRef.current = null;
        }
        setModalState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const handleClose = useCallback(() => {
        if (resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
        }
        setModalState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            <ConfirmModal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                variant={modalState.variant}
                showCancel={modalState.showCancel}
                onConfirm={handleConfirm}
                onClose={handleClose}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
};

export default ConfirmContext;
