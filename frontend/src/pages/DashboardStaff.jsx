import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { DateInput } from '../components/DateInput.jsx';
import {
    CalendarDate, People, Hospital, Mortarboard, Gear, PlusLg, Book,
    BarChart, Person, PersonFill, ClipboardData, ExclamationCircle,
    CheckCircle, XCircle, ClockHistory, FileText, Eye, ToggleOn, ToggleOff,
    Download, Trash,
} from 'react-bootstrap-icons';
import { ListaUtentes } from './ListaUtentes.jsx';
import { ListaConsultas } from './ListaConsultas.jsx';
import { ListaSalas } from './ListaSalas.jsx';
import { GerirAlunosModal } from '../components/GerirAlunosModal.jsx';
import { CriarUtenteModal } from '../components/CriarUtenteModal.jsx';
import { getAlunosDoProfessor } from '../services/terapeutas.jsx';
import { getUtentes } from '../services/utentes.jsx';
import {
    getAdminStats, getStaffUsers, toggleUserActive, createStaffUser,
    getAssiduidade, createAssiduidade, getDocumentos, downloadDocumento,
} from '../services/admin.jsx';
import { getFichasAvaliacao, getFichaAvaliacaoById, deleteFichaAvaliacao, getPendentes, validarFicha } from '../services/fichas.jsx';
import { validarDocumento } from '../services/consultas.jsx';
import '../styles/dashboard.css';

const ESTADO_LABEL = { P: 'Presente', A: 'Ausente', FJ: 'Falta Justificada', FI: 'Falta Injustificada' };
const ESTADO_COLOR = { P: '#10b981', A: '#ef4444', FJ: '#f59e0b', FI: '#f97316' };

function StatCard({ icon, label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-num">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

export function DashboardStaff() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('consultas');

    // — Alunos —
    const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);
    const [meuAlunos, setMeuAlunos] = useState([]);
    const [loadingAlunos, setLoadingAlunos] = useState(false);

    // — Utente modal —
    const [isUtenteModalOpen, setIsUtenteModalOpen] = useState(false);

    // — Admin: stats —
    const [stats, setStats] = useState(null);

    // — Admin: staff users —
    const [staffUsers, setStaffUsers] = useState([]);
    const [showCreateStaff, setShowCreateStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({ nome: '', email: '', password: '', role: 'administrativo' });
    const [staffError, setStaffError] = useState('');
    const [staffLoading, setStaffLoading] = useState(false);

    // — Assiduidade —
    const [assiduidade, setAssiduidade] = useState([]);
    const [assUtentes, setAssUtentes] = useState([]);
    const [assFilter, setAssFilter] = useState({ utente_id: '', data: '' });
    const [assForm, setAssForm] = useState({ utente_id: '', data: '', estado: 'P', observacao: '' });
    const [assError, setAssError] = useState('');
    const [assLoading, setAssLoading] = useState(false);
    const [showAssForm, setShowAssForm] = useState(false);

    // — Pendentes —
    const [pendentes, setPendentes] = useState({ fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], documentos: [] });
    const [loadingPendentes, setLoadingPendentes] = useState(false);

    // — Fichas —
    const [fichasTab, setFichasTab] = useState('avaliacao');
    const [fichasAvaliacao, setFichasAvaliacao] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [fichaDetalhe, setFichaDetalhe] = useState(null);
    const [fichasSearch, setFichasSearch] = useState('');

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (activeTab === 'alunos' && user?.tipo === 'professor') carregarAlunos();
        if (activeTab === 'admin' && user?.role === 'admin') carregarAdmin();
        if (activeTab === 'assiduidade') carregarAssiduidade();
        if (activeTab === 'fichas') carregarFichas();
        if (activeTab === 'pendentes') carregarPendentes();
    }, [activeTab]);

    const carregarAlunos = async () => {
        setLoadingAlunos(true);
        try { setMeuAlunos((await getAlunosDoProfessor()) || []); } catch { setMeuAlunos([]); } finally { setLoadingAlunos(false); }
    };

    const carregarAdmin = async () => {
        try {
            const [s, u] = await Promise.all([getAdminStats(), getStaffUsers()]);
            setStats(s);
            setStaffUsers(u || []);
        } catch { setStats(null); }
    };

    const carregarAssiduidade = async () => {
        try {
            const [ass, uts] = await Promise.all([getAssiduidade(assFilter), getUtentes()]);
            setAssiduidade(ass || []);
            setAssUtentes(uts || []);
        } catch { setAssiduidade([]); }
    };

    const carregarPendentes = async () => {
        setLoadingPendentes(true);
        try {
            const data = await getPendentes();
            setPendentes(data || { fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], documentos: [] });
        } catch { setPendentes({ fichas_avaliacao: [], fichas_psicologia: [], fichas_terapia_fala: [], documentos: [] }); }
        finally { setLoadingPendentes(false); }
    };

    const handleValidarFicha = async (tipo, id, acao) => {
        if (acao === 'rejeitar' && !window.confirm('Tens a certeza que queres rejeitar e eliminar esta submissão?')) return;
        try {
            await validarFicha(tipo, id, acao);
            carregarPendentes();
        } catch { alert('Erro ao processar validação.'); }
    };

    const handleValidarDocumento = async (id, acao) => {
        if (acao === 'rejeitar' && !window.confirm('Tens a certeza que queres rejeitar e eliminar este documento?')) return;
        try {
            await validarDocumento(id, acao);
            carregarPendentes();
        } catch { alert('Erro ao processar validação.'); }
    };

    const carregarFichas = async () => {
        try {
            const [av, docs] = await Promise.all([getFichasAvaliacao(), getDocumentos()]);
            setFichasAvaliacao(av || []);
            setDocumentos(docs || []);
        } catch { setFichasAvaliacao([]); setDocumentos([]); }
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggleActive = async (userId) => {
        try {
            const { active } = await toggleUserActive(userId);
            setStaffUsers(prev => prev.map(u => u.id === userId ? { ...u, active } : u));
        } catch { }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setStaffError('');
        setStaffLoading(true);
        try {
            const novo = await createStaffUser(staffForm);
            setStaffUsers(prev => [novo, ...prev]);
            setShowCreateStaff(false);
            setStaffForm({ nome: '', email: '', password: '', role: 'administrativo' });
        } catch (err) {
            setStaffError(err?.response?.data?.error || 'Erro ao criar utilizador');
        } finally {
            setStaffLoading(false);
        }
    };

    const handleAssFilter = async () => {
        try {
            const params = {};
            if (assFilter.utente_id) params.utente_id = assFilter.utente_id;
            if (assFilter.data) params.data = assFilter.data;
            setAssiduidade((await getAssiduidade(params)) || []);
        } catch { }
    };

    const handleCreateAss = async (e) => {
        e.preventDefault();
        setAssError('');
        setAssLoading(true);
        try {
            const novo = await createAssiduidade({
                utente_id: parseInt(assForm.utente_id),
                data: assForm.data,
                estado: assForm.estado,
                observacao: assForm.observacao,
            });
            setAssiduidade(prev => [novo, ...prev]);
            setShowAssForm(false);
            setAssForm({ utente_id: '', data: '', estado: 'P', observacao: '' });
        } catch (err) {
            setAssError(err?.response?.data?.error || 'Erro ao registar assiduidade');
        } finally {
            setAssLoading(false);
        }
    };

    const handleVerFicha = async (id) => {
        try {
            const detalhe = await getFichaAvaliacaoById(id);
            setFichaDetalhe(detalhe);
        } catch { }
    };

    const handleDeleteFicha = async (id, nome) => {
        if (!window.confirm(`Tem a certeza que deseja apagar a ficha de avaliação de ${nome}? Esta ação não pode ser revertida.`)) {
            return;
        }

        try {
            await deleteFichaAvaliacao(id);
            setFichasAvaliacao(fichasAvaliacao.filter(f => f.ID !== id));
            alert('Ficha de avaliação eliminada com sucesso');
        } catch (err) {
            const errorMsg = err?.response?.data?.error || err?.message || 'Erro ao eliminar ficha de avaliação';
            alert(errorMsg);
            console.error('Erro ao eliminar ficha:', err);
        }
    };

    const handleDownload = async (doc) => {
        try {
            const blob = await downloadDocumento(doc.arquivo_url);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.nome_arquivo;
            a.click();
            URL.revokeObjectURL(url);
        } catch { }
    };

    if (!user) return <div className="page centered">A carregar...</div>;

    return (
        <div className="page dashboard-staff">
            <div className="dashboard-header">
                <h1>Dashboard — {user.role === 'administrativo' ? 'Administrativo' : (user.role.charAt(0).toUpperCase() + user.role.slice(1))}</h1>
                <p>Bem-vindo, {user.name}!</p>
            </div>

            <div className="dashboard-tabs">
                <button className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`} onClick={() => setActiveTab('consultas')}>
                    <CalendarDate size={16} /> Agenda
                </button>
                <button className={`tab-btn ${activeTab === 'utentes' ? 'active' : ''}`} onClick={() => setActiveTab('utentes')}>
                    <People size={16} /> Clientes/Pacientes
                </button>
                <button className={`tab-btn ${activeTab === 'salas' ? 'active' : ''}`} onClick={() => setActiveTab('salas')}>
                    <Hospital size={16} /> Salas
                </button>
                <button className={`tab-btn`} onClick={() => setIsUtenteModalOpen(true)}>
                    <PlusLg size={16} /> Adicionar Utente
                </button>
                {(user.role === 'admin' || user.role === 'administrativo') && (
                    <button className={`tab-btn ${activeTab === 'assiduidade' ? 'active' : ''}`} onClick={() => setActiveTab('assiduidade')}>
                        <ClockHistory size={16} /> Assiduidade
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'terapeuta') && (
                    <button className={`tab-btn ${activeTab === 'fichas' ? 'active' : ''}`} onClick={() => setActiveTab('fichas')}>
                        <FileText size={16} /> Fichas
                    </button>
                )}
                {user.tipo === 'professor' && (
                    <button className={`tab-btn ${activeTab === 'alunos' ? 'active' : ''}`} onClick={() => setActiveTab('alunos')}>
                        <Mortarboard size={16} /> Gerir Alunos
                    </button>
                )}
                {(user.tipo === 'professor' || user.role === 'admin') && (
                    <button className={`tab-btn ${activeTab === 'pendentes' ? 'active' : ''}`} onClick={() => setActiveTab('pendentes')}
                        style={{ position: 'relative' }}>
                        <ExclamationCircle size={16} /> Pendentes
                        {((pendentes.fichas_avaliacao?.length || 0) + (pendentes.fichas_psicologia?.length || 0) +
                          (pendentes.fichas_terapia_fala?.length || 0) + (pendentes.documentos?.length || 0)) > 0 && (
                            <span style={{
                                background: '#ef4444', color: 'white', borderRadius: '50%',
                                width: 18, height: 18, fontSize: 11, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                marginLeft: 4,
                            }}>
                                {(pendentes.fichas_avaliacao?.length || 0) + (pendentes.fichas_psicologia?.length || 0) +
                                 (pendentes.fichas_terapia_fala?.length || 0) + (pendentes.documentos?.length || 0)}
                            </span>
                        )}
                    </button>
                )}
                {user.role === 'admin' && (
                    <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                        <Gear size={16} /> Administração
                    </button>
                )}
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && <ListaConsultas />}
                {activeTab === 'utentes' && <ListaUtentes />}
                {activeTab === 'salas' && <ListaSalas />}

                {/* ── Assiduidade ── */}
                {activeTab === 'assiduidade' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><ClockHistory size={20} /> Assiduidade</h2>
                            <button className="btn-primary" onClick={() => setShowAssForm(!showAssForm)}>
                                <PlusLg size={14} /> Registar presença
                            </button>
                        </div>

                        {showAssForm && (
                            <div className="admin-card" style={{ marginBottom: 20 }}>
                                <h3>Novo registo de assiduidade</h3>
                                {assError && <p className="alert alert-error">{assError}</p>}
                                <form onSubmit={handleCreateAss} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label>Utente</label>
                                        <select value={assForm.utente_id} onChange={e => setAssForm(f => ({ ...f, utente_id: e.target.value }))} required>
                                            <option value="">Selecionar utente</option>
                                            {assUtentes.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Data</label>
                                        <DateInput name="data" value={assForm.data} onChange={e => setAssForm(f => ({ ...f, data: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado</label>
                                        <select value={assForm.estado} onChange={e => setAssForm(f => ({ ...f, estado: e.target.value }))}>
                                            <option value="P">Presente</option>
                                            <option value="A">Ausente</option>
                                            <option value="FJ">Falta Justificada</option>
                                            <option value="FI">Falta Injustificada</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Observação</label>
                                        <input type="text" value={assForm.observacao} onChange={e => setAssForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
                                    </div>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                                        <button type="submit" className="btn-primary" disabled={assLoading}>{assLoading ? 'A guardar...' : 'Guardar'}</button>
                                        <button type="button" className="btn-secondary" onClick={() => setShowAssForm(false)}>Cancelar</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <select value={assFilter.utente_id} onChange={e => setAssFilter(f => ({ ...f, utente_id: e.target.value }))} style={{ flex: 1 }}>
                                <option value="">Todos os utentes</option>
                                {assUtentes.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                            </select>
                            <DateInput name="data" value={assFilter.data} onChange={e => setAssFilter(f => ({ ...f, data: e.target.value }))} />
                            <button className="btn-secondary" onClick={handleAssFilter}>Filtrar</button>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Utente</th><th>Data</th><th>Estado</th><th>Observação</th></tr>
                                </thead>
                                <tbody>
                                    {assiduidade.length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>Nenhum registo encontrado</td></tr>
                                    ) : assiduidade.map(reg => (
                                        <tr key={reg.ID}>
                                            <td>{assUtentes.find(u => u.id === reg.UtenteID)?.nome || `Utente ${reg.UtenteID}`}</td>
                                            <td>{new Date(reg.Data).toLocaleDateString('pt-PT')}</td>
                                            <td>
                                                <span style={{ color: ESTADO_COLOR[reg.Estado], fontWeight: 600 }}>
                                                    {ESTADO_LABEL[reg.Estado] || reg.Estado}
                                                </span>
                                            </td>
                                            <td>{reg.Observacao || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Fichas ── */}
                {activeTab === 'fichas' && (() => {
                    const fichasAvaliacaoFiltradas = fichasAvaliacao.filter(f =>
                        (f.NomeCompleto || '').toLowerCase().includes(fichasSearch.toLowerCase())
                    );
                    const documentosFiltrados = documentos.filter(d =>
                        (d.utente_nome || '').toLowerCase().includes(fichasSearch.toLowerCase())
                    );
                    return (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><FileText size={20} /> Fichas Clínicas</h2>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Pesquisar por utente..."
                                    value={fichasSearch}
                                    onChange={e => setFichasSearch(e.target.value)}
                                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, width: 220 }}
                                />
                                <button className={`btn-secondary ${fichasTab === 'avaliacao' ? 'active' : ''}`} onClick={() => { setFichasTab('avaliacao'); setFichasSearch(''); }} style={{ fontWeight: fichasTab === 'avaliacao' ? 700 : 400 }}>
                                    Avaliação ({fichasAvaliacaoFiltradas.length})
                                </button>
                                <button className={`btn-secondary ${fichasTab === 'ficheiros' ? 'active' : ''}`} onClick={() => { setFichasTab('ficheiros'); setFichasSearch(''); }} style={{ fontWeight: fichasTab === 'ficheiros' ? 700 : 400 }}>
                                    Ficheiros ({documentosFiltrados.length})
                                </button>
                            </div>
                        </div>

                        {fichasTab === 'avaliacao' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Utente</th><th>Nº Processo</th><th>Queixa Principal</th><th>Tipo</th><th>Data</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {fichasAvaliacaoFiltradas.length === 0 ? (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>
                                                {fichasSearch ? `Nenhum resultado para "${fichasSearch}"` : 'Nenhuma ficha de avaliação'}
                                            </td></tr>
                                        ) : fichasAvaliacaoFiltradas.map(f => (
                                            <tr key={f.ID}>
                                                <td>{f.NomeCompleto || '—'}</td>
                                                <td>{f.NumeroProcesso || '—'}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.DiagnosticoQueixaPrincipal || '—'}</td>
                                                <td>{f.TipoRegisto || '—'}</td>
                                                <td>{f.CreatedAt ? new Date(f.CreatedAt).toLocaleDateString('pt-PT') : '—'}</td>
                                                <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" onClick={() => handleVerFicha(f.ID)} title="Ver ficha"><Eye size={16} /></button>
                                                    <button className="btn-icon" onClick={() => handleDeleteFicha(f.ID, f.NomeCompleto)} style={{ color: '#ef4444' }} title="Apagar ficha"><Trash size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {fichasTab === 'ficheiros' && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Nome do ficheiro</th><th>Utente</th><th>Data consulta</th><th>Carregado em</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {documentosFiltrados.length === 0 ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                                                {fichasSearch ? `Nenhum resultado para "${fichasSearch}"` : 'Nenhum ficheiro carregado'}
                                            </td></tr>
                                        ) : documentosFiltrados.map(d => (
                                            <tr key={d.id}>
                                                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome_arquivo}</td>
                                                <td>{d.utente_nome || '—'}</td>
                                                <td>{d.data_consulta || '—'}</td>
                                                <td>{d.created_at || '—'}</td>
                                                <td><button className="btn-icon" title="Descarregar" onClick={() => handleDownload(d)}><Download size={16} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {/* ── Alunos ── */}
                {activeTab === 'alunos' && user.tipo === 'professor' && (
                    <div className="alunos-section">
                        <div className="section-header">
                            <h2><Mortarboard size={20} /> Gerir Alunos</h2>
                            <button className="btn-primary" onClick={() => setIsAlunosModalOpen(true)}>
                                <PlusLg size={14} /> Gerir Alunos
                            </button>
                        </div>
                        <div className="alunos-container">
                            <div className="alunos-card">
                                <h3><Book size={18} /> Meus Alunos ({meuAlunos.length})</h3>
                                {loadingAlunos ? (
                                    <p className="loading">A carregar alunos...</p>
                                ) : meuAlunos.length === 0 ? (
                                    <p className="empty-state">Ainda não tens alunos associados.</p>
                                ) : (
                                    <div className="alunos-grid">
                                        {meuAlunos.map(aluno => (
                                            <div key={aluno.user_id} className="aluno-card">
                                                <div className="aluno-avatar"><Mortarboard size={28} /></div>
                                                <h4>{aluno.nome}</h4>
                                                <p>{aluno.email}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Administração ── */}
                {activeTab === 'admin' && user.role === 'admin' && (
                    <div className="admin-section">
                        {/* Stats */}
                        <h2 style={{ marginBottom: 16 }}><BarChart size={20} /> Estatísticas</h2>
                        {stats ? (
                            <div className="consultas-stats-bar" style={{ marginBottom: 32 }}>
                                <StatCard icon={<People size={20} />} label="Utentes ativos" value={stats.total_utentes} />
                                <StatCard icon={<PersonFill size={20} />} label="Terapeutas" value={stats.total_terapeutas} />
                                <StatCard icon={<CalendarDate size={20} />} label="Consultas hoje" value={stats.consultas_hoje} />
                                <StatCard icon={<CalendarDate size={20} />} label="Esta semana" value={stats.consultas_semana} />
                                <StatCard icon={<ClipboardData size={20} />} label="Agendadas" value={stats.consultas_agendadas} />
                                <StatCard icon={<ExclamationCircle size={20} />} label="Taxa de faltas" value={`${(stats.taxa_faltas || 0).toFixed(1)}%`} />
                            </div>
                        ) : (
                            <p style={{ color: '#6b7280', marginBottom: 32 }}>A carregar estatísticas...</p>
                        )}

                        {/* Staff users */}
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <h2><Person size={20} /> Utilizadores/Staff</h2>
                            <button className="btn-primary" onClick={() => setShowCreateStaff(!showCreateStaff)}>
                                <PlusLg size={14} /> Criar utilizador
                            </button>
                        </div>

                        {showCreateStaff && (
                            <div className="admin-card" style={{ marginBottom: 20 }}>
                                <h3>Novo utilizador de staff</h3>
                                {staffError && <p className="alert alert-error">{staffError}</p>}
                                <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label>Nome</label>
                                        <input type="text" value={staffForm.nome} onChange={e => setStaffForm(f => ({ ...f, nome: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} minLength={8} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Função</label>
                                        <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
                                            <option value="administrativo">Administrativo</option>
                                            <option value="terapeuta">Terapeuta</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                                        <button type="submit" className="btn-primary" disabled={staffLoading}>{staffLoading ? 'A criar...' : 'Criar conta'}</button>
                                        <button type="button" className="btn-secondary" onClick={() => setShowCreateStaff(false)}>Cancelar</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Nome</th><th>Email</th><th>Função</th><th>Tipo</th><th>Área</th><th>Estado</th><th>Ações</th></tr>
                                </thead>
                                <tbody>
                                    {staffUsers.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>Nenhum utilizador de staff</td></tr>
                                    ) : staffUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.nome}</td>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                                            <td><span className={`status ${u.role}`}>{u.role}</span></td>
                                            <td>{u.tipo || '—'}</td>
                                            <td>{u.area_clinica || '—'}</td>
                                            <td>
                                                {u.active
                                                    ? <span style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}><CheckCircle size={14} /> Ativo</span>
                                                    : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}><XCircle size={14} /> Inativo</span>}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    title={u.active ? 'Desativar' : 'Ativar'}
                                                    onClick={() => handleToggleActive(u.id)}
                                                >
                                                    {u.active ? <ToggleOn size={22} color="#10b981" /> : <ToggleOff size={22} color="#9ca3af" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Pendentes ── */}
                {activeTab === 'pendentes' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2><ExclamationCircle size={20} /> Submissões Pendentes de Alunos</h2>
                        </div>
                        {loadingPendentes ? (
                            <p>A carregar...</p>
                        ) : (
                            (() => {
                                const total = (pendentes.fichas_avaliacao?.length || 0) +
                                    (pendentes.fichas_psicologia?.length || 0) +
                                    (pendentes.fichas_terapia_fala?.length || 0) +
                                    (pendentes.documentos?.length || 0);
                                if (total === 0) return <p style={{ color: '#6b7280' }}>Sem submissões pendentes.</p>;

                                const fichaRows = [
                                    ...((pendentes.fichas_avaliacao || []).map(f => ({ ...f, _tipo: 'avaliacao', _label: 'Fisioterapia' }))),
                                    ...((pendentes.fichas_psicologia || []).map(f => ({ ...f, _tipo: 'psicologia', _label: 'Psicologia' }))),
                                    ...((pendentes.fichas_terapia_fala || []).map(f => ({ ...f, _tipo: 'terapia-fala', _label: 'Terapia da Fala' }))),
                                ];

                                return (
                                    <div>
                                        {fichaRows.length > 0 && (
                                            <>
                                                <h3 style={{ marginBottom: 8, marginTop: 16 }}>Fichas Clínicas</h3>
                                                <div className="table-container">
                                                    <table className="data-table">
                                                        <thead><tr>
                                                            <th>Tipo</th><th>Utente</th><th>Aluno</th><th>Data</th><th>Ações</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {fichaRows.map(f => (
                                                                <tr key={`${f._tipo}-${f.id}`}>
                                                                    <td><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>{f._label}</span></td>
                                                                    <td>{f.utente_nome || '—'}</td>
                                                                    <td>{f.aluno_nome || '—'}</td>
                                                                    <td>{f.created_at ? new Date(f.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarFicha(f._tipo, f.id, 'aprovar')}>
                                                                            <CheckCircle size={14} /> Aprovar
                                                                        </button>
                                                                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarFicha(f._tipo, f.id, 'rejeitar')}>
                                                                            <XCircle size={14} /> Rejeitar
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                        {(pendentes.documentos?.length > 0) && (
                                            <>
                                                <h3 style={{ marginBottom: 8, marginTop: 24 }}>Documentos PDF</h3>
                                                <div className="table-container">
                                                    <table className="data-table">
                                                        <thead><tr>
                                                            <th>Ficheiro</th><th>Utente</th><th>Aluno</th><th>Data</th><th>Ações</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {pendentes.documentos.map(d => (
                                                                <tr key={d.id}>
                                                                    <td>
                                                                        <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer"
                                                                            style={{ color: '#1e40af', textDecoration: 'none' }}>
                                                                            <FileText size={14} /> {d.nome_arquivo}
                                                                        </a>
                                                                    </td>
                                                                    <td>{d.utente_nome || '—'}</td>
                                                                    <td>{d.aluno_nome || '—'}</td>
                                                                    <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarDocumento(d.id, 'aprovar')}>
                                                                            <CheckCircle size={14} /> Aprovar
                                                                        </button>
                                                                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}
                                                                            onClick={() => handleValidarDocumento(d.id, 'rejeitar')}>
                                                                            <XCircle size={14} /> Rejeitar
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal detalhe ficha ── */}
            {fichaDetalhe && (
                <div className="modal-overlay" onClick={() => setFichaDetalhe(null)}>
                    <div className="modal-content" style={{ maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ficha de Avaliação</h2>
                            <button className="modal-close" onClick={() => setFichaDetalhe(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {Object.entries(fichaDetalhe)
                                .filter(([k]) => !['ID', 'UtenteID', 'ConsultaID', 'CreatedBy', 'CreatedAt', 'Utente', 'Consulta', 'User', 'AvaliacoesObjetivas'].includes(k))
                                .map(([k, v]) => v ? (
                                    <div key={k} style={{ gridColumn: String(v).length > 60 ? '1/-1' : 'auto' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 2 }}>
                                            {k.replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                        <div style={{ fontSize: 14 }}>{String(v)}</div>
                                    </div>
                                ) : null)}
                        </div>
                    </div>
                </div>
            )}

            <GerirAlunosModal
                isOpen={isAlunosModalOpen}
                onClose={() => setIsAlunosModalOpen(false)}
                onSuccess={() => { setIsAlunosModalOpen(false); carregarAlunos(); }}
            />
            <CriarUtenteModal
                isOpen={isUtenteModalOpen}
                onClose={() => setIsUtenteModalOpen(false)}
                onSuccess={() => setIsUtenteModalOpen(false)}
            />
        </div>
    );
}
