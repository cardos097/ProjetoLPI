import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CalendarDate, People, Hospital, Mortarboard, Gear, PlusLg, Book, BarChart, Person } from 'react-bootstrap-icons';
import { ListaUtentes } from './ListaUtentes.jsx';
import { ListaConsultas } from './ListaConsultas.jsx';
import { ListaSalas } from './ListaSalas.jsx';
import { GerirAlunosModal } from '../components/GerirAlunosModal.jsx';
import { getAlunosDoProfessor } from '../services/terapeutas.jsx';
import '../styles/dashboard.css';

export function DashboardStaff() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('consultas');
    const [isAlunosModalOpen, setIsAlunosModalOpen] = useState(false);
    const [meuAlunos, setMeuAlunos] = useState([]);
    const [loadingAlunos, setLoadingAlunos] = useState(false);

    useEffect(() => {
        if (activeTab === 'alunos' && user?.tipo === 'professor') {
            carregarAlunos();
        }
    }, [activeTab, user?.tipo]);

    const carregarAlunos = async () => {
        try {
            setLoadingAlunos(true);
            const alunos = await getAlunosDoProfessor();
            setMeuAlunos(alunos || []);
        } catch (err) {
            setMeuAlunos([]);
        } finally {
            setLoadingAlunos(false);
        }
    };

    if (!user) {
        return <div className="page centered">A carregar...</div>;
    }

    return (
        <div className="page dashboard-staff">
            <div className="dashboard-header">
                <h1>Dashboard - {user.role === 'administrativo' ? 'Administrativo' : (user.role.charAt(0).toUpperCase() + user.role.slice(1))}</h1>
                <p>Bem-vindo, {user.name}!</p>
            </div>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('consultas')}
                >
                    <CalendarDate size={16} /> Agenda
                </button>
                <button
                    className={`tab-btn ${activeTab === 'utentes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('utentes')}
                >
                    <People size={16} /> Clientes/Pacientes
                </button>
                <button
                    className={`tab-btn ${activeTab === 'salas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('salas')}
                >
                    <Hospital size={16} /> Salas
                </button>
                {user.tipo === 'professor' && (
                    <button
                        className={`tab-btn ${activeTab === 'alunos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('alunos')}
                    >
                        <Mortarboard size={16} /> Gerir Alunos
                    </button>
                )}
                {user.role === 'admin' && (
                    <button
                        className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        <Gear size={16} /> Administração
                    </button>
                )}
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && <ListaConsultas />}
                {activeTab === 'utentes' && <ListaUtentes />}
                {activeTab === 'salas' && <ListaSalas />}
                {activeTab === 'alunos' && user.tipo === 'professor' && (
                    <div className="alunos-section">
                        <div className="section-header">
                            <h2><Mortarboard size={20} /> Gerir Alunos</h2>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    setIsAlunosModalOpen(true);
                                }}
                            >
                                <PlusLg size={14} /> Gerir Alunos
                            </button>
                        </div>

                        <div className="alunos-container">
                            <div className="alunos-card">
                                <h3><Book size={18} /> Meus Alunos ({meuAlunos.length})</h3>
                                {loadingAlunos ? (
                                    <p className="loading">Carregando alunos...</p>
                                ) : meuAlunos.length === 0 ? (
                                    <p className="empty-state">Ainda não tens alunos associados. Clica em "Gerir Alunos" para começar.</p>
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
                {activeTab === 'admin' && user.role === 'admin' && (
                    <div className="admin-section">
                        <h2>Painel de Administração</h2>
                        <div className="admin-grid">
                            <div className="admin-card">
                                <h3><BarChart size={18} /> Estatísticas</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                            <div className="admin-card">
                                <h3><Gear size={18} /> Configurações</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                            <div className="admin-card">
                                <h3><Person size={18} /> Utilizadores</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GerirAlunosModal
                isOpen={isAlunosModalOpen}
                onClose={() => setIsAlunosModalOpen(false)}
                onSuccess={() => {
                    setIsAlunosModalOpen(false);
                    carregarAlunos();
                }}
            />
        </div>
    );
}
