import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { CalendarDate, Person, PlusLg } from 'react-bootstrap-icons';
import { getUtenteConsultas } from '../services/utentes.jsx';
import '../styles/dashboard.css';

export function DashboardUtente() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('consultas');

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (user?.id) {
                    const consultasData = await getUtenteConsultas(user.id);
                    setConsultas(consultasData || []);
                }
            } catch (err) {
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    if (loading) {
        return <div className="page centered">A carregar...</div>;
    }

    return (
        <div className="page dashboard-utente">
            <div className="dashboard-header">
                <h1>Meu Dashboard</h1>
                <p>Bem-vindo, {user?.name}!</p>
            </div>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('consultas')}
                >
                    <CalendarDate size={16} /> Minhas Consultas
                </button>
                <button
                    className={`tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
                    onClick={() => setActiveTab('perfil')}
                >
                    <Person size={16} /> Meu Perfil
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && (
                    <div className="consultas-section">
                        <h2>Minhas Consultas</h2>
                        {consultas.length === 0 ? (
                            <p className="empty-state">Ainda não tem consultas agendadas</p>
                        ) : (
                            <div className="consultas-list">
                                {consultas.map((consulta) => (
                                    <div key={consulta.id} className="consulta-card">
                                        <div className="consulta-info">
                                            <h4>{consulta.tipo}</h4>
                                            <p>Data: {new Date(consulta.data).toLocaleDateString('pt-PT')}</p>
                                            <p>Status: {consulta.estado}</p>
                                        </div>
                                        <button
                                            className="btn-editar"
                                            onClick={() => navigate(`/consultas/${consulta.id}/editar`)}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(user?.role === 'utente' || user?.role === 'administrativo') && (
                            <button className="btn-primary" onClick={() => navigate('/consultas/novo')}>
                                <PlusLg size={14} /> Agendar Nova Consulta
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'perfil' && (
                    <div className="perfil-section">
                        <h2>Meu Perfil</h2>
                        <div className="perfil-info">
                            <p><strong>Nome:</strong> {user?.name}</p>
                            <p><strong>Email:</strong> {user?.email}</p>
                            <p><strong>Tipo:</strong> {user?.role}</p>
                        </div>
                        <button
                            className="btn-secondary"
                            onClick={() => navigate('/user')}
                        >
                            Ver Perfil Completo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
