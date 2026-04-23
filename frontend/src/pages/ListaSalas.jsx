import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSalas, getConsultas } from '../services/consultas.jsx';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import '../styles/dashboard.css';

export function ListaSalas() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [salas, setSalas] = useState([]);
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            setError('');

            const salasList = await getSalas();
            const consultasList = await getConsultas();

            // Filtrar salas baseado em role e area_clinica
            let salasFiltradas = salasList;
            
            if (user?.role === 'terapeuta') {
                // Professor: ve só as salas da sua área clínica
                const isFisio = user?.area_clinica_id === 3; // Fisioterapia
                salasFiltradas = salasList.filter(sala => {
                    const isSalaFisio = sala.descricao?.includes('fisioterapia') || sala.nome?.includes('Fisio');
                    return isFisio ? isSalaFisio : !isSalaFisio;
                });
            } else if (user?.role !== 'admin' && user?.role !== 'administrativo') {
                // Outros roles (utente): sem acesso
                setError('Sem permissão para ver salas');
                setLoading(false);
                return;
            }
            // Admin e administrativo veem tudo

            setSalas(salasFiltradas);
            setConsultas(consultasList || []);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar salas');
        } finally {
            setLoading(false);
        }
    };

    // Converter salas para recursos do FullCalendar
    const resources = salas.map(sala => ({
        id: `sala-${sala.id}`,
        title: sala.nome
    }));

    // Converter consultas para eventos do FullCalendar
    const obterCor = (estado) => {
        switch (estado) {
            case 'agendada':
                return '#3498db';
            case 'realizada':
                return '#2ecc71';
            case 'cancelada':
                return '#e74c3c';
            case 'faltou':
                return '#95a5a6';
            default:
                return '#34495e';
        }
    };

    const events = consultas
        .filter(c => salas.find(s => s.id === c.sala_id))
        .map(consulta => ({
            id: `consulta-${consulta.id}`,
            title: `${consulta.utente?.nome || 'Paciente'} - ${consulta.terapeuta?.user?.nome || 'N/A'}`,
            start: consulta.data_inicio,
            end: consulta.data_fim,
            resourceId: `sala-${consulta.sala_id}`,
            extendedProps: {
                consultaId: consulta.id
            },
            backgroundColor: obterCor(consulta.estado),
            borderColor: obterCor(consulta.estado)
        }));

    const handleEventClick = (info) => {
        const consultaId = info.event.extendedProps.consultaId;
        if (consultaId) {
            navigate(`/consultas/${consultaId}/editar`);
        }
    };

    if (loading) {
        return <div className="page centered">A carregar salas...</div>;
    }

    if (error) {
        return (
            <div className="page centered">
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary">
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="salas-calendario-page">
            <div className="page-header">
                <div>
                    <h1>🏥 Salas - Calendário</h1>
                    <p>Vista das consultas agendadas por sala</p>
                </div>
            </div>

            <div className="salas-calendario-container">
                {resources.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhuma sala disponível</p>
                    </div>
                ) : (
                    <FullCalendar
                        plugins={[resourceTimelinePlugin]}
                        initialView="resourceTimelineWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
                        }}
                        resources={resources}
                        events={events}
                        eventClick={handleEventClick}
                        height="auto"
                        contentHeight="auto"
                        slotLabelInterval={{ minutes: 60 }}
                    />
                )}
            </div>
        </div>
    );
}
