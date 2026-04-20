import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUtenteDetails } from '../services/utentes.jsx';
import { createFichaAvaliacao, getFichasAvaliacao } from '../services/fichas.jsx';

const emptyForm = {
  nome_completo: '',
  numero_processo: '',
  data_nascimento: '',
  sexo: '',
  diagnostico_queixa_principal: '',
  tipo_registo: 'individual',
  objetivos_prognostico: '',
  plano_terapeutico: '',
  historia_pessoal: '',
  sinss: '',
};

export function CriarFichaAvaliacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const utenteId = location.state?.utenteId || params.get('utente_id') || '';
  const consultaId = location.state?.consultaId || params.get('consulta_id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [utente, setUtente] = useState(null);
  const [fichas, setFichas] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [lockedFields, setLockedFields] = useState({});

  const getValueByKey = (data, key) => {
    if (!data || !key) return undefined;

    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);

    return data[key] ?? data[camelKey] ?? data[pascalKey];
  };

  const getUtenteValue = (data, key) => getValueByKey(data, key);
  const getFichaValue = (data, key) => getValueByKey(data, key);

  useEffect(() => {
    const fetchData = async () => {
      if (!utenteId) {
        setError('Utente não identificado para este formulário');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const [utenteData, fichasData] = await Promise.all([
          getUtenteDetails(utenteId),
          getFichasAvaliacao(utenteId).catch(() => []),
        ]);

        setUtente(utenteData);
        setFichas(Array.isArray(fichasData) ? fichasData : []);

        const prefilledData = {
          ...emptyForm,
          nome_completo: getUtenteValue(utenteData, 'nome') || '',
          numero_processo: getUtenteValue(utenteData, 'numero_processo') || '',
          data_nascimento: getUtenteValue(utenteData, 'data_nascimento') ? String(getUtenteValue(utenteData, 'data_nascimento')).slice(0, 10) : '',
        };

        const locked = Object.fromEntries(
          Object.entries(prefilledData).map(([field, value]) => [field, value !== '' && value !== null && value !== undefined])
        );

        setForm(prefilledData);
        setLockedFields(locked);
      } catch (err) {
        setError(err?.response?.data?.error || 'Erro ao carregar utente');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [utenteId]);

  const canManageForms = ['admin', 'terapeuta'].includes(user?.role);

  const isFieldLocked = (fieldName) => Boolean(lockedFields[fieldName]);

  const formatFichaDate = (ficha) => {
    const raw = getFichaValue(ficha, 'created_at') || getFichaValue(ficha, 'createdAt');
    if (!raw) return '-';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('pt-PT');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (isFieldLocked(name)) {
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!canManageForms) {
      setError('Não tens permissões para criar formulários');
      return;
    }

    setSaving(true);

    try {
      const normalizedUtenteId = Number(utenteId);

      if (!Number.isFinite(normalizedUtenteId) || normalizedUtenteId <= 0) {
        setError('Utente inválido');
        return;
      }

      const payload = {
        utente_id: normalizedUtenteId,
        consulta_id: consultaId ? Number(consultaId) : undefined,
        nome_completo: form.nome_completo,
        numero_processo: form.numero_processo,
        data_nascimento: form.data_nascimento || undefined,
        sexo: form.sexo,
        diagnostico_queixa_principal: form.diagnostico_queixa_principal,
        tipo_registo: form.tipo_registo,
        objetivos_prognostico: form.objetivos_prognostico,
        plano_terapeutico: form.plano_terapeutico,
        historia_pessoal: form.historia_pessoal,
        sinss: form.sinss,
      };

      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      await createFichaAvaliacao(payload);
      setSuccess('Formulário criado com sucesso');

      setTimeout(() => {
        if (consultaId) {
          navigate(`/consultas/${consultaId}/editar`);
        } else {
          navigate('/user');
        }
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao criar formulário');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page">A carregar formulário...</div>;
  }

  if (!canManageForms) {
    return (
      <div className="page centered">
        <div className="card">
          <h1>Acesso restrito</h1>
          <p>Este formulário só pode ser visto e criado por admin ou terapeuta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page criar-ficha-avaliacao">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => (consultaId ? navigate(`/consultas/${consultaId}/editar`) : navigate('/consultas'))}>
            ← Voltar
          </button>
          <h1>Adicionar formulário</h1>
          {utente?.nome && <p>Utente: {utente.nome}</p>}
        </div>
      </div>

      <div className="form-container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {fichas.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Formulários anteriores</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {fichas.map((ficha, index) => {
                const fichaId = getFichaValue(ficha, 'id') || `ficha-${index}`;
                return (
                <div key={fichaId} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
                  <strong>{getFichaValue(ficha, 'tipo_registo') || 'Formulário'}</strong>
                  <div>{getFichaValue(ficha, 'diagnostico_queixa_principal') || 'Sem diagnóstico registado'}</div>
                  <small>Criado em {formatFichaDate(ficha)}</small>
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedFicha(ficha)}
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {selectedFicha && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Detalhes do formulário</h2>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div><strong>Tipo de registo:</strong> {getFichaValue(selectedFicha, 'tipo_registo') || '-'}</div>
              <div><strong>Diagnóstico:</strong> {getFichaValue(selectedFicha, 'diagnostico_queixa_principal') || '-'}</div>
              <div><strong>Objetivos/Prognóstico:</strong> {getFichaValue(selectedFicha, 'objetivos_prognostico') || '-'}</div>
              <div><strong>Plano terapêutico:</strong> {getFichaValue(selectedFicha, 'plano_terapeutico') || '-'}</div>
              <div><strong>História pessoal:</strong> {getFichaValue(selectedFicha, 'historia_pessoal') || '-'}</div>
              <div><strong>SINSS:</strong> {getFichaValue(selectedFicha, 'sinss') || '-'}</div>
              <div><strong>Criado em:</strong> {formatFichaDate(selectedFicha)}</div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedFicha(null)}>
                Fechar detalhes
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <h2>Novo formulário</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Nome completo</label>
              <input name="nome_completo" value={form.nome_completo} onChange={handleChange} disabled={isFieldLocked('nome_completo')} title={isFieldLocked('nome_completo') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
            </div>
            <div className="form-group">
              <label>Nº processo</label>
              <input name="numero_processo" value={form.numero_processo} onChange={handleChange} disabled={isFieldLocked('numero_processo')} title={isFieldLocked('numero_processo') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de nascimento</label>
              <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} disabled={isFieldLocked('data_nascimento')} title={isFieldLocked('data_nascimento') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
            </div>
            <div className="form-group">
              <label>Sexo</label>
              <select name="sexo" value={form.sexo} onChange={handleChange} disabled={isFieldLocked('sexo')} title={isFieldLocked('sexo') ? 'Campo bloqueado por dados da consulta/utente' : ''}>
                <option value="">Selecionar...</option>
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Diagnóstico / Queixa principal</label>
            <textarea name="diagnostico_queixa_principal" value={form.diagnostico_queixa_principal} onChange={handleChange} rows="4" disabled={isFieldLocked('diagnostico_queixa_principal')} title={isFieldLocked('diagnostico_queixa_principal') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo de registo</label>
              <select name="tipo_registo" value={form.tipo_registo} onChange={handleChange} disabled={isFieldLocked('tipo_registo')} title={isFieldLocked('tipo_registo') ? 'Campo bloqueado por dados da consulta/utente' : ''}>
                <option value="individual">Individual</option>
                <option value="grupo">Grupo</option>
              </select>
            </div>
            <div className="form-group">
              <label>SINSS</label>
              <input name="sinss" value={form.sinss} onChange={handleChange} disabled={isFieldLocked('sinss')} title={isFieldLocked('sinss') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
            </div>
          </div>

          <div className="form-group">
            <label>Objetivos / Prognóstico</label>
            <textarea name="objetivos_prognostico" value={form.objetivos_prognostico} onChange={handleChange} rows="4" disabled={isFieldLocked('objetivos_prognostico')} title={isFieldLocked('objetivos_prognostico') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
          </div>

          <div className="form-group">
            <label>Plano terapêutico</label>
            <textarea name="plano_terapeutico" value={form.plano_terapeutico} onChange={handleChange} rows="4" disabled={isFieldLocked('plano_terapeutico')} title={isFieldLocked('plano_terapeutico') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
          </div>

          <div className="form-group">
            <label>História pessoal</label>
            <textarea name="historia_pessoal" value={form.historia_pessoal} onChange={handleChange} rows="4" disabled={isFieldLocked('historia_pessoal')} title={isFieldLocked('historia_pessoal') ? 'Campo bloqueado por dados da consulta/utente' : ''} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => (consultaId ? navigate(`/consultas/${consultaId}/editar`) : navigate('/consultas'))} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar formulário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}