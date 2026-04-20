import { useState, useEffect } from 'react';
import '../styles/modal.css';
import { getAreasClinicas, getSalas } from '../services/consultas';

export function ModalAgendarConsulta({
    isOpen,
    onClose,
    onSubmit,
    dataSelecionada = null,
    loading = false
}) {
    const [formData, setFormData] = useState({
        data: dataSelecionada || '',
        hora: '09:00',
        tipo: 'consulta_geral',
        area_clinica_id: '',
        sala_id: '',
    });

    const [areasClinicas, setAreasClinicas] = useState([]);
    const [salas, setSalas] = useState([]);
    const [salasFilteradas, setSalasFilteradas] = useState([]);

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

    useEffect(() => {
        if (isOpen) {
            carregarDados();
        }
    }, [isOpen]);

    const carregarDados = async () => {
        try {
            const areas = await getAreasClinicas();
            const salasList = await getSalas();
            setAreasClinicas(areas);
            setSalas(salasList);
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
        if (formData.area_clinica_id) {
            const salasDisponiveis = salas.filter((sala) => {
                // Se a sala tem associações com áreas clínicas
                if (sala.areas_clinicas && sala.areas_clinicas.length > 0) {
                    return sala.areas_clinicas.some(
                        (area) => area.id === parseInt(formData.area_clinica_id)
                    );
                }
                // Fallback: mostrar todas as salas se não houver filtro
                return true;
            });
            setSalasFilteradas(dedupeSalasByNome(salasDisponiveis));
            setFormData((prev) => ({
                ...prev,
                sala_id: '',
            }));
        } else {
            setSalasFilteradas([]);
        }
    }, [formData.area_clinica_id, salas]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.data || !formData.hora || !formData.area_clinica_id || !formData.sala_id) {
            alert('Preenche todos os campos obrigatórios (Data, Hora, Área Clínica e Sala)');
            return;
        }

        onSubmit({
            ...formData,
            data_inicio: `${formData.data}T${formData.hora}:00`,
        });

        // Reset
        setFormData({
            data: '',
            hora: '09:00',
            tipo: 'consulta_geral',
            area_clinica_id: '',
            sala_id: '',
        });
    };

    if (!isOpen) return null;

    console.log('ModalAgendarConsulta rendering with isOpen=true, dataSelecionada=', dataSelecionada);

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

                    <div className="form-group">
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
                            {salasFilteradas.map((sala) => (
                                <option key={sala.id} value={sala.id}>
                                    {sala.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="modal-info">
                        ℹ️ Serás redirecionado para o formulário completo para selecionar terapeuta.
                    </p>

                    <div className="modal-buttons">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'A processar...' : 'Próximo Passo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
