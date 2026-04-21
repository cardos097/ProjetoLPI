import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HeroSection } from '../components/HeroSection.jsx';
import { Footer } from '../components/Footer.jsx';
import { getUtenteConsultas } from '../services/utentes.jsx';
import { getAreasClinicas } from '../services/consultas.jsx';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirecionar terapeuta sem area_clinica para completar perfil
  useEffect(() => {
    if (user?.role === 'terapeuta' && !user?.area_clinica_id) {
      console.log('Redirecionando para completar perfil...');
      navigate('/completar-perfil', { replace: true });
    }
  }, [user?.role, user?.area_clinica_id, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.id) {
          const consultasData = await getUtenteConsultas(user.id);
          setConsultas(consultasData?.slice(0, 5) || []);
        }
        const e = await getAreasClinicas();
        setEspecialidades(e || []);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);


  return (
    <section className="page home-page">
      {/* Hero Section */}
      <HeroSection
        logo={{
          url: '/images/ufp-logo.png',
          alt: 'Logo Clínica Universitária UFP',
          text: 'Clínica Universitária',
        }}
        slogan="CUIDADOS DE SAÚDE ESPECIALIZADOS"
        title={
          <>
            Bem-vindo à<br />
            <span style={{ color: 'var(--ufp-primary)' }}>Clínica Universitária</span>
          </>
        }
        subtitle="Acesso a profissionais especializados em Fisioterapia, Psicologia, Nutrição e Terapia da Fala. Cuidados de saúde personalizados para o seu bem-estar."
        callToAction={{
          text: "MARCAR CONSULTA",
          href: "/consultas",
        }}
        backgroundImage="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80"
        contactInfo={{
          website: "www.clinica.ufp.pt",
          phone: "+351 22 1234 567",
          address: "Porto, Portugal",
        }}
      />

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
                <h3>{esp.nome}</h3>
              </div>
            ))}
          </div>
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
                Minhas Consultas
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/perfil')}
              >
                Registos Clínicos
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/perfil')}
              >
                Editar Perfil
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
              <h3>Localização</h3>
              <p>Clínica Universitária<br />Porto, Portugal</p>
            </div>
            <div className="contacto-card">
              <h3>Telefone</h3>
              <p>+351 22 1234 567</p>
            </div>
            <div className="contacto-card">
              <h3>Email</h3>
              <p>contato@clinica.pt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </section>
  );
}