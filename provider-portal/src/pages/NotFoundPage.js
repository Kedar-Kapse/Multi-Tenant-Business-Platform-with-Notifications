import { Link } from 'react-router-dom';
import { FiCompass } from 'react-icons/fi';
import EmptyState from '../components/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={FiCompass}
      title="Page not found"
      description="The page you were looking for does not exist or has moved."
      action={<Link to="/" className="inline-flex px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Back to dashboard</Link>}
    />
  );
}
