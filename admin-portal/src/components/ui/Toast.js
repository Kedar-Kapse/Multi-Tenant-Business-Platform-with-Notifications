import { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';
import { create } from 'zustand';

// ── Toast Store ──
export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Date.now() + Math.random(), duration: 4000, ...toast }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Helper functions
export const toast = {
  success: (message) => useToastStore.getState().addToast({ type: 'success', message }),
  error: (message) => useToastStore.getState().addToast({ type: 'error', message }),
  warning: (message) => useToastStore.getState().addToast({ type: 'warning', message }),
  info: (message) => useToastStore.getState().addToast({ type: 'info', message }),
};

// ── Single Toast Item ──
function ToastItem({ id, type, message, duration }) {
  const [exiting, setExiting] = useState(false);
  const removeToast = useToastStore((s) => s.removeToast);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => removeToast(id), 300);
  }, [id, removeToast]);

  useEffect(() => {
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration]);

  const icons = {
    success: <FiCheckCircle size={18} />,
    error: <FiAlertCircle size={18} />,
    warning: <FiAlertTriangle size={18} />,
    info: <FiInfo size={18} />,
  };

  const styles = {
    success: 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800 text-success-800 dark:text-success-300',
    error: 'bg-urgent-50 dark:bg-urgent-900/30 border-urgent-200 dark:border-urgent-800 text-urgent-800 dark:text-urgent-300',
    warning: 'bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-300',
    info: 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${styles[type]} ${
        exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
      }`}
    >
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={dismiss} className="opacity-50 hover:opacity-100 transition">
        <FiX size={14} />
      </button>
    </div>
  );
}

// ── Toast Container (mount once in App) ──
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 min-w-[320px] max-w-[420px]">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
