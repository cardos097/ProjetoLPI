package models

import "time"

type FichaPsicologia struct {
	ID             uint       `gorm:"primaryKey"`
	UtenteID       uint       `gorm:"column:utente_id"`
	ConsultaID     *uint      `gorm:"column:consulta_id"`
	NomeCompleto   string     `gorm:"column:nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento"`

	// Section I: Identification
	DataContacto            *time.Time `gorm:"column:data_contacto"`
	LocalContacto           string     `gorm:"column:local_contacto"`
	Modalidade              string     `gorm:"column:modalidade"`
	Contacto                string     `gorm:"column:contacto"`
	ProfissionalResponsavel string     `gorm:"column:profissional_responsavel"`
	OrigemContacto          string     `gorm:"column:origem_contacto"`
	EntidadeReferencia      string     `gorm:"column:entidade_referencia"`
	Enquadramento           string     `gorm:"column:enquadramento"`

	// Section II: Reason for seeking help
	MotivoDescricao      string `gorm:"column:motivo_descricao;type:text"`
	InicioProblema       string `gorm:"column:inicio_problema;type:text"`
	DuracaoEvolucao      string `gorm:"column:duracao_evolucao;type:text"`
	EventosPrecipitantes string `gorm:"column:eventos_precipitantes;type:text"`
	ImpactoFuncionamento string `gorm:"column:impacto_funcionamento;type:text"`

	// Section III: Community and relational context
	ContextoElementos         string `gorm:"column:contexto_elementos;type:text"`
	ContextoDescricao         string `gorm:"column:contexto_descricao;type:text"`
	IndicadoresClinicos       string `gorm:"column:indicadores_clinicos;type:text"`
	IndicadoresDescricao      string `gorm:"column:indicadores_descricao;type:text"`
	EstadoMentalAparencia     string `gorm:"column:estado_mental_aparencia;type:text"`
	EstadoMentalDiscurso      string `gorm:"column:estado_mental_discurso;type:text"`
	EstadoMentalHumor         string `gorm:"column:estado_mental_humor;type:text"`
	EstadoMentalPensamento    string `gorm:"column:estado_mental_pensamento;type:text"`
	EstadoMentalOrientacao    string `gorm:"column:estado_mental_orientacao;type:text"`
	EstadoMentalInsight       string `gorm:"column:estado_mental_insight;type:text"`
	FuncionamentoPessoal      string `gorm:"column:funcionamento_pessoal;type:text"`
	FuncionamentoSocial       string `gorm:"column:funcionamento_social;type:text"`
	FuncionamentoProfissional string `gorm:"column:funcionamento_profissional;type:text"`
	RedeSuporte               string `gorm:"column:rede_suporte;type:text"`

	// Section IV: Expectations and support request
	ExpectativasServico     string `gorm:"column:expectativas_servico;type:text"`
	RepresentacoesPsicologo string `gorm:"column:representacoes_psicologo;type:text"`

	// Section V: Risk and vulnerability assessment
	RiscoIndicadores   string `gorm:"column:risco_indicadores;type:text"`
	RiscoDescricao     string `gorm:"column:risco_descricao;type:text"`
	RiscoAcaoAdotada   string `gorm:"column:risco_acao_adotada;type:text"`
	RiscoFundamentacao string `gorm:"column:risco_fundamentacao;type:text"`

	// Section VI: Information provided to client
	InfoEsclarecida string `gorm:"column:info_esclarecida;type:text"`
	InfoObservacoes string `gorm:"column:info_observacoes;type:text"`

	// Section VII: Technical decision and proposed pathway
	DecisaoTecnica      string `gorm:"column:decisao_tecnica;type:text"`
	DecisaoJustificacao string `gorm:"column:decisao_justificacao;type:text"`

	// Section VIII: Inter-institutional articulation
	ArticulacaoEntidades     string `gorm:"column:articulacao_entidades;type:text"`
	ArticulacaoConsentimento string `gorm:"column:articulacao_consentimento"`
	ArticulacaoNotas         string `gorm:"column:articulacao_notas;type:text"`

	// Section IX: Technical preliminary impression
	ImpressaoDescritiva string `gorm:"column:impressao_descritiva;type:text"`
	DimensoesAprofundar string `gorm:"column:dimensoes_aprofundar;type:text"`

	// Section X: Supervision
	SupervisaoDiscutido bool       `gorm:"column:supervisao_discutido"`
	SupervisaoData      *time.Time `gorm:"column:supervisao_data"`
	SupervisaoSintese   string     `gorm:"column:supervisao_sintese;type:text"`

	CreatedBy uint      `gorm:"column:created_by"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`

	// Relationships
	Utente   *Utente   `gorm:"foreignKey:UtenteID;references:UserID"`
	Consulta *Consulta `gorm:"foreignKey:ConsultaID"`
	User     *User     `gorm:"foreignKey:CreatedBy"`
}

func (FichaPsicologia) TableName() string {
	return "fichas_psicologia"
}
