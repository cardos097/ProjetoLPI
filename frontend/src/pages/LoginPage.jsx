import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginRequest } from '../services/auth.jsx';

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
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page centered">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Login</h1>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Palavra-passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p style={{ color: 'crimson', margin: 0 }}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}