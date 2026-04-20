import { useEffect, useState, useRef } from 'react';
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
  Edit2,
  Check,
  X,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteDetails, getUtenteConsultas, getUtenteRegistos, updateUtente, uploadAvatar } from '../services/utentes.jsx';
import '../styles/user-profile.css';

export function UserPage() {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

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
          console.log('📥 Detalhes carregados:', details);
          console.log('📷 Foto URL:', details?.foto_url);
          setUserDetails(details);
          setEditData(details);
        } catch (err) {
          // Se não encontrar utente, usa dados do auth context como fallback
          console.warn('Utente não encontrado na base de dados, usando dados de autenticação');
          const fallbackData = {
            id: user.id,
            nome: user.name || user.email || 'Utilizador',
            email: user.email || '',
            telefone: '',
            morada: '',
            data_nascimento: '',
            numero_processo: '',
          };
          setUserDetails(fallbackData);
          setEditData(fallbackData);
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

  const handleEditClick = () => {
    setIsEditMode(true);
    setActiveTab('details');
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditData(userDetails);
    setSuccessMessage('');
  };

  const handleInputChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: value,
    });
  };

  const handleSave = async () => {
    if (!editData?.id) {
      setError('Erro: ID do utente não encontrado');
      return;
    }

    // Validação básica
    if (!editData.nome?.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!editData.email?.trim()) {
      setError('Email é obrigatório');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await updateUtente(editData.id, {
        nome: editData.nome,
        email: editData.email,
        telefone: editData.telefone,
        morada: editData.morada,
        data_nascimento: editData.data_nascimento,
      });

      setUserDetails(editData);
      setIsEditMode(false);
      setSuccessMessage('✓ Dados atualizados com sucesso!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Erro ao atualizar dados. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de ficheiro
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem demasiado grande (máximo 5MB)');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result);
    };
    reader.readAsDataURL(file);

    // Fazer upload
    setIsUploadingAvatar(true);
    setError('');

    try {
      const response = await uploadAvatar(userDetails.id, file);
      console.log('✓ Upload response:', response);
      console.log('✓ Novo foto_url:', response.foto_url);

      // Atualizar userDetails com o novo foto_url
      const newUserDetails = {
        ...userDetails,
        foto_url: response.foto_url,
      };
      console.log('✓ Objeto atualizado:', newUserDetails);
      setUserDetails(newUserDetails);

      // MANTER O PREVIEW INDEFINIDAMENTE - ele é o fallback
      // Se foto_url falhar, o preview continua visível

      setSuccessMessage('✓ Avatar atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('✗ Erro no upload:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Erro ao fazer upload do avatar';
      setError(errorMsg);
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

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
            <div className="profile-avatar-container" onClick={handleAvatarClick} title="Clique para mudar a foto">
              <div
                className={`profile-avatar ${(avatarPreview || (userDetails && userDetails.foto_url)) ? 'has-avatar' : ''}`}
              >
                {(avatarPreview || (userDetails && userDetails.foto_url)) ? (
                  <img
                    key={`avatar-${avatarPreview || (userDetails && userDetails.foto_url)}`}
                    src={avatarPreview || (userDetails?.foto_url ? `http://localhost:8080${userDetails.foto_url}` : null)}
                    className="avatar-img"
                    onLoad={() => {
                      console.log('✓ Imagem carregou com sucesso:', avatarPreview || userDetails?.foto_url);
                    }}
                    onError={(e) => {
                      console.error('✗ Erro ao carregar imagem:', e.target.src);
                    }}
                  />
                ) : (
                  <span className="avatar-initials">{getInitials(userDetails?.nome || user?.name)}</span>
                )}
              </div>
              <div className="avatar-upload-badge">
                <Camera size={16} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                disabled={isUploadingAvatar}
              />
            </div>

            <div className="profile-info">
              <div className="profile-name-section">
                <h1>{userDetails?.nome || user?.name || 'Utilizador'}</h1>
                <p>Nº Processo: {userDetails?.numero_processo || '-'}</p>
              </div>

              <div className="profile-badges">
                <span className="badge badge-primary">
                  <User size={16} />
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'terapeuta' ? 'Terapeuta' : 'Paciente'}
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
                {!isEditMode && (
                  <button
                    className="btn-edit"
                    onClick={handleEditClick}
                    title="Editar perfil"
                  >
                    <Edit2 size={18} />
                    Editar
                  </button>
                )}
              </div>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="success-banner">
                  {successMessage}
                </div>
              )}

              <div className="card-content">
                {isEditMode ? (
                  // Modo edição
                  <div className="edit-form">
                    <div className="form-group">
                      <label htmlFor="nome">Nome Completo *</label>
                      <input
                        id="nome"
                        type="text"
                        value={editData?.nome || ''}
                        onChange={(e) => handleInputChange('nome', e.target.value)}
                        placeholder="Nome completo"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        id="email"
                        type="email"
                        value={editData?.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Email"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="telefone">Telefone</label>
                      <input
                        id="telefone"
                        type="tel"
                        value={editData?.telefone || ''}
                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                        placeholder="Telefone"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="morada">Morada</label>
                      <input
                        id="morada"
                        type="text"
                        value={editData?.morada || ''}
                        onChange={(e) => handleInputChange('morada', e.target.value)}
                        placeholder="Morada completa"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="data_nascimento">Data de Nascimento</label>
                      <input
                        id="data_nascimento"
                        type="date"
                        value={editData?.data_nascimento || ''}
                        onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Check size={18} />
                        {isSaving ? 'A guardar...' : 'Guardar'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualização
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
                )}
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
