import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteDetails, getUtenteConsultas, getUtenteRegistos } from '../services/utentes.jsx';
import '../styles/user-profile.css';

export function UserPage() {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setError('');
        
        // Se não tem user autenticado
        if (!user?.id) {
          setError('Utilizador não autenticado');
          setLoading(false);
          return;
        }

        // Tenta buscar detalhes do utente
        let details = null;
        try {
          details = await getUtenteDetails(user.id);
          setUserDetails(details);
        } catch (err) {
          // Se não encontrar utente, usa dados do auth context como fallback
          console.warn('Utente não encontrado na base de dados, usando dados de autenticação');
          setUserDetails({
            id: user.id,
            nome: user.name || user.email || 'Utilizador',
            email: user.email || '',
            telefone: '',
            morada: '',
            data_nascimento: '',
            numero_processo: '',
          });
        }

        // Tenta buscar consultas e registos
        try {
          const [consultasData, registosData] = await Promise.all([
            getUtenteConsultas(user.id).catch(() => []),
            getUtenteRegistos(user.id).catch(() => []),
          ]);

          setConsultas(Array.isArray(consultasData) ? consultasData : []);
          setRegistos(Array.isArray(registosData) ? registosData : []);
        } catch (err) {
          console.warn('Erro ao carregar consultas/registos:', err);
          setConsultas([]);
          setRegistos([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id, user?.name, user?.email]);

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">A carregar dados do perfil...</p>
        </div>
      </div>
    );
  }

  if (error && !userDetails) {
    return (
      <div className="user-profile-container">
        <div className="error-container">
          <div className="error-message">
            <strong>Erro:</strong> {error}
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              Tente fazer login novamente ou contacte o suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    return (name || '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('agendada') || statusLower.includes('upcoming')) {
      return 'agendada';
    } else if (statusLower.includes('concluída') || statusLower.includes('completed')) {
      return 'concluida';
    } else if (statusLower.includes('cancelada') || statusLower.includes('cancelled')) {
      return 'cancelada';
    }
    return 'agendada';
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <div className="user-profile-container">
      <div className="profile-wrapper">
        {/* Header Card */}
        <motion.div
          className="profile-header-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="profile-header-content">
            <div className="profile-avatar">
              {getInitials(userDetails?.nome || user?.name)}
            </div>

            <div className="profile-info">
              <div className="profile-name-section">
                <h1>{userDetails?.nome || user?.name || 'Utilizador'}</h1>
                <p>Nº Processo: {userDetails?.numero_processo || '-'}</p>
              </div>

              <div className="profile-badges">
                <span className="badge badge-primary">
                  <User size={16} />
                  Paciente
                </span>
                {!userDetails?.id && !consultas?.length && !registos?.length && (
                  <span 
                    className="badge" 
                    title="Dados carregados do contexto de autenticação"
                    style={{ 
                      background: 'rgba(249, 115, 22, 0.1)', 
                      borderColor: 'rgba(249, 115, 22, 0.3)',
                      color: '#92400e',
                      fontSize: '12px'
                    }}
                  >
                    ⓘ Dados limitados
                  </span>
                )}
              </div>

              <div className="profile-contact-grid">
                <div className="contact-item">
                  <Mail size={18} />
                  <span className="contact-item-text">{userDetails?.email}</span>
                </div>
                <div className="contact-item">
                  <Phone size={18} />
                  <span className="contact-item-text">{userDetails?.telefone || '-'}</span>
                </div>
                <div className="contact-item">
                  <Calendar size={18} />
                  <span className="contact-item-text">
                    {userDetails?.data_nascimento || '-'}
                  </span>
                </div>
                <div className="contact-item">
                  <MapPin size={18} />
                  <span className="contact-item-text">{userDetails?.morada || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="tabs-container">
          <ul className="tabs-list">
            <li>
              <button
                className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Detalhes
              </button>
            </li>
            <li>
              <button
                className={`tab-button ${activeTab === 'consultas' ? 'active' : ''}`}
                onClick={() => setActiveTab('consultas')}
              >
                Consultas ({consultas.length})
              </button>
            </li>
            <li>
              <button
                className={`tab-button ${activeTab === 'registos' ? 'active' : ''}`}
                onClick={() => setActiveTab('registos')}
              >
                Registos ({registos.length})
              </button>
            </li>
          </ul>

          {/* Details Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'details' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'details' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <User size={20} />
                  Informações Pessoais
                </h2>
              </div>

              <div className="card-content">
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Nome Completo</span>
                    <span className="detail-value">{userDetails?.nome || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{userDetails?.email || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Número de Processo</span>
                    <span className="detail-value">{userDetails?.numero_processo || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Telefone</span>
                    <span className="detail-value">{userDetails?.telefone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Data de Nascimento</span>
                    <span className="detail-value">{userDetails?.data_nascimento || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Morada</span>
                    <span className="detail-value">{userDetails?.morada || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Consultas Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'consultas' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'consultas' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <Clock size={20} />
                  Histórico de Consultas
                </h2>
              </div>

              <div className="card-content">
                {consultas.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhuma consulta registrada</p>
                  </div>
                ) : (
                  <div>
                    {consultas.map((consulta, index) => (
                      <motion.div
                        key={consulta.id}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="consulta-item"
                      >
                        <div className="consulta-header">
                          <div>
                            <p className="consulta-title">{consulta.area_clinica}</p>
                            <p className="consulta-subtitle">
                              Terapeuta: {consulta.terapeuta_nome}
                            </p>
                          </div>
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              consulta.estado
                            )}`}
                          >
                            {consulta.estado}
                          </span>
                        </div>

                        <div className="consulta-separator"></div>

                        <div className="consulta-details">
                          <div className="consulta-detail">
                            <span className="consulta-detail-label">Sala</span>
                            <span className="consulta-detail-value">
                              {consulta.sala_nome}
                            </span>
                          </div>
                          <div className="consulta-detail">
                            <span className="consulta-detail-label">Data Início</span>
                            <span className="consulta-detail-value">
                              {consulta.data_inicio}
                            </span>
                          </div>
                          <div className="consulta-detail">
                            <span className="consulta-detail-label">Data Término</span>
                            <span className="consulta-detail-value">
                              {consulta.data_fim || '-'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Registos Tab */}
          <motion.div
            className={`tabs-content ${activeTab === 'registos' ? 'active' : ''}`}
            variants={tabVariants}
            initial="hidden"
            animate={activeTab === 'registos' ? 'visible' : 'hidden'}
          >
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={20} />
                  Registos Clínicos
                </h2>
              </div>

              <div className="card-content">
                {registos.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhum registo clínico</p>
                  </div>
                ) : (
                  <div>
                    {registos.map((registo, index) => (
                      <motion.div
                        key={registo.id}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="registo-item"
                      >
                        <div className="registo-header">
                          <div className="registo-icon">
                            <Stethoscope size={18} />
                          </div>
                          <div className="registo-info">
                            <p className="registo-title">{registo.area_clinica}</p>
                            <div className="registo-meta">
                              <span className="registo-author">{registo.criado_por}</span>
                              <span className="registo-date">{registo.data_criacao}</span>
                            </div>
                          </div>
                        </div>

                        <div className="registo-separator"></div>

                        <p className="registo-content">{registo.conteudo}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
