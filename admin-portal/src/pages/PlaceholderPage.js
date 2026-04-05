import { FiTool } from 'react-icons/fi';

export default function PlaceholderPage({ title = 'Coming Soon' }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
        <FiTool className="w-7 h-7 text-primary-500" />
      </div>
      <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{title}</h2>
      <p className="text-sm text-secondary-500 mt-1 max-w-sm">This module is under development and will be available soon.</p>
    </div>
  );
}
