import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FileText as FileTextIcon, ArrowLeft } from 'react-bootstrap-icons';
import {
  getConsultaById,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
} from '../services/consultas.jsx';

export function DetalhesConsulta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState(null);

  const [terapeutas, setTerapeutas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

  const getConsultaValue = (consulta, key) => consulta?.[key] ?? consulta?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())];

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // Carregar consulta e dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [consulta, t, s, a] = await Promise.all([
          getConsultaById(id),
          getTerapeutas(),
          getSalas(),
          getAreasClinicas(),
        ]);

        setConsulta(consulta);
        setTerapeutas(t || []);
        setSalas(s || []);
        setAreasClinicas(a || []);
      } catch (err) {
        setError('Erro ao carregar detalhes da consulta');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getTerapeutaNome = () => {
    const terapeutaId = getConsultaValue(consulta, 'terapeuta_id');
    const terapeuta = terapeutas.find((t) => t.id === terapeutaId);
    return terapeuta?.nome || getConsultaValue(consulta, 'terapeuta_nome') || '-';
  };

  const getSalaNome = () => {
    const salaId = getConsultaValue(consulta, 'sala_id');
    const sala = salas.find((s) => s.id === salaId);
    return sala?.nome || getConsultaValue(consulta, 'sala_nome') || '-';
  };

  const getAreaClinicaNome = () => {
    const areaId = getConsultaValue(consulta, 'area_clinica_id');
    const area = areasClinicas.find((a) => a.id === areaId);
    return area?.nome || getConsultaValue(consulta, 'area_clinica_nome') || '-';
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-PT');
  };

  const formatarHora = (dataStr) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  if (error) {
    return (
      <div className="page editar-consulta">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1>Detalhes da Consulta</h1>
        </div>

        <div className="form-container">
          <div className="alert alert-error">
            {error}
            <button onClick={() => navigate(-1)}>×</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1>Detalhes da Consulta</h1>
          {getConsultaValue(consulta, 'utente_nome') && (
            <p>Utente: {getConsultaValue(consulta, 'utente_nome')}</p>
          )}
        </div>
      </div>

      <div className="form-container">
        <div className="card">
          <h2>Informações da Consulta</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Terapeuta</label>
              <div className="detail-value">{getTerapeutaNome()}</div>
            </div>

            <div className="form-group">
              <label>Sala</label>
              <div className="detail-value">{getSalaNome()}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Área Clínica</label>
            <div className="detail-value">{getAreaClinicaNome()}</div>
          </div>

          <h2 style={{ marginTop: '2rem' }}>Data e Hora</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Data Início</label>
              <div className="detail-value">
                {formatarData(getConsultaValue(consulta, 'data_inicio'))}
              </div>
            </div>

            <div className="form-group">
              <label>Hora Início</label>
              <div className="detail-value">
                {formatarHora(getConsultaValue(consulta, 'data_inicio'))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data Fim</label>
              <div className="detail-value">
                {formatarData(getConsultaValue(consulta, 'data_fim'))}
              </div>
            </div>

            <div className="form-group">
              <label>Hora Fim</label>
              <div className="detail-value">
                {formatarHora(getConsultaValue(consulta, 'data_fim'))}
              </div>
            </div>
          </div>

          {consulta?.documentos && consulta.documentos.length > 0 && (
            <div className="form-group" style={{ marginTop: '2rem' }}>
              <h3>Documentos Carregados</h3>
              <div className="documentos-list" style={{ marginBottom: '1rem' }}>
                {consulta.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <FileTextIcon size={20} />
                    <a
                      href={doc.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, color: '#0066cc', textDecoration: 'none' }}
                    >
                      {doc.nome_arquivo}
                    </a>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {new Date(doc.created_at).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
