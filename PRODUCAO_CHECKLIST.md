# 🔒 Configuração de Produção - Email Verification

## Ajustes Necessários para Produção

### 1. Segurança: Remover `verification_code` da Resposta

**Arquivo:** `/backend/controllers/auth_controller.go`

**Mudança:** A resposta Register deve conter:

- ✅ message
- ✅ user_id
- ✅ role
- ❌ verification_code (REMOVER em produção)

**Motivo:** O código enviado por email é mais seguro que enviar na resposta. Isso evita:

- Ataques man-in-the-middle
- Logs com códigos sensíveis
- Expo sição em histórico de requisições

### 2. Variáveis de Ambiente Obrigatórias

**Arquivo:** `/backend/.env`

```env
# PRODUÇÃO OBRIGATÓRIO
ENVIRONMENT=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email@gmail.com
SMTP_PASSWORD=sua_app_password
SMTP_FROM_EMAIL=seu.email@gmail.com
SMTP_FROM_NAME=Clínica Universitária

# DESENVOLVIMENTO (deixar comentado)
# ENVIRONMENT=development
```

### 3. Email Configuration - Comportamento

```go
// Desenvolvimento: mostra verification_code na resposta (testes locais)
// Produção: NÃO mostra verification_code na resposta (segurança)

if os.Getenv("ENVIRONMENT") == "development" {
    response.VerificationCode = verificationCode // Mostra para testes
} else {
    response.VerificationCode = "" // Vazio em produção
}
```

### 4. Checklist de Segurança

- [ ] SMTP_HOST configurado
- [ ] SMTP_PASSWORD é App Password (não senha de conta)
- [ ] FromEmail configurado corretamente
- [ ] ENVIRONMENT=production
- [ ] verification_code não é retornado na resposta
- [ ] HTTPS habilitado em produção (TLS para emails)
- [ ] Backup de banco de dados configurado
- [ ] Rate limiting ativado para /auth/register
- [ ] Logs de email separados (auditoria)

### 5. Alternativas SMTP para Produção

**Gmail (Pequeno volume)**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email@gmail.com
SMTP_PASSWORD=app_password
```

**SendGrid (Melhor para escala)**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
```

**AWS SES (Enterprise)**

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=seu_usuario_ses
SMTP_PASSWORD=sua_senha_ses
```

**Microsoft 365**

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu.email@empresa.com
SMTP_PASSWORD=sua_senha
```

### 6. Teste de Produção (Antes de Deploy)

```bash
# 1. Verificar SMTP
telnet smtp.gmail.com 587

# 2. Validar credenciais em: https://test.smtpconnection.com/

# 3. Fazer teste de registro com email real
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teste@example.com",
    "password":"TesteSenha123",
    "confirm_password":"TesteSenha123",
    "nome_completo":"Teste Produção"
  }'

# 4. Verificar resposta NÃO contém verification_code
```

### 7. Monitoramento em Produção

**Logs a Verificar:**

```
✓ Email SMTP configurado: smtp.gmail.com:587
✓ Email enviado com sucesso para: usuario@example.com
❌ Erro ao enviar email: [detalhes do erro]
```

**Métricas Importantes:**

- Taxa de entrega de emails
- Tempo de verificação (até 24h)
- Taxa de falha de login por email não verificado
- Erros de SMTP (autenticação, timeout)

---

## Implementação Recomendada

### Fase 1: Testes Locais (AGORA)

- ✅ ENVIRONMENT=development
- ✅ Modo mock + real (ambos funcionam)
- ✅ verification_code visível para testes

### Fase 2: Ambiente Staging

- ✅ ENVIRONMENT=production
- ✅ SMTP real configurado (Gmail/SendGrid)
- ✅ verification_code removido da resposta
- ✅ Testes end-to-end com emails reais

### Fase 3: Produção

- ✅ Tudo validado em staging
- ✅ Backups de BD ativados
- ✅ Rate limiting + DDoS protection
- ✅ Monitoramento de emails
- ✅ Alertas de falha
