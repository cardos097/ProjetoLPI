CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM (
  'admin',
  'terapeuta',
  'administrativo',
  'utente'
);

CREATE TYPE terapeuta_tipo AS ENUM (
  'aluno',
  'professor'
);

CREATE TYPE consulta_estado AS ENUM (
  'agendada',
  'cancelada',
  'realizada',
  'faltou_injustificada',
  'faltou_justificada'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT,
  role user_role NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  google_sub VARCHAR(255) UNIQUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE areas_clinicas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  ativa BOOLEAN DEFAULT TRUE
);

CREATE TABLE terapeutas (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tipo terapeuta_tipo NOT NULL,
  area_clinica_id INTEGER REFERENCES areas_clinicas(id),
  numero_mecanografico VARCHAR(50) UNIQUE,
  supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_terapeutas_area ON terapeutas(area_clinica_id);
CREATE INDEX idx_terapeutas_supervisor ON terapeutas(supervisor_id);

CREATE TABLE utentes (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data_nascimento DATE,
  nif BYTEA,
  telefone VARCHAR(20),
  morada TEXT,
  numero_processo VARCHAR(50) UNIQUE,
  foto_url TEXT
);

CREATE INDEX idx_utentes_processo ON utentes(numero_processo);

CREATE TABLE salas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativa BOOLEAN DEFAULT TRUE
);

CREATE TABLE sala_area_clinica (
  sala_id INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  area_clinica_id INTEGER NOT NULL REFERENCES areas_clinicas(id) ON DELETE CASCADE,
  PRIMARY KEY (sala_id, area_clinica_id)
);

CREATE INDEX idx_sala_area ON sala_area_clinica(area_clinica_id);

CREATE TABLE processos_clinicos (
  id SERIAL PRIMARY KEY,
  utente_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terapeuta_responsavel_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_processos_utente ON processos_clinicos(utente_id);

CREATE TABLE consultas (
  id SERIAL PRIMARY KEY,
  utente_id INTEGER NOT NULL REFERENCES users(id),
  terapeuta_id INTEGER NOT NULL REFERENCES users(id),
  sala_id INTEGER NOT NULL REFERENCES salas(id),
  area_clinica_id INTEGER NOT NULL REFERENCES areas_clinicas(id),
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP NOT NULL,
  estado consulta_estado NOT NULL DEFAULT 'agendada',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (data_fim > data_inicio)
);

CREATE INDEX idx_consultas_utente ON consultas(utente_id);
CREATE INDEX idx_consultas_terapeuta ON consultas(terapeuta_id);
CREATE INDEX idx_consultas_data ON consultas(data_inicio);

CREATE TABLE registos_clinicos (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos_clinicos(id) ON DELETE CASCADE,
  consulta_id INTEGER REFERENCES consultas(id) ON DELETE SET NULL,
  area_clinica_id INTEGER NOT NULL REFERENCES areas_clinicas(id),
  conteudo TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registos_processo ON registos_clinicos(processo_id);
CREATE INDEX idx_registos_area ON registos_clinicos(area_clinica_id);

ALTER TABLE consultas
ADD CONSTRAINT no_overlap_sala
EXCLUDE USING GIST (
  sala_id WITH =,
  tsrange(data_inicio, data_fim) WITH &&
)
WHERE (estado = 'agendada');

ALTER TABLE consultas
ADD CONSTRAINT no_overlap_terapeuta
EXCLUDE USING GIST (
  terapeuta_id WITH =,
  tsrange(data_inicio, data_fim) WITH &&
)
WHERE (estado = 'agendada');



CREATE TABLE fichas_avaliacao (
  id SERIAL PRIMARY KEY,
  utente_id INTEGER NOT NULL REFERENCES users(id),
  consulta_id INTEGER REFERENCES consultas(id),
  nome_completo VARCHAR(150),
  numero_processo VARCHAR(50),
  data_nascimento DATE,
  idade INTEGER,
  sexo VARCHAR(20),
  peso_kg NUMERIC(5,2),
  altura_m NUMERIC(4,2),
  imc NUMERIC(5,2),
  diagnostico_queixa_principal TEXT,
  tipo_registo VARCHAR(20) DEFAULT 'grupo',
  diagnostico_fisioterapia TEXT,
  objetivos_prognostico TEXT,
  plano_terapeutico TEXT,
  plano_progressao TEXT,
  historia_pessoal TEXT,
  perspetivas TEXT,
  limitacoes TEXT,
  mcd TEXT,
  historia_condicao TEXT,
  medicacao TEXT,
  hist_med_atual TEXT,
  hist_med_anterior TEXT,
  hist_med_familiar TEXT,
  sinss TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE avaliacoes_objetivas (
  id SERIAL PRIMARY KEY,
  ficha_id INTEGER NOT NULL REFERENCES fichas_avaliacao(id) ON DELETE CASCADE,
  tipo_teste VARCHAR(100) NOT NULL,
  valor VARCHAR(100),
  data DATE,
  reavaliacao_valor VARCHAR(100),
  reavaliacao_data DATE
);

CREATE TABLE fichas_psicologia (
  id SERIAL PRIMARY KEY,
  utente_id INTEGER NOT NULL REFERENCES users(id),
  consulta_id INTEGER REFERENCES consultas(id),
  -- Auto-filled fields
  nome_completo VARCHAR(150),
  numero_processo VARCHAR(50),
  data_nascimento DATE,
  
  -- Section I: Identification
  data_contacto DATE,
  local_contacto VARCHAR(255),
  modalidade VARCHAR(50),
  contacto VARCHAR(255),
  profissional_responsavel VARCHAR(150),
  origem_contacto VARCHAR(100),
  entidade_referencia VARCHAR(255),
  enquadramento VARCHAR(100),
  
  -- Section II: Reason for seeking help
  motivo_descricao TEXT,
  inicio_problema TEXT,
  duracao_evolucao TEXT,
  eventos_precipitantes TEXT,
  impacto_funcionamento TEXT,
  
  -- Section III: Community and relational context
  contexto_elementos TEXT,
  contexto_descricao TEXT,
  indicadores_clinicos TEXT,
  indicadores_descricao TEXT,
  estado_mental_aparencia TEXT,
  estado_mental_discurso TEXT,
  estado_mental_humor TEXT,
  estado_mental_pensamento TEXT,
  estado_mental_orientacao TEXT,
  estado_mental_insight TEXT,
  funcionamento_pessoal TEXT,
  funcionamento_social TEXT,
  funcionamento_profissional TEXT,
  rede_suporte TEXT,
  
  -- Section IV: Expectations and support request
  expectativas_servico TEXT,
  representacoes_psicologo TEXT,
  
  -- Section V: Risk and vulnerability assessment
  risco_indicadores TEXT,
  risco_descricao TEXT,
  risco_acao_adotada TEXT,
  risco_fundamentacao TEXT,
  
  -- Section VI: Information provided to client
  info_esclarecida TEXT,
  info_observacoes TEXT,
  
  -- Section VII: Technical decision and proposed pathway
  decisao_tecnica TEXT,
  decisao_justificacao TEXT,
  
  -- Section VIII: Inter-institutional articulation
  articulacao_entidades TEXT,
  articulacao_consentimento VARCHAR(100),
  articulacao_notas TEXT,
  
  -- Section IX: Technical preliminary impression
  impressao_descritiva TEXT,
  dimensoes_aprofundar TEXT,
  
  -- Section X: Supervision
  supervisao_discutido BOOLEAN DEFAULT FALSE,
  supervisao_data DATE,
  supervisao_sintese TEXT,
  
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fichas_psicologia_utente ON fichas_psicologia(utente_id);
CREATE INDEX idx_fichas_psicologia_consulta ON fichas_psicologia(consulta_id);
CREATE INDEX idx_fichas_psicologia_created_by ON fichas_psicologia(created_by);



CREATE TYPE assiduidade_estado AS ENUM ('P', 'A', 'FJ', 'FI');

CREATE TABLE assiduidade (
  id SERIAL PRIMARY KEY,
  utente_id INTEGER NOT NULL REFERENCES users(id),
  data DATE NOT NULL,
  estado assiduidade_estado NOT NULL,
  observacao TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);