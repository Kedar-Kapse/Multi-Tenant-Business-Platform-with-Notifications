import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ToastContainer from './components/ui/Toast';
import useThemeStore, { resolveTheme } from './store/themeStore';
import useAuthStore from './store/authStore';
import './index.css';

function App() {
  const theme = useThemeStore((s) => s.theme);
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
  }, [theme]);

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) return null;

  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
