import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteDetails, getUtenteConsultas, getUtenteRegistos } from '../services/utentes.jsx';

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
        const details = await getUtenteDetails(user.id);
        setUserDetails(details);

        const [consultasData, registosData] = await Promise.all([
          getUtenteConsultas(user.id),
          getUtenteRegistos(user.id),
        ]);

        setConsultas(consultasData);
        setRegistos(registosData);
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserData();
    }
  }, [user?.id]);

  if (loading) {
    return <div className="page centered">A carregar...</div>;
  }

  if (error) {
    return <div className="page centered"><p style={{ color: 'crimson' }}>{error}</p></div>;
  }

  return (
    <div className="page user-profile">
      <div className="profile-header">
        <h1>Perfil do Utilizador</h1>
        <p className="user-name">{userDetails?.nome || user?.name}</p>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Detalhes
        </button>
        <button
          className={`tab-button ${activeTab === 'consultas' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultas')}
        >
          Consultas ({consultas.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'registos' ? 'active' : ''}`}
          onClick={() => setActiveTab('registos')}
        >
          Registos ({registos.length})
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="card details-section">
          <h2>Informações Pessoais</h2>
          <div className="form-group">
            <label>Nome</label>
            <p className="form-value">{userDetails?.nome}</p>
          </div>
          <div className="form-group">
            <label>Email</label>
            <p className="form-value">{userDetails?.email}</p>
          </div>
          <div className="form-group">
            <label>Número de Processo</label>
            <p className="form-value">{userDetails?.numero_processo || '-'}</p>
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <p className="form-value">{userDetails?.telefone || '-'}</p>
          </div>
          <div className="form-group">
            <label>Morada</label>
            <p className="form-value">{userDetails?.morada || '-'}</p>
          </div>
          <div className="form-group">
            <label>Data de Nascimento</label>
            <p className="form-value">{userDetails?.data_nascimento || '-'}</p>
          </div>
        </div>
      )}

      {activeTab === 'consultas' && (
        <div className="card consultas-section">
          <h2>Histórico de Consultas</h2>
          {consultas.length === 0 ? (
            <p className="empty-state">Nenhuma consulta registrada</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Terapeuta</th>
                    <th>Sala</th>
                    <th>Área Clínica</th>
                    <th>Estado</th>
                    <th>Data Início</th>
                    <th>Data Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((consulta) => (
                    <tr key={consulta.id}>
                      <td>{consulta.terapeuta_nome}</td>
                      <td>{consulta.sala_nome}</td>
                      <td>{consulta.area_clinica}</td>
                      <td><span className={`status ${consulta.estado.toLowerCase()}`}>{consulta.estado}</span></td>
                      <td>{consulta.data_inicio}</td>
                      <td>{consulta.data_fim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'registos' && (
        <div className="card registos-section">
          <h2>Registos Clínicos</h2>
          {registos.length === 0 ? (
            <p className="empty-state">Nenhum registo clínico</p>
          ) : (
            <div className="registos-list">
              {registos.map((registo) => (
                <div key={registo.id} className="registo-item">
                  <div className="registo-header">
                    <h3>{registo.area_clinica}</h3>
                    <small>{registo.data_criacao} - {registo.criado_por}</small>
                  </div>
                  <p className="registo-content">{registo.conteudo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
