import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [terapeutas, setTerapeutas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [areasClinicas, setAreasClinicas] = useState([]);

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
        const dataInicio = new Date(consulta.data_inicio);
        const dataFim = new Date(consulta.data_fim);

        setForm({
          terapeuta_id: consulta.terapeuta_id || '',
          sala_id: consulta.sala_id || '',
          area_clinica_id: consulta.area_clinica_id || '',
          data_inicio: dataInicio.toISOString().split('T')[0],
          hora_inicio: dataInicio.toTimeString().slice(0, 5),
          data_fim: dataFim.toISOString().split('T')[0],
          hora_fim: dataFim.toTimeString().slice(0, 5),
        });

        setTerapeutas(t || []);
        setSalas(s || []);
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
      // Construir datas completas
      const dataInicio = new Date(`${form.data_inicio}T${form.hora_inicio}`);
      const dataFim = new Date(`${form.data_fim}T${form.hora_fim}`);

      if (dataFim <= dataInicio) {
        setError('A data de fim deve ser posterior à data de início');
        setSaving(false);
        return;
      }

      // Se as datas foram alteradas, usar remarcarConsulta
      const payload = {
        terapeuta_id: form.terapeuta_id ? parseInt(form.terapeuta_id) : undefined,
        sala_id: form.sala_id ? parseInt(form.sala_id) : undefined,
        area_clinica_id: form.area_clinica_id ? parseInt(form.area_clinica_id) : undefined,
      };

      // Remover undefined values
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      await updateConsulta(id, payload);

      // Se data foi alterada, remarcar
      if (form.data_inicio || form.hora_inicio || form.data_fim || form.hora_fim) {
        await remarcarConsulta(id, {
          data_inicio: dataInicio.toISOString().replace('T', ' ').split('.')[0],
          data_fim: dataFim.toISOString().replace('T', ' ').split('.')[0],
        });
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

  return (
    <div className="page editar-consulta">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/consultas')}>
          ← Voltar
        </button>
        <h1>Editar Consulta</h1>
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
              />
            </div>

            <div className="form-group">
              <label>Hora Início</label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
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
              />
            </div>

            <div className="form-group">
              <label>Hora Fim</label>
              <input
                type="time"
                name="hora_fim"
                value={form.hora_fim}
                onChange={handleChange}
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
