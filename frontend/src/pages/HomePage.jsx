import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteConsultas } from '../services/utentes.jsx';
import { getTerapeutas, getAreasClinicas } from '../services/consultas.jsx';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.id) {
          const consultasData = await getUtenteConsultas(user.id);
          setConsultas(consultasData?.slice(0, 5) || []);
        }
        const [t, e] = await Promise.all([getTerapeutas(), getAreasClinicas()]);
        setTerapeutas(t || []);
        setEspecialidades(e || []);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const especialidadesIcons = {
    'Fisioterapia': '🏃',
    'Nutrição': '🥗',
    'Psicologia': '🧠',
    'Terapia da Fala': '🗣️',
  };

  return (
    <section className="page home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Clínica Universitária</h1>
            <p>Cuidados de saúde com profissionais especializados</p>
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate('/consultas')}
            >
              Marcar Consulta
            </button>
          </div>
          <div className="hero-image">
            <div className="medical-card">
              <div className="card-icon">⚕️</div>
              <div className="card-lines">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Section */}
      {user && (
        <section className="welcome-section">
          <div className="container">
            <h2>Bem-vindo, {user?.name ?? 'utilizador'}!</h2>
            <p>Função: <strong>{user?.role ?? '-'}</strong></p>
          </div>
        </section>
      )}

      {/* Próximas Consultas */}
      {user && (
        <section className="proximas-consultas-section">
          <div className="container">
            <h2>Próximas Consultas</h2>
            {loading ? (
              <p>A carregar...</p>
            ) : consultas.length === 0 ? (
              <p className="empty-state">Nenhuma consulta agendada</p>
            ) : (
              <div className="consultas-list">
                {consultas.map((consulta) => (
                  <div key={consulta.id} className="consulta-item">
                    <div className="consulta-info">
                      <p className="consulta-terapeuta">{consulta.terapeuta_nome}</p>
                      <small>{consulta.data_inicio}</small>
                    </div>
                    <span className={`status ${consulta.estado?.toLowerCase() || 'agendada'}`}>
                      {consulta.estado || 'Agendada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Especialidades */}
      <section className="especialidades-section">
        <div className="container">
          <h2>Especialidades</h2>
          <div className="especialidades-grid">
            {especialidades.map((esp) => (
              <div key={esp.id} className="especialidade-card">
                <div className="esp-icon">{especialidadesIcons[esp.nome] || '🏥'}</div>
                <h3>{esp.nome}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Especialistas */}
      <section className="especialistas-section">
        <div className="container">
          <h2>Especialistas</h2>
          <div className="especialistas-grid">
            {terapeutas.slice(0, 6).map((terapeuta) => (
              <div key={terapeuta.id} className="especialista-card">
                <div className="esp-avatar">👨‍⚕️</div>
                <h3>{terapeuta.nome}</h3>
                <p className="esp-especialidade">
                  {terapeuta.area_clinica?.nome || 'Especialista'}
                </p>
              </div>
            ))}
          </div>
          {terapeutas.length > 6 && (
            <div className="ver-todos">
              <button className="btn-ver-todos">Ver todos →</button>
            </div>
          )}
        </div>
      </section>

      {/* Ações Rápidas */}
      {user && (
        <section className="acoes-section">
          <div className="container">
            <h2>Ações Rápidas</h2>
            <div className="acoes-grid">
              <button
                className="action-card"
                onClick={() => navigate('/consultas')}
              >
                📅 Minhas Consultas
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/perfil')}
              >
                📋 Registos Clínicos
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/perfil')}
              >
                ⚙️ Editar Perfil
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Contactos */}
      <section className="contactos-section">
        <div className="container">
          <h2>Contactos</h2>
          <div className="contactos-grid">
            <div className="contacto-card">
              <h3>📍 Localização</h3>
              <p>Clínica Universitária<br/>Porto, Portugal</p>
            </div>
            <div className="contacto-card">
              <h3>📞 Telefone</h3>
              <p>+351 22 1234 567</p>
            </div>
            <div className="contacto-card">
              <h3>📧 Email</h3>
              <p>contato@clinica.pt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section-col">
              <h4>Serviços</h4>
              <ul>
                <li><a href="#especialidades">Especialidades</a></li>
                <li><a href="#especialistas">Especialistas</a></li>
                <li><a href="#contactos">Contactos</a></li>
              </ul>
            </div>
            <div className="footer-section-col">
              <h4>Empresa</h4>
              <ul>
                <li><a href="#">Sobre Nós</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Política de Privacidade</a></li>
              </ul>
            </div>
            <div className="footer-social">
              <h4>Redes Sociais</h4>
              <div className="social-icons">
                <a href="#" className="social-icon">𝕏</a>
                <a href="#" className="social-icon">📘</a>
                <a href="#" className="social-icon">▶️</a>
                <a href="#" className="social-icon">💼</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Clínica Universitária. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </section>
  );
}