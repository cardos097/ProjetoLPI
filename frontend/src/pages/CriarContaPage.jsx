import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { registerRequest } from '../services/auth.jsx';

export function CriarContaPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validações básicas
      if (!formData.nome_completo.trim()) {
        setError('Nome completo é obrigatório');
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        setError('Email é obrigatório');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('A palavra-passe deve ter pelo menos 6 caracteres');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirm_password) {
        setError('As palavras-passe não coincidem');
        setLoading(false);
        return;
      }

      const session = await registerRequest({
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        nome_completo: formData.nome_completo,
      });

      setSuccess('Conta criada com sucesso! A entrar...');
      login(session);
      
      // Redirecionar após 1 segundo
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Falha ao criar conta');
    } finally {
      setLoading(false);
    }
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
              <h1>Criar Conta</h1>
              <p>Registe-se na Clínica Universitária</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Nome Completo
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu.email@ufp.edu.pt"
                  required
                />
              </label>

              <label>
                Palavra-passe
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </label>

              <label>
                Confirmar Palavra-passe
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Confirme a palavra-passe"
                  required
                />
              </label>

              {error && <p className="login-error">{error}</p>}
              {success && <p style={{ color: '#10b981', fontSize: '14px', textAlign: 'center' }}>{success}</p>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'A criar conta...' : 'Criar Conta'}
              </button>
            </form>

            <div className="login-divider">
              <span className="login-divider-text">Já tem conta?</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={{ color: '#059669', textDecoration: 'none', fontWeight: '500' }}>
                Clique aqui para entrar
              </Link>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
              ⓘ Apenas utilizadores com email @ufp.edu.pt podem aceder como terapeutas
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
