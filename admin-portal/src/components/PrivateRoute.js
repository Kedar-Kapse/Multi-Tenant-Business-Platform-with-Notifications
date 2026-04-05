import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return user && isAuthenticated() ? children : <Navigate to="/login" replace />;
}
