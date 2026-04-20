import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createConsulta,
  getUtentes,
  getTerapeutas,
  getSalas,
  getAreasClinicas,
} from '../services/consultas.jsx';

export function AgendarConsulta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [utentes, setUtentes] = useState([]);
  const [terapeutas, setTerapeutas] = useState([]);
  const [terapeutasFiltrados, setTerapeutasFiltrados] = useState([]);
  const [salas, setSalas] = useState([]);
  const [salasFiltradas, setSalasFiltradas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

  const [form, setForm] = useState({
    utente_id: '',
    terapeuta_id: '',
    sala_id: '',
    area_clinica_id: '',
    data_inicio: '',
    hora_inicio: '09:00',
    duracao: '60',
  });

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

  // Carregar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [u, t, s, a] = await Promise.all([
          getUtentes(),
          getTerapeutas(),
          getSalas(),
          getAreasClinicas(),
        ]);
        setUtentes(u || []);
        setTerapeutas(t || []);
        setSalas(s || []);
        setAreasClinicas(a || []);
      } catch (err) {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar terapeutas conforme a área clínica selecionada
  useEffect(() => {
    if (form.area_clinica_id) {
      const terapeutasArea = terapeutas.filter((t) => 
        t.area_clinica_id === parseInt(form.area_clinica_id)
      );
      setTerapeutasFiltrados(terapeutasArea);
      // Limpar seleção anterior se não for compatível
      setForm((prev) => ({
        ...prev,
        terapeuta_id: '',
      }));
    } else {
      setTerapeutasFiltrados([]);
    }
  }, [form.area_clinica_id, terapeutas]);

  // Filtrar salas conforme a área clínica selecionada
  useEffect(() => {
    if (form.area_clinica_id) {
      const salasArea = salas.filter((sala) => {
        if (sala.areas_clinicas && sala.areas_clinicas.length > 0) {
          return sala.areas_clinicas.some(
            (area) => area.id === parseInt(form.area_clinica_id)
          );
        }
        return false;
      });
      setSalasFiltradas(dedupeSalasByNome(salasArea));
      // Limpar seleção anterior se não for compatível
      setForm((prev) => ({
        ...prev,
        sala_id: '',
      }));
    } else {
      setSalasFiltradas([]);
    }
  }, [form.area_clinica_id, salas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.utente_id || !form.terapeuta_id || !form.sala_id || !form.area_clinica_id) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      // Calcular data_fim baseado na duração
      const [year, month, day] = form.data_inicio.split('-');
      const [hour, minute] = form.hora_inicio.split(':');

      const dataInicio = new Date(year, month - 1, day, hour, minute);
      const dataFim = new Date(dataInicio.getTime() + parseInt(form.duracao) * 60000);

      const payload = {
        utente_id: parseInt(form.utente_id),
        terapeuta_id: parseInt(form.terapeuta_id),
        sala_id: parseInt(form.sala_id),
        area_clinica_id: parseInt(form.area_clinica_id),
        data_inicio: dataInicio.toISOString().replace('T', ' ').split('.')[0],
        data_fim: dataFim.toISOString().replace('T', ' ').split('.')[0],
      };

      await createConsulta(payload);
      navigate('/consultas');
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao agendar consulta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar...</div>;
  }

  return (
    <div className="page agendar-consulta">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/consultas')}>
          ← Voltar
        </button>
        <h1>Agendar Nova Consulta</h1>
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
              <label>Utente *</label>
              <select
                name="utente_id"
                value={form.utente_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecionar utente...</option>
                {utentes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Terapeuta *</label>
              <select
                name="terapeuta_id"
                value={form.terapeuta_id}
                onChange={handleChange}
                required
                disabled={!form.area_clinica_id}
              >
                <option value="">
                  {form.area_clinica_id ? 'Selecionar terapeuta...' : 'Seleciona primeiro uma área clínica'}
                </option>
                {terapeutasFiltrados.map((t) => (
                  <option key={t.user_id} value={t.user_id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sala *</label>
              <select
                name="sala_id"
                value={form.sala_id}
                onChange={handleChange}
                required
                disabled={!form.area_clinica_id}
              >
                <option value="">
                  {form.area_clinica_id ? 'Selecionar sala...' : 'Seleciona primeiro uma área clínica'}
                </option>
                {salasFiltradas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Área Clínica *</label>
              <select
                name="area_clinica_id"
                value={form.area_clinica_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecionar área...</option>
                {areasClinicas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h2>Data e Hora</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Data *</label>
              <input
                type="date"
                name="data_inicio"
                value={form.data_inicio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Hora Início *</label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Duração (minutos) *</label>
              <select
                name="duracao"
                value={form.duracao}
                onChange={handleChange}
                required
              >
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora 30 min</option>
                <option value="120">2 horas</option>
              </select>
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
              {saving ? 'A agendar...' : 'Agendar Consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
