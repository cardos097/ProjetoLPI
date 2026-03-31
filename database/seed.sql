-- ÁREAS CLÍNICAS
INSERT INTO areas_clinicas (nome) VALUES
('Psicologia'),
('Nutrição'),
('Fisioterapia'),
('Terapia da Fala');

-- USERS
INSERT INTO users (nome, email, password_hash, role) VALUES
('Admin Sistema', 'admin@clinica.pt', '123', 'admin'),
('Dr João Silva', 'joao@clinica.pt', '123', 'terapeuta'),
('Dra Ana Pereira', 'ana@clinica.pt', '123', 'terapeuta'),
('Maria Costa', 'maria@clinica.pt', '123', 'utente'),
('Carlos Santos', 'carlos@clinica.pt', '123', 'utente'),
('Receção', 'rececao@clinica.pt', '123', 'administrativo');

-- TERAPEUTAS
-- João → Psicologia (id = 1)
-- Ana → Terapia da Fala (id = 4)
INSERT INTO terapeutas (user_id, tipo, area_clinica_id, numero_mecanografico) VALUES
(2, 'professor', 1, 'T001'),
(3, 'professor', 4, 'T002');

-- UTENTES
INSERT INTO utentes (user_id, numero_processo, telefone, morada) VALUES
(4, 'PROC001', '912345678', 'Rua A, Porto'),
(5, 'PROC002', '934567890', 'Rua B, Porto');

-- PROCESSOS CLÍNICOS
INSERT INTO processos_clinicos (utente_id) VALUES
(4),
(5);

-- SALAS
INSERT INTO salas (nome, descricao) VALUES
('Sala 1', 'Consulta geral'),
('Sala 2', 'Consulta especializada'),
('Sala 3', 'Avaliações');

-- CONSULTAS
-- Consulta 1 (Maria - Psicologia)
-- Consulta 2 (Carlos - Terapia da Fala)
INSERT INTO consultas (
  utente_id,
  terapeuta_id,
  sala_id,
  area_clinica_id,
  data_inicio,
  data_fim,
  estado,
  created_by
) VALUES
(4, 2, 1, 1, '2026-03-25 10:00', '2026-03-25 11:00', 'realizada', 6),
(5, 3, 2, 4, '2026-03-25 11:00', '2026-03-25 12:00', 'agendada', 6);

-- REGISTOS CLÍNICOS
INSERT INTO registos_clinicos (
  processo_id,
  consulta_id,
  area_clinica_id,
  conteudo,
  created_by
) VALUES
(1, 1, 1, 'Paciente apresenta sinais de ansiedade. Iniciado acompanhamento.', 2);