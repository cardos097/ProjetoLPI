# Sistema de Verificação de Email

## Descrição

O sistema de verificação de email foi implementado para:

- **Novos registos de utente**: Obrigam verificação de email antes do login
- **Contas Google**: Verificam-se automaticamente (sem necessidade de código)
- **Email remetente**: `rececao@clinica.pt`

## Fluxo de Funcionamento

### 1. Registro (Frontend: CriarContaPage.jsx)

```
Usuario entra dados → POST /auth/register
↓
Backend cria user com email_verified = false
↓
Backend gera código de 6 dígitos (válido 24h)
↓
Backend TENTA enviar email com código
↓
Resposta: {message, user_id, verification_code}
↓
Frontend exibe campo para inserir código
```

### 2. Verificação de Email (Frontend)

```
Usuario insere código → POST /auth/verify-email
↓
Backend valida código e expiração
↓
Backend atualiza email_verified = true
↓
Frontend faz login automaticamente
```

### 3. Login (Backend)

```
Usuario tenta fazer login → POST /auth/login
↓
Backend verifica credenciais
↓
SE email_verified = false E não é conta Google:
  → Retorna erro: "Por favor verifique o seu email"
↓
Senão: Retorna JWT token
```

## Configuração de Email

### Variáveis de Ambiente Necessárias

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rececao@clinica.pt
SMTP_PASSWORD=seu_app_password
SMTP_FROM_EMAIL=rececao@clinica.pt
SMTP_FROM_NAME=Clínica Universitária
```

### Se NÃO configurar SMTP

Se não adicionar as variáveis de ambiente:

- ✅ Emails não serão enviados (modo fallback)
- ✅ Códigos aparecerão na resposta do /auth/register (para testing)
- ✅ Sistema continua funcionando, mas sem envio real

### Testando em Development

1. **SEM configurar SMTP** (para testes rápidos):
   - Fazer registro
   - Código aparece na resposta JSON
   - Copiar e colar no formulário de verificação
   - Login bem-sucedido

2. **COM SMTP configurado**:
   - Email é enviado para `rececao@clinica.pt`
   - Email HTML formatado com logo e instruções
   - Código com expiração de 24 horas

## Exemplo: Gmail com App Passwords

1. Ativar Gmail com App Passwords:
   - Ir a: https://myaccount.google.com/apppasswords
   - Selecionar "Mail" e "Windows Computer"
   - Google gera uma password de 16 caracteres

2. Adicionar ao `.env`:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=rececao@clinica.pt
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   SMTP_FROM_EMAIL=rececao@clinica.pt
   SMTP_FROM_NAME=Clínica Universitária
   ```

3. Reiniciar o backend

## Estados de Email

| Cenário          | email_verified | Pode fazer login? | Requer código? |
| ---------------- | -------------- | ----------------- | -------------- |
| Novo registro    | false          | ❌ Não            | ✅ Sim         |
| Após verificação | true           | ✅ Sim            | ❌ Não         |
| Google login     | true (auto)    | ✅ Sim            | ❌ Não         |
| Seed data        | true           | ✅ Sim            | ❌ Não         |

## Arquivo de Resposta do Register

### Sem Email Configurado:

```json
{
  "message": "Conta criada com sucesso. Por favor verifique o seu email.",
  "user_id": 13,
  "role": "utente",
  "verification_code": "123456"
}
```

### Com Email Configurado:

- Email é enviado para `rececao@clinica.pt`
- verification_code continua na resposta (remover em production)

## Código de Exemplo para Envio de Email

O sistema usa `net/smtp` nativo do Go:

- Suporta SMTP com autenticação PLAIN
- Envia HTML formatado
- Trata timeouts e erros gracefully
- Se falhar, não interrompe o registro do user

## Função Principal

```go
func SendVerificationEmail(toEmail, verificationCode string) error {
  // Conecta ao servidor SMTP
  // Envia email HTML formatado
  // Retorna erro se falhar
  // Registra na console (log)
}
```

## Segurança

- ✅ Código de 6 dígitos aleatório
- ✅ Expiração obrigatória em 24h
- ✅ Código único por email (UNIQUE constraint)
- ✅ Senha hasheada com bcrypt
- ✅ Login bloqueado até verificação (excepto Google)

## Próximos Passos

1. Configurar SMTP com `rececao@clinica.pt`
2. Remover `verification_code` da resposta do /auth/register em production
3. Implementar resend de código (se expirar)
4. Adicionar customização do template de email
