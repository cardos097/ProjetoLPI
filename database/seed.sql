-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

---------------------------------------------------------
-- ÁREAS CLÍNICAS
---------------------------------------------------------
INSERT INTO areas_clinicas (nome) VALUES
('Psicologia'),
('Nutrição'),
('Fisioterapia'),
('Terapia da Fala');

---------------------------------------------------------
-- USERS
---------------------------------------------------------
INSERT INTO users (nome, email, password_hash, role) VALUES
('Admin Sistema', 'admin@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'admin'),
('Dr João Silva', 'joao@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'terapeuta'),
('Dra Ana Pereira', 'ana@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'terapeuta'),
('Maria Costa', 'maria@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'utente'),
('Carlos Santos', 'carlos@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'utente'),
('Receção', 'rececao@clinica.pt', '$2a$10$nUhJszIJcT/86cu5seIaO.CIKL5JSnwBwbehyQxPost2vU51YOfjW', 'administrativo'),
('Professor Teste', 'professor@ufp.edu.pt', '$2a$10$4VzXeJf1.wycd5nQiOybX.CrH8jeno6QQ7.SqCiZBbB8GkggJ9IFW', 'terapeuta'),
('Aluno Teste 1', '0001@ufp.edu.pt', '$2a$10$4VzXeJf1.wycd5nQiOybX.CrH8jeno6QQ7.SqCiZBbB8GkggJ9IFW', 'terapeuta'),
('Aluno Teste 2', '0002@ufp.edu.pt', '$2a$10$4VzXeJf1.wycd5nQiOybX.CrH8jeno6QQ7.SqCiZBbB8GkggJ9IFW', 'terapeuta'),
('Aluno Teste 3', '0003@ufp.edu.pt', '$2a$10$4VzXeJf1.wycd5nQiOybX.CrH8jeno6QQ7.SqCiZBbB8GkggJ9IFW', 'terapeuta'),
('Professor 1', 'professor1@ufp.edu.pt', '$2b$10$U2j9fXeaUu3F303iXwLDMeHJewhI/SQnL/v1BRiXl.cUYqWHUnnoO', 'terapeuta'),
('Professor Fisioterapia', 'professorfisio@ufp.edu.pt', '$2a$10$4VzXeJf1.wycd5nQiOybX.CrH8jeno6QQ7.SqCiZBbB8GkggJ9IFW', 'terapeuta');

---------------------------------------------------------
-- TERAPEUTAS
---------------------------------------------------------
INSERT INTO terapeutas (user_id, tipo, area_clinica_id, numero_mecanografico) VALUES
(2, 'professor', 1, 'T001'),
(3, 'professor', 4, 'T002'),
(7, 'professor', 1, 'T003'),
(8, 'aluno', 1, NULL),
(9, 'aluno', 1, NULL),
(10, 'aluno', 1, NULL),
(11, 'professor', 1, 'T004'),
(12, 'professor', 3, 'T-FISIO-001');

---------------------------------------------------------
-- UTENTES
---------------------------------------------------------
INSERT INTO utentes (user_id, numero_processo, telefone, morada) VALUES
(4, 'PROC001', '912345678', 'Rua A, Porto'),
(5, 'PROC002', '934567890', 'Rua B, Porto');

---------------------------------------------------------
-- PROCESSOS CLÍNICOS
---------------------------------------------------------
INSERT INTO processos_clinicos (utente_id) VALUES
(4),
(5);

---------------------------------------------------------
-- SALAS
---------------------------------------------------------
INSERT INTO salas (nome, descricao) VALUES
('Psicologia', 'Sala de psicologia'),
('Castanha', 'Sala castanha'),
('Laranja', 'Sala laranja'),
('Vermelha', 'Sala vermelha'),
('Rosa', 'Sala rosa'),
('Azul', 'Sala azul'),
('Branca', 'Sala branca'),
('Amarela', 'Sala amarela'),
('TP Grupo', 'Sala de terapia em grupo'),
('Reuniões', 'Sala de reuniões'),
('Fisio 1', 'Sala exclusiva de fisioterapia 1'),
('Fisio 2', 'Sala exclusiva de fisioterapia 2'),
('Fisio 3', 'Sala exclusiva de fisioterapia 3'),
('Fisio 4', 'Sala exclusiva de fisioterapia 4'),
('Fisio 5', 'Sala exclusiva de fisioterapia 5'),
('Fisio 6', 'Sala exclusiva de fisioterapia 6'),
('Fisio 7', 'Sala exclusiva de fisioterapia 7'),
('Fisio 8', 'Sala exclusiva de fisioterapia 8'),
('Fisio 9', 'Sala exclusiva de fisioterapia 9'),
('Fisio 10', 'Sala exclusiva de fisioterapia 10'),
('Fisio 11', 'Sala exclusiva de fisioterapia 11'),
('Fisio 12', 'Sala exclusiva de fisioterapia 12'),
('Fisio 13', 'Sala exclusiva de fisioterapia 13'),
('Fisio 14', 'Sala exclusiva de fisioterapia 14'),
('Fisio 15', 'Sala exclusiva de fisioterapia 15'),
('Fisio 16', 'Sala exclusiva de fisioterapia 16'),
('Fisio 17', 'Sala exclusiva de fisioterapia 17'),
('Fisio 18', 'Sala exclusiva de fisioterapia 18');

---------------------------------------------------------
-- SALA - ÁREA CLÍNICA (Associações)
---------------------------------------------------------
-- Todas as salas estão disponíveis para: Psicologia (1), Nutrição (2) e Terapia da Fala (4)
-- NÃO para Fisioterapia (3)
INSERT INTO sala_area_clinica (sala_id, area_clinica_id) VALUES
-- Sala Psicologia (1)
(1, 1), (1, 2), (1, 4),
-- Sala Castanha (2)
(2, 1), (2, 2), (2, 4),
-- Sala Laranja (3)
(3, 1), (3, 2), (3, 4),
-- Sala Vermelha (4)
(4, 1), (4, 2), (4, 4),
-- Sala Rosa (5)
(5, 1), (5, 2), (5, 4),
-- Sala Azul (6)
(6, 1), (6, 2), (6, 4),
-- Sala Branca (7)
(7, 1), (7, 2), (7, 4),
-- Sala Amarela (8)
(8, 1), (8, 2), (8, 4),
-- Sala TP Grupo (9)
(9, 1), (9, 2), (9, 4),
-- Sala Reuniões (10)
(10, 1), (10, 2), (10, 4),
-- Salas exclusivas Fisioterapia (11-28)
(11, 3),
(12, 3),
(13, 3),
(14, 3),
(15, 3),
(16, 3),
(17, 3),
(18, 3),
(19, 3),
(20, 3),
(21, 3),
(22, 3),
(23, 3),
(24, 3),
(25, 3),
(26, 3),
(27, 3),
(28, 3);

---------------------------------------------------------
-- CONSULTAS
---------------------------------------------------------
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
(5, 3, 2, 4, '2026-03-25 11:00', '2026-03-25 12:00', 'agendada', 6),
(4, 2, 3, 1, '2026-04-21 09:00', '2026-04-21 10:00', 'agendada', 6),
(5, 3, 4, 4, '2026-04-22 14:00', '2026-04-22 15:00', 'agendada', 6),
(4, 2, 5, 1, '2026-04-23 16:00', '2026-04-23 17:00', 'realizada', 6),
-- Consultas de Fisioterapia (Professor Fisioterapia)
(4, 12, 11, 3, '2026-04-24 10:00', '2026-04-24 11:00', 'agendada', 6),
(4, 12, 12, 3, '2026-04-25 10:00', '2026-04-25 11:00', 'agendada', 6),
(4, 12, 13, 3, '2026-04-26 10:00', '2026-04-26 11:00', 'agendada', 6),
-- Consultas de teste para 27/04/2026 (várias salas e áreas)
-- Psicologia — Dr João Silva
(4, 2,  1, 1, '2026-04-27 09:00', '2026-04-27 10:00', 'agendada',  6),
(5, 2,  4, 1, '2026-04-27 14:00', '2026-04-27 15:00', 'agendada',  6),
-- Psicologia — Professor Teste
(5, 7,  2, 1, '2026-04-27 10:00', '2026-04-27 11:00', 'agendada',  6),
-- Psicologia — Aluno Teste 1
(4, 8,  3, 1, '2026-04-27 11:00', '2026-04-27 12:00', 'realizada', 6),
-- Psicologia — Aluno Teste 2
(5, 9,  5, 1, '2026-04-27 15:00', '2026-04-27 16:00', 'agendada',  6),
-- Psicologia — Professor 1
(4, 11, 6, 1, '2026-04-27 16:00', '2026-04-27 17:00', 'cancelada', 6),
-- Terapia da Fala — Dra Ana Pereira
(5, 3,  7, 4, '2026-04-27 09:00', '2026-04-27 10:00', 'agendada',  6),
(4, 3,  8, 4, '2026-04-27 11:00', '2026-04-27 12:00', 'faltou',    6),
-- Fisioterapia — Professor Fisioterapia
(4, 12, 11, 3, '2026-04-27 09:00', '2026-04-27 10:00', 'agendada',  6),
(5, 12, 12, 3, '2026-04-27 10:00', '2026-04-27 11:00', 'agendada',  6),
(4, 12, 13, 3, '2026-04-27 11:00', '2026-04-27 12:00', 'realizada', 6),
(5, 12, 14, 3, '2026-04-27 14:00', '2026-04-27 15:00', 'agendada',  6);

---------------------------------------------------------
-- REGISTOS CLÍNICOS
---------------------------------------------------------
INSERT INTO registos_clinicos (
  processo_id,
  consulta_id,
  area_clinica_id,
  conteudo,
  created_by
) VALUES
(1, 1, 1, 'Paciente apresenta sinais de ansiedade. Iniciado acompanhamento.', 2);

---------------------------------------------------------
-- 🔵 NOVOS SEEDS — FICHAS DE AVALIAÇÃO
---------------------------------------------------------

INSERT INTO fichas_avaliacao (
  utente_id,
  consulta_id,
  nome_completo,
  numero_processo,
  data_nascimento,
  idade,
  sexo,
  peso_kg,
  altura_m,
  imc,
  diagnostico_queixa_principal,
  tipo_registo,
  diagnostico_fisioterapia,
  objetivos_prognostico,
  plano_terapeutico,
  plano_progressao,
  historia_pessoal,
  perspetivas,
  limitacoes,
  mcd,
  historia_condicao,
  medicacao,
  hist_med_atual,
  hist_med_anterior,
  hist_med_familiar,
  sinss,
  created_by
) VALUES
(
  4,
  1,
  'Maria Costa',
  'PROC001',
  '2000-01-01',
  26,
  'F',
  64.00,
  1.65,
  23.51,
  'Lombalgia mecânica com queixa principal de dor na região lombar',
  'grupo',
  'Disfunção lombopélvica mecânica com défice de controlo motor e tolerância ao esforço reduzida.',
  'Reduzir dor em 50% em 4 semanas e aumentar tolerância à marcha para 30 minutos contínuos.',
  'Exercício terapêutico progressivo, educação postural e treino de estabilidade lombo-pélvica 2x/semana.',
  'Progressão para treino funcional e retorno gradual às atividades laborais sem agravamento da dor.',
  'Vive com os pais, trabalha em part-time.',
  'Melhorar mobilidade e reduzir dor lombar.',
  'Dificuldade em caminhar longas distâncias.',
  'RX lombar realizado em 2025.',
  'Dor lombar há 3 meses após levantar peso.',
  'Ibuprofeno 400mg quando necessário.',
  'Episódios de dor recorrente.',
  'Sem cirurgias prévias.',
  'História familiar de problemas articulares.',
  'Moderada severidade, irritabilidade baixa, estágio subagudo.',
  2
),
(
  5,
  2,
  'Carlos Santos',
  'PROC002',
  '1998-05-12',
  27,
  'M',
  70.00,
  1.80,
  21.60,
  'Lombalgia com irradiação para membro inferior direito',
  'individual',
  'Síndrome dolorosa lombar com compromisso funcional articular e muscular, sem défice neurológico grave.',
  'Melhorar função global, reduzir incapacidade no EQ5D e retomar rotina de trabalho em 6 semanas.',
  'Plano individual de mobilidade, fortalecimento, treino cardiorrespiratório e estratégias de autogestão.',
  'Aumentar carga e complexidade funcional semanalmente conforme resposta clínica.',
  'Paciente vive com companheira e refere limitação nas tarefas domésticas.',
  'Voltar ao trabalho sem dor incapacitante e retomar atividade física leve.',
  'Dor ao permanecer sentado por períodos prolongados e ao levantar cargas.',
  'RM lombar com protrusão discal L4-L5.',
  'Episódio atual após esforço físico intenso no trabalho.',
  'Paracetamol SOS e relaxante muscular noturno.',
  'Sem comorbilidades relevantes no momento.',
  'Sem cirurgias prévias e sem internamentos recentes.',
  'Pai com historial de lombalgia crónica.',
  'Severidade moderada, irritabilidade média, natureza mecânica, estágio subagudo, estabilidade variável.',
  3
);

---------------------------------------------------------
-- 🔵 NOVOS SEEDS — AVALIAÇÕES OBJETIVAS
---------------------------------------------------------

INSERT INTO avaliacoes_objetivas (
  ficha_id,
  tipo_teste,
  valor,
  data,
  reavaliacao_valor,
  reavaliacao_data
) VALUES
(1, 'FC repouso + Tensão Arterial', '78 bpm / 120-80 mmHg', '2026-03-25', '75 bpm / 118-78 mmHg', '2026-04-10'),
(1, '2 min. step test', '85 passos', '2026-03-25', '96 passos', '2026-04-10'),
(1, 'Sentar Levantar 5x', '13.2s', '2026-03-25', '11.6s', '2026-04-10'),
(1, 'TUG', '9.2s', '2026-03-25', '8.4s', '2026-04-10'),
(1, 'Arm Curl Test', '14 repetições', '2026-03-25', '17 repetições', '2026-04-10'),
(1, 'Hand grip', '24.5 kg', '2026-03-25', '27.3 kg', '2026-04-10'),
(1, 'EQ5DL', 'Índice 0.62', '2026-03-25', 'Índice 0.78', '2026-04-10'),
(2, 'Observação', 'Postura antálgica e proteção da região lombar em ortostatismo.', '2026-03-18', 'Postura mais alinhada, menor proteção antálgica.', '2026-04-01'),
(2, 'Função Articular', 'Limitação moderada da flexão lombar e rotação direita.', '2026-03-18', 'Amplitude funcional melhorada, dor residual leve.', '2026-04-01'),
(2, 'Função Muscular', 'Fraqueza de extensores lombares e glúteo médio direito.', '2026-03-18', 'Ganho de força e melhor controlo de tronco.', '2026-04-01'),
(2, 'Função Neurológica', 'Sem défice motor importante; parestesias ocasionais.', '2026-03-18', 'Sem parestesias nas últimas 2 semanas.', '2026-04-01'),
(2, 'Função Cardiovascular', 'Capacidade cardiorrespiratória abaixo do esperado para a idade.', '2026-03-18', 'Melhoria da tolerância ao esforço submáximo.', '2026-04-01'),
(2, 'Função Respiratória', 'Padrão respiratório torácico superior em esforço.', '2026-03-18', 'Melhor coordenação respiratória durante exercício.', '2026-04-01'),
(2, 'Testes especiais / de campo', 'Teste funcional de agachamento limitado por dor lombar.', '2026-03-18', 'Agachamento parcial sem dor limitante.', '2026-04-01'),
(2, 'Palpação', 'Hipertonia paravertebral lombar bilateral e dor à palpação em L4-L5.', '2026-03-18', 'Redução de hipertonia e dor à palpação localizada.', '2026-04-01'),
(2, 'Escalas / Questionários', 'EQ5D com impacto moderado na mobilidade e atividade habitual.', '2026-03-18', 'EQ5D com melhoria global dos domínios funcionais.', '2026-04-01'),
(2, 'Diversos', 'Adesão ao plano domiciliário irregular na primeira semana.', '2026-03-18', 'Adesão consistente ao plano domiciliário.', '2026-04-01');

---------------------------------------------------------
-- 🔵 NOVOS SEEDS — ASSIDUIDADE
---------------------------------------------------------

INSERT INTO assiduidade (
  utente_id,
  data,
  estado,
  observacao,
  created_by
) VALUES
(4, '2026-03-01', 'P', NULL, 6),
(4, '2026-03-02', 'A', 'Avaliação inicial', 6),
(4, '2026-03-03', 'FI', 'Falta injustificada', 6),
(4, '2026-03-04', 'P', NULL, 6),
(5, '2026-03-01', 'P', NULL, 6),
(5, '2026-03-02', 'FJ', 'Doença', 6);
