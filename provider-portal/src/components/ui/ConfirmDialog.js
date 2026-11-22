import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import Modal from './Modal';

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirm Action',
  message = 'Are you sure?', confirmLabel = 'Confirm',
  variant = 'danger', loading = false,
}) {
  const danger = variant === 'danger';
  const btnCls = danger ? 'bg-urgent-600 hover:bg-urgent-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white';
  const Icon = danger ? FiAlertTriangle : FiCheckCircle;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${btnCls}`}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </>
      )}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-urgent-100 dark:bg-urgent-900/30' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
          <Icon className={danger ? 'text-urgent-600' : 'text-primary-600'} size={18} />
        </div>
        <div className="text-sm text-secondary-700 dark:text-secondary-300 pt-2">{message}</div>
      </div>
    </Modal>
  );
}
