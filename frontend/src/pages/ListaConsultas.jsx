import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConsultas, cancelConsulta } from '../services/consultas.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CalendarioVisualizacao } from '../components/CalendarioVisualizacao.jsx';
import { ModalAgendarConsulta } from '../components/ModalAgendarConsulta.jsx';

export function ListaConsultas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultas, setConsultas] = useState([]);
  const [filteredConsultas, setFilteredConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todas');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('tabela'); // 'tabela' | 'calendario'
  const [modalOpen, setModalOpen] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(null);

  // Carregar consultas
  useEffect(() => {
    fetchConsultas();
  }, []);

  const fetchConsultas = async () => {
    try {
      setError('');
      console.log('Iniciando fetch de consultas...');
      const data = await getConsultas();
      console.log('Consultas recebidas:', data);
      if (data && data.length > 0) {
        console.log('Primeira consulta:', data[0]);
      }
      setConsultas(data || []);
      setFilteredConsultas(data || []);
    } catch (err) {
      console.error('Erro ao carregar:', err);
      setError('Erro ao carregar consultas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar consultas
  useEffect(() => {
    let filtered = consultas;

    // Filtro por estado
    if (filterEstado !== 'todas') {
      filtered = filtered.filter((c) => c.estado === filterEstado);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.utente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.terapeuta?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.sala?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por data (próximas primeiro)
    filtered.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));

    setFilteredConsultas(filtered);
  }, [searchTerm, filterEstado, consultas]);

  const handleCancel = async (id) => {
    try {
      await cancelConsulta(id);
      setConsultas(consultas.map((c) => (c.id === id ? { ...c, estado: 'cancelada' } : c)));
      setCancelConfirm(null);
    } catch (err) {
      setError('Erro ao cancelar consulta');
    }
  };

  const handleDateClick = (dateStr) => {
    setDataSelecionada(dateStr);
    setModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    // Redireciona para o formulário completo com os dados pré-preenchidos
    navigate('/consultas/nova', {
      state: {
        dataInicio: formData.data_inicio,
        tipo: formData.tipo
      }
    });
    setModalOpen(false);
  };

  const handleEventClick = (consultaId, consultaData) => {
    // Abre modal para ver/editar a consulta
    navigate(`/consultas/${consultaId}/editar`);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canManageConsultas = ['admin', 'administrativo', 'terapeuta'].includes(user?.role);

  if (loading) {
    return <div className="page">A carregar consultas...</div>;
  }

  return (
    <div className="page consultas-list">
      <div className="page-header">
        <div>
          <h1>Gestão de Consultas</h1>
          <p>Total: {filteredConsultas.length} consultas</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'tabela' ? 'active' : ''}`}
              onClick={() => setViewMode('tabela')}
              title="Visualizar como tabela"
            >
              📋 Tabela
            </button>
            <button
              className={`view-btn ${viewMode === 'calendario' ? 'active' : ''}`}
              onClick={() => setViewMode('calendario')}
              title="Visualizar como calendário"
            >
              📅 Calendário
            </button>
          </div>
          {canManageConsultas && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/consultas/nova')}
            >
              + Nova Consulta
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Pesquisar por utente, terapeuta ou sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterEstado === 'todas' ? 'active' : ''}`}
            onClick={() => setFilterEstado('todas')}
          >
            Todas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'agendada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('agendada')}
          >
            Agendadas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'realizada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('realizada')}
          >
            Realizadas
          </button>
          <button
            className={`filter-btn ${filterEstado === 'cancelada' ? 'active' : ''}`}
            onClick={() => setFilterEstado('cancelada')}
          >
            Canceladas
          </button>
        </div>
      </div>

      {filteredConsultas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma consulta encontrada</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="consultas-table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Terapeuta</th>
                <th>Área Clínica</th>
                <th>Sala</th>
                <th>Data Início</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultas.map((consulta) => (
                <tr key={consulta.id}>
                  <td>{consulta.utente?.nome || '-'}</td>
                  <td>{consulta.terapeuta?.nome || '-'}</td>
                  <td>{consulta.area_clinica?.nome || '-'}</td>
                  <td>{consulta.sala?.nome || '-'}</td>
                  <td>{formatDateTime(consulta.data_inicio)}</td>
                  <td>
                    <span className={`status ${consulta.estado || 'agendada'}`}>
                      {(consulta.estado || 'agendada').charAt(0).toUpperCase() + (consulta.estado || 'agendada').slice(1)}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-icon btn-view"
                      onClick={() => navigate(`/consultas/${consulta.id}`)}
                      title="Ver"
                    >
                      👁️
                    </button>
                    {canManageConsultas && consulta.estado !== 'cancelada' && (
                      <>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => navigate(`/consultas/${consulta.id}/editar`)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => setCancelConfirm(consulta.id)}
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmação de Cancelar */}
      {cancelConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar Cancelamento</h2>
            <p>Tem a certeza que deseja cancelar esta consulta?</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setCancelConfirm(null)}
              >
                Não, Voltar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleCancel(cancelConfirm)}
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendário */}
      {viewMode === 'calendario' && (
        <div className="calendario-section">
          <CalendarioVisualizacao
            consultas={filteredConsultas}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            mode="month"
          />
        </div>
      )}

      {/* Modal para Agendar */}
      <ModalAgendarConsulta
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setDataSelecionada(null);
        }}
        onSubmit={handleModalSubmit}
        dataSelecionada={dataSelecionada}
      />
    </div>
  );
}

