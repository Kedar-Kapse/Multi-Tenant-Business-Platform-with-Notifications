import { FiAlertTriangle } from 'react-icons/fi';
import Modal from './Modal';

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirm Action',
  message = 'Are you sure?', confirmLabel = 'Confirm',
  variant = 'danger', loading = false,
}) {
  const btnCls = variant === 'danger'
    ? 'bg-urgent-600 hover:bg-urgent-700 text-white'
    : 'bg-primary-600 hover:bg-primary-700 text-white';

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          variant === 'danger' ? 'bg-urgent-100 dark:bg-urgent-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
        }`}>
          <FiAlertTriangle className={variant === 'danger' ? 'text-urgent-600' : 'text-primary-600'} size={18} />
        </div>
        <p className="text-sm text-secondary-700 dark:text-secondary-300">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${btnCls}`}>
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
