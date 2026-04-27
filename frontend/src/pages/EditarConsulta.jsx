import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getConsultaById,
  updateConsulta,
  remarcarConsulta,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
} from '../services/consultas.jsx';

export function EditarConsulta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState(null);

  const [terapeutas, setTerapeutas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

  const dedupeSalasByNome = (listaSalas) => {
    const seen = new Set();
    return (listaSalas || []).filter((sala) => {
      const nome = (sala?.nome || '').trim().toLowerCase();
      if (!nome) return true;
      if (seen.has(nome)) return false;
      seen.add(nome);
      return true;
    });
  };

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const getConsultaValue = (consulta, key) => consulta?.[key] ?? consulta?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())];

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const [form, setForm] = useState({
    terapeuta_id: '',
    sala_id: '',
    area_clinica_id: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
  });

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

        // Formatar datas
        const dataInicio = parseDateValue(getConsultaValue(consulta, 'data_inicio'));
        const dataFim = parseDateValue(getConsultaValue(consulta, 'data_fim'));

        if (!dataInicio || !dataFim) {
          throw new Error('Consulta sem datas válidas');
        }

        setConsulta(consulta);

        setForm({
          terapeuta_id: getConsultaValue(consulta, 'terapeuta_id') || '',
          sala_id: getConsultaValue(consulta, 'sala_id') || '',
          area_clinica_id: getConsultaValue(consulta, 'area_clinica_id') || '',
          data_inicio: dataInicio.toISOString().split('T')[0],
          hora_inicio: dataInicio.toTimeString().slice(0, 5),
          data_fim: dataFim.toISOString().split('T')[0],
          hora_fim: dataFim.toTimeString().slice(0, 5),
        });

        setTerapeutas(t || []);
        setSalas(dedupeSalasByNome(s || []));
        setAreasClinicas(a || []);
      } catch (err) {
        setError('Erro ao carregar consulta');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Construir payload baseado nas permissões do utilizador
      const payload = {};

      // Apenas adicionar campos que o utilizador tem permissão para editar
      if (canEditTerapeuta && form.terapeuta_id) {
        payload.terapeuta_id = parseInt(form.terapeuta_id);
      }

      if (canEditSala && form.sala_id) {
        payload.sala_id = parseInt(form.sala_id);
      }

      if (canEditAreaClinica && form.area_clinica_id) {
        payload.area_clinica_id = parseInt(form.area_clinica_id);
      }

      // Se é terapeuta, não permitir mudanças de data/hora
      if (!canEditDataHora) {
        // Terapeuta não pode alterar datas
        setSaving(false);
        // Se só está mudando data/hora, mostrar erro
        if (Object.keys(payload).length === 0) {
          setError('Terapeutas só podem alterar a sala. Nenhuma alteração foi feita.');
          return;
        }
      } else {
        // Admin pode alterar tudo, incluindo datas
        // Construir datas completas
        const dataInicio = new Date(`${form.data_inicio}T${form.hora_inicio}`);
        const dataFim = new Date(`${form.data_fim}T${form.hora_fim}`);

        if (dataFim <= dataInicio) {
          setError('A data de fim deve ser posterior à data de início');
          setSaving(false);
          return;
        }

        if (form.data_inicio || form.hora_inicio || form.data_fim || form.hora_fim) {
          payload.data_inicio = formatLocalDateTime(dataInicio);
          payload.data_fim = formatLocalDateTime(dataFim);
        }
      }

      if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração foi feita');
        setSaving(false);
        return;
      }

      // Se as datas foram alteradas e temos permissão, usar remarcarConsulta
      if (payload.data_inicio && payload.data_fim) {
        await remarcarConsulta(id, {
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim,
        });
        delete payload.data_inicio;
        delete payload.data_fim;
      }

      // Atualizar outros campos
      if (Object.keys(payload).length > 0) {
        await updateConsulta(id, payload);
      }

      navigate('/consultas');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao atualizar consulta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  const isProfessor = user?.role === 'terapeuta' && normalizeText(user?.tipo).includes('professor');
  const canManageForms = user?.role === 'admin' || isProfessor;
  const selectedAreaClinica = areasClinicas.find((area) => area.id === Number(form.area_clinica_id));
  const areaClinicaNome = selectedAreaClinica?.nome || getConsultaValue(consulta, 'area_clinica_nome') || '';
  const isFisioterapiaConsulta = normalizeText(areaClinicaNome).includes('fisioterapia');
  const isPsicologiaConsulta = normalizeText(areaClinicaNome).includes('psicologia');
  const canAddFisioterapiaForm = canManageForms && isFisioterapiaConsulta;
  const canAddPsicologiaForm = canManageForms && isPsicologiaConsulta;

  // Verificar permissões para editar campos específicos
  const isTerapeuta = user?.role === 'terapeuta';
  const isAdmin = user?.role === 'admin';
  const canEditTerapeuta = isAdmin;
  const canEditAreaClinica = isAdmin;
  const canEditDataHora = isAdmin;
  const canEditSala = true; // Terapeuta pode alterar sala

  const handleAddForm = () => {
    if (!isFisioterapiaConsulta) {
      setError('O formulário de avaliação atual só está disponível para consultas de fisioterapia');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-avaliacao/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  const handleAddPsicologiaForm = () => {
    if (!isPsicologiaConsulta) {
      setError('O formulário de psicologia só está disponível para consultas de psicologia');
      return;
    }

    const utenteId = getConsultaValue(consulta, 'utente_id');

    if (!utenteId) {
      setError('Não foi possível identificar o utente desta consulta');
      return;
    }

    navigate(
      `/fichas-psicologia/nova?utente_id=${utenteId}&consulta_id=${getConsultaValue(consulta, 'id')}`,
      {
        state: {
          utenteId,
          consultaId: getConsultaValue(consulta, 'id'),
        },
      }
    );
  };

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/consultas')}>
            ← Voltar
          </button>
          <h1>Editar Consulta</h1>
          {getConsultaValue(consulta, 'utente_nome') && <p>Utente: {getConsultaValue(consulta, 'utente_nome')}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canAddFisioterapiaForm && (
            <button className="btn btn-primary" onClick={handleAddForm}>
              + Ficha Fisioterapia
            </button>
          )}
          {canAddPsicologiaForm && (
            <button className="btn btn-primary" onClick={handleAddPsicologiaForm}>
              + Ficha Psicologia
            </button>
          )}
        </div>
      </div>

      <div className="form-container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Informações da Consulta</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Terapeuta</label>
              <select
                name="terapeuta_id"
                value={form.terapeuta_id}
                onChange={handleChange}
                disabled={!canEditTerapeuta}
                title={!canEditTerapeuta ? 'Terapeutas não podem alterar o terapeuta da consulta' : ''}
              >
                <option value="">Selecionar terapeuta...</option>
                {terapeutas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sala</label>
              <select
                name="sala_id"
                value={form.sala_id}
                onChange={handleChange}
                disabled={!canEditSala}
              >
                <option value="">Selecionar sala...</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Área Clínica</label>
            <select
              name="area_clinica_id"
              value={form.area_clinica_id}
              onChange={handleChange}
              disabled={!canEditAreaClinica}
              title={!canEditAreaClinica ? 'Terapeutas não podem alterar a área clínica da consulta' : ''}
            >
              <option value="">Selecionar área...</option>
              {areasClinicas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>

          <h2>Data e Hora</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Data Início</label>
              <input
                type="date"
                name="data_inicio"
                value={form.data_inicio}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de início' : ''}
              />
            </div>

            <div className="form-group">
              <label>Hora Início</label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de início' : ''}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data Fim</label>
              <input
                type="date"
                name="data_fim"
                value={form.data_fim}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de fim' : ''}
              />
            </div>

            <div className="form-group">
              <label>Hora Fim</label>
              <input
                type="time"
                name="hora_fim"
                value={form.hora_fim}
                onChange={handleChange}
                disabled={!canEditDataHora}
                title={!canEditDataHora ? 'Terapeutas não podem alterar a data/hora de fim' : ''}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/consultas')}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
