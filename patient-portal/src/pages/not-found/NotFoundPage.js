import { Link } from 'react-router-dom';
import { FiCompass } from 'react-icons/fi';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={FiCompass}
        title="Page not found"
        description="The page you were looking for doesn't exist or has moved."
        action={<Link to="/" className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Go to dashboard</Link>}
      />
    </Card>
  );
}
