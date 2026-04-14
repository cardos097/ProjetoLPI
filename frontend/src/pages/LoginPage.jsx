import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginRequest, loginWithGoogle } from '../services/auth.jsx';
import { GoogleLogin } from '@react-oauth/google';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@clinica.pt');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await loginRequest({ email, password });
      login(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const session = await loginWithGoogle(credentialResponse.credential);
      login(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Falha no login Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Falha no login Google. Tenta novamente.');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left: Form Content */}
        <div className="login-content">
          <div className="login-form-wrapper">
            <div className="login-header">
              <div className="login-logo">
                <img
                  src="/images/ufp-logo.png"
                  alt="Logo Clínica Universitária"
                />
              </div>
              <h1>Bem-vindo</h1>
              <p>Acesso à Clínica Universitária</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@ufp.edu.pt"
                  required
                />
              </label>

              <label>
                Palavra-passe
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Insira sua palavra-passe"
                  required
                />
              </label>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'A entrar...' : 'Entrar'}
              </button>
            </form>

            <div className="login-divider">
              <span className="login-divider-text">Ou continue com</span>
            </div>

            <div className="login-google-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signin_with"
                theme="outline"
                size="large"
              />
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
              ⓘ Apenas utilizadores com email @ufp.edu.pt podem aceder
            </p>
          </div>
        </div>

        {/* Right: Image with Gradient Overlay */}
        <div
          className="login-image"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0, 84, 63, 0.8), rgba(45, 155, 109, 0.8)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80')`,
          }}
        >
          <div className="login-image-content">
            <h2>Clínica Universitária</h2>
            <p>Cuidados de saúde especializados com profissionais qualificados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
