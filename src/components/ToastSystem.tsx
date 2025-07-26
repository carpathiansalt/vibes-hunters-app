'use client';

import React, { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
    timestamp: number;
}

interface ToastSystemProps {
    children: React.ReactNode;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
    hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }: ToastSystemProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            id,
            type,
            message,
            duration,
            timestamp: Date.now(),
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove toast after duration
        if (duration > 0) {
            setTimeout(() => {
                hideToast(id);
            }, duration);
        }
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Clean up old toasts (older than 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setToasts(prev => prev.filter(toast => now - toast.timestamp < 10000));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <ToastContainer toasts={toasts} onHide={hideToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onHide: (id: string) => void;
}

function ToastContainer({ toasts, onHide }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onHide={onHide} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: Toast;
    onHide: (id: string) => void;
}

function ToastItem({ toast, onHide }: ToastItemProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleHide = () => {
        setIsVisible(false);
        setTimeout(() => onHide(toast.id), 300);
    };

    const getToastStyles = () => {
        const baseStyles = "transform transition-all duration-300 ease-out shadow-lg rounded-lg p-4 flex items-start space-x-3";
        const visibilityStyles = isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0";
        
        switch (toast.type) {
            case 'success':
                return `${baseStyles} ${visibilityStyles} bg-green-500 text-white border-l-4 border-green-600`;
            case 'error':
                return `${baseStyles} ${visibilityStyles} bg-red-500 text-white border-l-4 border-red-600`;
            case 'warning':
                return `${baseStyles} ${visibilityStyles} bg-yellow-500 text-white border-l-4 border-yellow-600`;
            case 'info':
            default:
                return `${baseStyles} ${visibilityStyles} bg-blue-500 text-white border-l-4 border-blue-600`;
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    return (
        <div className={getToastStyles()}>
            <span className="text-lg flex-shrink-0">{getIcon()}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-5">{toast.message}</p>
            </div>
            <button
                onClick={handleHide}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
}

// Convenience functions for quick toast usage
export const ToastSystem = {
    success: (message: string, duration = 3000) => {
        if (typeof window !== 'undefined') {
            // This will be replaced by the actual toast system
            console.log('Toast:', { type: 'success', message, duration });
        }
    },
    error: (message: string, duration = 5000) => {
        if (typeof window !== 'undefined') {
            console.log('Toast:', { type: 'error', message, duration });
        }
    },
    info: (message: string, duration = 3000) => {
        if (typeof window !== 'undefined') {
            console.log('Toast:', { type: 'info', message, duration });
        }
    },
    warning: (message: string, duration = 4000) => {
        if (typeof window !== 'undefined') {
            console.log('Toast:', { type: 'warning', message, duration });
        }
    }
}; 