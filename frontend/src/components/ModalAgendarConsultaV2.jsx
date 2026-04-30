import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/modal.css';
import { getAreasClinicas, getSalas, getTerapeutas, getTerapeutasByArea, getUtentes, checkDisponibilidade } from '../services/consultas';

export function ModalAgendarConsultaV2({
    isOpen,
    onClose,
    onSubmit,
    dataSelecionada = null,
    loading = false
}) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        data: dataSelecionada || '',
        hora: '09:00',
        tipo: 'consulta_geral',
        area_clinica_id: '',
        sala_id: '',
        terapeuta_id: '',
        utente_id: '',
    });

    const [areasClinicas, setAreasClinicas] = useState([]);
    const [salas, setSalas] = useState([]);
    const [salasFilterradas, setSalasFilterradas] = useState([]);
    const [terapeutas, setTerapeutas] = useState([]);
    const [terapeutasFiltrados, setTerapeutasFiltrados] = useState([]);
    const [utentes, setUtentes] = useState([]);
    const [salasIndisponiveis, setSalasIndisponiveis] = useState([]);
    const [terapeutasIndisponiveis, setTerapeutasIndisponiveis] = useState([]);

    useEffect(() => {
        if (isOpen) {
            carregarDados();
            if (user?.role === 'terapeuta') {
                setFormData((prev) => ({
                    ...prev,
                    terapeuta_id: String(user.id),
                }));
            }
        }
    }, [isOpen]);

    const carregarDados = async () => {
        try {
            const areas = await getAreasClinicas();
            const salasList = await getSalas();
            const terapeutasList = await getTerapeutas();
            const utentesList = await getUtentes();
            setAreasClinicas(areas);
            setSalas(salasList);
            setTerapeutas(terapeutasList);
            setUtentes(utentesList);
        } catch (erro) {
            console.error('Erro ao carregar dados:', erro);
        }
    };

    useEffect(() => {
        if (dataSelecionada) {
            setFormData((prev) => ({
                ...prev,
                data: dataSelecionada,
            }));
        }
    }, [dataSelecionada]);

    useEffect(() => {
        // Verificar disponibilidade quando data ou hora mudam
        if (formData.data && formData.hora) {
            const verificarDisponibilidade = async () => {
                try {
                    // Calcular data_fim (1 hora depois)
                    const [horaStr, minStr] = formData.hora.split(':');
                    let horaFim = parseInt(horaStr) + 1;
                    const minFim = parseInt(minStr);
                    if (horaFim > 23) horaFim = 0;

                    const dataInicio = `${formData.data} ${formData.hora}:00`;
                    const dataFim = `${formData.data} ${String(horaFim).padStart(2, '0')}:${String(minFim).padStart(2, '0')}:00`;

                    const resultado = await checkDisponibilidade(dataInicio, dataFim);
                    console.log('📊 Resultado disponibilidade:', resultado);
                    console.log('🚫 Salas indisponíveis (backend):', resultado.salas_indisponiveis);
                    console.log('🚫 Terapeutas indisponíveis (backend):', resultado.terapeutas_indisponiveis);
                    setSalasIndisponiveis(resultado.salas_indisponiveis || []);
                    setTerapeutasIndisponiveis(resultado.terapeutas_indisponiveis || []);
                } catch (erro) {
                    console.error('Erro ao verificar disponibilidade:', erro);
                    setSalasIndisponiveis([]);
                    setTerapeutasIndisponiveis([]);
                }
            };
            verificarDisponibilidade();
        }
    }, [formData.data, formData.hora]);

    // Efeito para filtrar salas quando area_clinica_id muda (apenas carrega salas da área)
    useEffect(() => {
        if (formData.area_clinica_id) {
            const salasDisponiveis = salas.filter((sala) => {
                // Filtrar por área clínica
                if (sala.areas_clinicas && sala.areas_clinicas.length > 0) {
                    return sala.areas_clinicas.some(
                        (area) => area.id === parseInt(formData.area_clinica_id)
                    );
                }
                return true;
            });
            setSalasFilterradas(salasDisponiveis);
            setFormData((prev) => ({
                ...prev,
                sala_id: '',
                terapeuta_id: user?.role === 'terapeuta' ? prev.terapeuta_id : '',
            }));
        } else {
            setSalasFilterradas([]);
        }
    }, [formData.area_clinica_id, salas]);

    // Efeito separado para remover salas indisponíveis (sem resetar seleção)
    useEffect(() => {
        if (formData.area_clinica_id && salasIndisponiveis.length > 0) {
            console.log('📌 Reaplicando filtro de indisponibilidade. Salas indisponiveis:', salasIndisponiveis);
            console.log('📌 Total de salas na lista inicial:', salas.length);
            console.log('📌 Salas na lista inicial:', salas.map(s => ({ id: s.id, nome: s.nome })));

            const salasDisponiveis = salas.filter((sala) => {
                // Filtrar por área clínica
                if (sala.areas_clinicas && sala.areas_clinicas.length > 0) {
                    const temArea = sala.areas_clinicas.some(
                        (area) => area.id === parseInt(formData.area_clinica_id)
                    );
                    if (!temArea) {
                        console.log(`❌ Sala ${sala.id} (${sala.nome}) não tem a área clínica - REMOVENDO`);
                        return false;
                    }
                }
                // Filtrar salas que não têm consultas no horário
                const salaId = typeof sala.id === 'string' ? parseInt(sala.id) : sala.id;
                const indisponivel = salasIndisponiveis.some(id => {
                    const indisponivelId = typeof id === 'string' ? parseInt(id) : id;
                    const resultado = salaId === indisponivelId;
                    console.log(`   Comparando sala ${salaId} com indisponível ${indisponivelId}: ${resultado}`);
                    return resultado;
                });

                if (indisponivel) {
                    console.log(`🚫 Sala ${salaId} (${sala.nome}) indisponível - REMOVENDO`);
                    return false;
                } else {
                    console.log(`✅ Sala ${salaId} (${sala.nome}) disponível - MANTENDO`);
                    return true;
                }
            });
            console.log('✅ Salas disponíveis após remover indisponíveis:', salasDisponiveis.map(s => ({ id: s.id, nome: s.nome })));
            setSalasFilterradas(salasDisponiveis);
        }
    }, [salasIndisponiveis, formData.area_clinica_id, salas]);

    useEffect(() => {
        if (formData.area_clinica_id) {
            // Carregar terapeutas apenas da área selecionada (apenas professores)
            const carregarTerapeutasArea = async () => {
                try {
                    const terapeutasArea = await getTerapeutasByArea(formData.area_clinica_id);
                    // Filtrar terapeutas que não têm consultas no horário
                    const terapeutasDisponiveis = terapeutasArea.filter((terapeuta) => {
                        // Garantir que ambos são números para comparação
                        const terapeutaId = typeof terapeuta.user_id === 'string' ? parseInt(terapeuta.user_id) : terapeuta.user_id;
                        const indisponivel = terapeutasIndisponiveis.some(id => {
                            const indisponivelId = typeof id === 'string' ? parseInt(id) : id;
                            return terapeutaId === indisponivelId;
                        });
                        return !indisponivel;
                    });
                    console.log('✅ Terapeutas disponíveis após filtro:', terapeutasDisponiveis);
                    setTerapeutasFiltrados(terapeutasDisponiveis);
                } catch (erro) {
                    console.error('Erro ao carregar terapeutas da área:', erro);
                    setTerapeutasFiltrados([]);
                }
            };
            carregarTerapeutasArea();
        } else {
            setTerapeutasFiltrados([]);
        }
    }, [formData.area_clinica_id, terapeutasIndisponiveis]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Se é utente, usar o seu ID
        const utenteId = user?.role === 'utente' ? user?.id : formData.utente_id;

        if (!formData.data || !formData.hora || !formData.area_clinica_id || !formData.sala_id || !formData.terapeuta_id || !utenteId) {
            alert('Preenche todos os campos obrigatórios');
            return;
        }

        if (new Date(`${formData.data}T${formData.hora}:00`) <= new Date()) {
            alert('Não é possível marcar consultas no passado. Escolhe uma data e hora futuras.');
            return;
        }

        // Converter formato de data e hora para o esperado pelo backend
        // Backend espera: "2024-12-01 09:00:00" (com espaço, não T)
        const dataInicio = `${formData.data} ${formData.hora}:00`;

        // Calcular data_fim (1 hora depois do inicio)
        const [horaStr, minStr] = formData.hora.split(':');
        let horaFim = parseInt(horaStr);
        let minFim = parseInt(minStr);
        horaFim += 1; // Adiciona 1 hora
        if (horaFim > 23) horaFim = 0;
        const dataFim = `${formData.data} ${String(horaFim).padStart(2, '0')}:${String(minFim).padStart(2, '0')}:00`;

        onSubmit({
            ...formData,
            utente_id: utenteId,
            data_inicio: dataInicio,
            data_fim: dataFim,
        });

        setFormData({
            data: '',
            hora: '09:00',
            tipo: 'consulta_geral',
            area_clinica_id: '',
            sala_id: '',
            terapeuta_id: user?.role === 'terapeuta' ? String(user.id) : '',
            utente_id: '',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Agendar Consulta</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="data">Data *</label>
                        <input
                            type="date"
                            id="data"
                            name="data"
                            value={formData.data}
                            onChange={handleChange}
                            required
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="hora">Hora *</label>
                        <input
                            type="time"
                            id="hora"
                            name="hora"
                            value={formData.hora}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {(user?.role === 'administrativo' || user?.role === 'terapeuta') && (
                        <div className="form-group">
                            <label htmlFor="utente_id">Utente/Paciente *</label>
                            <select
                                id="utente_id"
                                name="utente_id"
                                value={formData.utente_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Seleciona um utente</option>
                                {utentes.map((utente) => (
                                    <option key={utente.id} value={utente.id}>
                                        {utente.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}                    <div className="form-group">
                        <label htmlFor="tipo">Tipo de Consulta</label>
                        <select
                            id="tipo"
                            name="tipo"
                            value={formData.tipo}
                            onChange={handleChange}
                        >
                            <option value="consulta_geral">Consulta Geral</option>
                            <option value="consulta_especializada">Consulta Especializada</option>
                            <option value="seguimento">Seguimento</option>
                            <option value="avaliacao">Avaliação</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="area_clinica_id">Área Clínica *</label>
                        <select
                            id="area_clinica_id"
                            name="area_clinica_id"
                            value={formData.area_clinica_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Seleciona uma área clínica</option>
                            {areasClinicas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="terapeuta_id">Terapeuta *</label>
                        <select
                            id="terapeuta_id"
                            name="terapeuta_id"
                            value={formData.terapeuta_id}
                            onChange={handleChange}
                            required
                            disabled={!formData.area_clinica_id}
                        >
                            <option value="">
                                {formData.area_clinica_id ? 'Seleciona um terapeuta' : 'Seleciona primeiro uma área clínica'}
                            </option>
                            {terapeutasFiltrados.map((terapeuta) => (
                                <option key={terapeuta.user_id} value={terapeuta.user_id}>
                                    {terapeuta.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="sala_id">Sala *</label>
                        <select
                            id="sala_id"
                            name="sala_id"
                            value={formData.sala_id}
                            onChange={handleChange}
                            required
                            disabled={!formData.area_clinica_id}
                        >
                            <option value="">
                                {formData.area_clinica_id ? 'Seleciona uma sala' : 'Seleciona primeiro uma área clínica'}
                            </option>
                            {salasFilterradas.map((sala) => (
                                <option key={sala.id} value={sala.id}>
                                    {sala.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-buttons">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'A processar...' : 'Agendar Consulta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
