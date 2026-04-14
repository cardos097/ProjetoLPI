import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ListaUtentes } from './ListaUtentes.jsx';
import { ListaConsultas } from './ListaConsultas.jsx';
import '../styles/dashboard.css';

export function DashboardStaff() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('consultas');

    if (!user) {
        return <div className="page centered">A carregar...</div>;
    }

    return (
        <div className="page dashboard-staff">
            <div className="dashboard-header">
                <h1>Dashboard - {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</h1>
                <p>Bem-vindo, {user.name}!</p>
            </div>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('consultas')}
                >
                    📅 Agenda
                </button>
                <button
                    className={`tab-btn ${activeTab === 'utentes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('utentes')}
                >
                    👥 Clientes/Pacientes
                </button>
                {user.role === 'admin' && (
                    <button
                        className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        ⚙️ Administração
                    </button>
                )}
            </div>

            <div className="dashboard-content">
                {activeTab === 'consultas' && <ListaConsultas />}
                {activeTab === 'utentes' && <ListaUtentes />}
                {activeTab === 'admin' && user.role === 'admin' && (
                    <div className="admin-section">
                        <h2>Painel de Administração</h2>
                        <div className="admin-grid">
                            <div className="admin-card">
                                <h3>📊 Estatísticas</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                            <div className="admin-card">
                                <h3>⚙️ Configurações</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                            <div className="admin-card">
                                <h3>👤 Utilizadores</h3>
                                <p>Em desenvolvimento...</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
