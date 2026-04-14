import { useState, useEffect } from 'react';
import '../styles/modal.css';

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
    });

    useEffect(() => {
        if (dataSelecionada) {
            setFormData((prev) => ({
                ...prev,
                data: dataSelecionada,
            }));
        }
    }, [dataSelecionada]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.data || !formData.hora) {
            alert('Preenche a data e a hora');
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

                    <p className="modal-info">
                        ℹ️ Serás redirecionado para o formulário completo para selecionar terapeuta e sala.
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
