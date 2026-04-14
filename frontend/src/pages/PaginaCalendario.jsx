import { useEffect, useState } from 'react';
import { getConsultas } from '../services/consultas.jsx';
import { CalendarioVisualizacao } from '../components/CalendarioVisualizacao.jsx';
import { ModalAgendarConsulta } from '../components/ModalAgendarConsulta.jsx';
import { useNavigate } from 'react-router-dom';
import '../styles/calendario.css';

export function PaginaCalendario() {
    const navigate = useNavigate();
    const [consultas, setConsultas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [dataSelecionada, setDataSelecionada] = useState(null);

    // Carregar consultas
    useEffect(() => {
        const fetchConsultas = async () => {
            try {
                setError('');
                const data = await getConsultas();
                setConsultas(data || []);
            } catch (err) {
                console.error('Erro ao carregar consultas:', err);
                setError('Erro ao carregar consultas');
            } finally {
                setLoading(false);
            }
        };

        fetchConsultas();
    }, []);

    const handleDateClick = (dateStr) => {
        console.log('Modal should open for date:', dateStr);
        setDataSelecionada(dateStr);
        setModalOpen(true);
        console.log('Modal state updated. modalOpen should be true now');
    };

    const handleModalSubmit = (formData) => {
        navigate('/consultas/nova', {
            state: {
                dataInicio: formData.data_inicio,
                tipo: formData.tipo,
            },
        });
        setModalOpen(false);
    };

    const handleEventClick = (consultaId, consultaData) => {
        navigate(`/consultas/${consultaId}/editar`);
    };

    if (loading) {
        return <div className="page centered">A carregar calendário...</div>;
    }

    return (
        <div className="page calendario-page">
            <div className="page-header">
                <div>
                    <h1>📅 Calendário de Consultas</h1>
                    <p>Visualiza e agenda as tuas consultas</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/consultas/nova')}
                >
                    + Nova Consulta
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="calendario-full">
                <CalendarioVisualizacao
                    consultas={consultas}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                    mode="month"
                />
            </div>

            <ModalAgendarConsulta
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setDataSelecionada(null);
                }}
                onSubmit={handleModalSubmit}
                dataSelecionada={dataSelecionada}
            />
        </div>
    );
}
