import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRoutes } from './routes/AppRoutes.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  if (!GOOGLE_CLIENT_ID) {
    console.warn('VITE_GOOGLE_CLIENT_ID não configurado no .env');
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}