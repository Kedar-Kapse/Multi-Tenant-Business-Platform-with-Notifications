import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { TENANT_ID, API_BASE_URL } from '../../runtimeConfig';

const GATEWAY = API_BASE_URL;
const DEFAULT_TENANT = TENANT_ID;

export default function PortalEntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No switch code provided');
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await axios.post(
          `${GATEWAY}/access-security/api/auth/portal-switch/exchange`,
          { code },
          { headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': DEFAULT_TENANT } }
        );

        const data = res.data;
        if (data.access_token) {
          localStorage.setItem('patient_access_token', data.access_token);
          localStorage.setItem('patient_refresh_token', data.refresh_token);
          refreshUser();
          navigate('/', { replace: true });
        } else {
          setError('Invalid response from server');
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to authenticate. The switch code may have expired.';
        setError(msg);
      }
    };

    exchangeCode();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Portal Switch Failed</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <a href="/login" className="inline-block px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600">Switching portal, please wait...</p>
      </div>
    </div>
  );
}
