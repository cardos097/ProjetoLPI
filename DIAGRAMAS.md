# 🎨 Documentação Visual - Sistema de Verificação de Email

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CriarContaPage.jsx                                      │   │
│  │  - Step 1: Formulário Registro (nome, email, pwd)       │   │
│  │  - Step 2: Formulário Verificação (código 6 dígitos)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  auth.jsx                                                │   │
│  │  - registerRequest() → retorna user_id                  │   │
│  │  - fetch /auth/verify-email                             │   │
│  │  - fetch /auth/login (automático)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ↓ HTTP Requests          ↑ JSON Response
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Go/Gin)                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  auth_controller.go                                      │   │
│  │  • Register() - gera código, salva BD, envia email      │   │
│  │  • VerifyEmail() - valida código, marca verificado      │   │
│  │  • Login() - verifica email_verified antes de logar      │   │
│  │  • GoogleLogin() - auto-verifica contas Google           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  utils/email.go                                          │   │
│  │  • InitEmailConfig() - lê variáveis SMTP                │   │
│  │  • SendVerificationEmail() - envia email                │   │
│  │  • sendMockEmail() - modo desenvolvimento                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ↓ INSERT/UPDATE                ↑ SELECT
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  users table                                             │   │
│  │  • id, nome, email, password_hash, role                 │   │
│  │  • email_verified (boolean) - NOVO                      │   │
│  │  • verification_code (string) - NOVO                    │   │
│  │  • verification_code_expires_at (timestamp) - NOVO      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ↓ via SMTP                   (ou MOCK logs)
┌─────────────────────────────────────────────────────────────────┐
│                 EMAIL SERVICE                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SMTP Real (Produção)              MOCK (Desenvolvimento)│   │
│  │  • Gmail SMTP                      • Imprime nos logs    │   │
│  │  • SendGrid                        • /tmp/backend.log    │   │
│  │  • AWS SES                         • Sem credenciais     │   │
│  │  • Outlook 365                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Registro - Timeline

```
MOMENTO     | USUÁRIO              | FRONTEND           | BACKEND          | BANCO DADOS
────────────┼─────────────────────┼───────────────────┼──────────────────┼─────────────
t=0         | Clica "Criar Conta" | Abre formulário   |                  |
            |                     |                   |                  |
t=1         | Preenche form       | Valida campos     |                  |
            |                     |                   |                  |
t=2         | Clica "Criar Conta" | POST /register    |                  |
            |                     |                   |                  |
t=3         |                     |                   | Valida dados     |
            |                     |                   | Gera código: 548710
            |                     |                   | Hash password    |
t=4         |                     |                   |                  | INSERT user
            |                     |                   |                  | email_verified=false
            |                     |                   |                  | code=548710
t=5         |                     |                   | Envia email      |
            |                     |                   |                  |
t=6         |                     | Response: user_id | 200 OK           |
            |                     | Mostra: "Insira  | {user_id: 123}   |
            |                     | o código"        |                  |
t=7         | Email chega inbox   | Aguarda código    |                  |
            | (3-5 segundos)      |                   |                  |
            |                     |                   |                  |
t=10        | Copia código        | Campo de código   |                  |
            | Clica "Verificar"   | POST /verify-email|                  |
            |                     |                   |                  |
t=11        |                     |                   | Valida código    |
            |                     |                   | Verifica expiração
t=12        |                     |                   |                  | UPDATE user
            |                     |                   |                  | email_verified=true
            |                     |                   |                  | code=NULL
t=13        |                     | "Verificado!"     | 200 OK           |
            |                     | POST /login auto  | {success: true}  |
            |                     |                   |                  |
t=14        |                     |                   | Verifica pwd     |
            |                     |                   | Gera JWT token   |
t=15        |                     | Response: token   | 200 OK           |
            |                     | Redireciona       | {token: "abc..."}|
            |                     | /dashboard        |                  |
t=16        | Dashboard carrega   |                   |                  |
            | ✅ SUCESSO!         |                   |                  |
```

---

## Estados do Usuário

```
┌─────────────────────────┐
│   NOVO REGISTRO         │
│                         │
│ • email_verified: false │
│ • code: "548710"        │
│ • expires: +24h         │
└────────────┬────────────┘
             │
      [Usuário copia código
       do email]
             │
             ↓
┌─────────────────────────────────┐
│   EMAIL VERIFICADO              │
│                                 │
│ • email_verified: true          │
│ • code: NULL                    │
│ • PODE FAZER LOGIN ✅           │
└─────────────────────────────────┘

EVENTOS ESPECIAIS:
• Código expirou? ❌ Erro 400 "Código expirado"
• Email não chega? 📧 Resend (implementar depois)
• Conta Google? ✅ Auto-verifica, sem código
```

---

## Estrutura de Banco de Dados - Alterações

```sql
-- ANTES (users table)
id                  INTEGER PRIMARY KEY
nome                VARCHAR(255)
email               VARCHAR(255) UNIQUE
password_hash       VARCHAR(255)
role                VARCHAR(50)
...

-- DEPOIS (users table - NOVO)
id                  INTEGER PRIMARY KEY
nome                VARCHAR(255)
email               VARCHAR(255) UNIQUE
password_hash       VARCHAR(255)
role                VARCHAR(50)
email_verified      BOOLEAN DEFAULT FALSE            -- ✨ NOVO
verification_code   VARCHAR(255) UNIQUE              -- ✨ NOVO
verification_code_expires_at TIMESTAMP              -- ✨ NOVO
...

-- ÍNDICE
CREATE INDEX idx_users_verification_code
  ON users(verification_code);
```

---

## Endpoints da API

### 1. POST /auth/register

```
Request:
{
  "nome_completo": "João Silva",
  "email": "joao@example.com",
  "password": "Senha123456",
  "confirm_password": "Senha123456"
}

Response (Desenvolvimento):
{
  "message": "Conta criada com sucesso. Por favor verifique o seu email.",
  "user_id": 123,
  "role": "utente",
  "verification_code": "548710"    ← Modo MOCK apenas
}

Response (Produção):
{
  "message": "Conta criada com sucesso. Por favor verifique o seu email.",
  "user_id": 123,
  "role": "utente",
  "verification_code": ""          ← Vazio (segurança)
}
```

### 2. POST /auth/verify-email

```
Request:
{
  "user_id": 123,
  "code": "548710"
}

Response (Sucesso):
{
  "message": "Email verificado com sucesso!"
}

Response (Erro - código expirado):
{
  "error": "Código de verificação expirado"
}

Response (Erro - código inválido):
{
  "error": "Código de verificação inválido"
}
```

### 3. POST /auth/login

```
Request:
{
  "email": "joao@example.com",
  "password": "Senha123456"
}

Response (Email não verificado):
{
  "error": "Por favor verifique o seu email antes de entrar"
}

Response (Sucesso):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": 123,
  "role": "utente",
  "name": "João Silva",
  "email": "joao@example.com"
}
```

### 4. POST /auth/google/callback

```
Request:
{
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}

Response (Novo usuário):
{
  "token": "...",
  "user": {
    "id": 124,
    "email": "joao@gmail.com",
    "name": "João Silva",
    "role": "utente"
  }
  // email_verified: TRUE automaticamente
}
```

---

## Variáveis de Ambiente

### Desenvolvimento (modo atual)

```env
ENVIRONMENT=development        # Modo MOCK de email
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=clinica_app
DB_PASSWORD=1234
DB_NAME=clinicplatform
JWT_SECRET=ClinicaPlatformJWT@2026

# SMTP descomentado = email real
# SMTP comentado = mock (logs)
```

### Produção (recomendado)

```env
ENVIRONMENT=production         # Modo REAL

# SMTP obrigatório em produção
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email@gmail.com
SMTP_PASSWORD=app_password_16_chars
SMTP_FROM_EMAIL=seu.email@gmail.com
SMTP_FROM_NAME=Clínica Universitária

# Database
DB_HOST=production-db.example.com
DB_PORT=5432
DB_USER=prod_user
DB_PASSWORD=strong_password_here
DB_NAME=clinica_production
DB_SSLMODE=require

JWT_SECRET=production_jwt_secret_strong_32_chars
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## Fluxo de Decisão - Login

```
┌─ Usuário tenta login
│
├─ Email existe?
│  ├─ NÃO → ❌ Erro: Email não registado
│  └─ SIM ↓
│
├─ Password correta?
│  ├─ NÃO → ❌ Erro: Password inválida
│  └─ SIM ↓
│
├─ email_verified == true?
│  ├─ NÃO (e google_sub == null)
│  │  └─ ❌ Erro: "Por favor verifique o seu email"
│  └─ SIM (ou google_sub != null) ↓
│
└─ ✅ Gera JWT token
   └─ Login bem-sucedido!
```

---

## Segurança - Checklist

```
✅ IMPLEMENTADO:
  [x] Código de 6 dígitos aleatório (criptográfico)
  [x] Expiração em 24 horas
  [x] verification_code UNIQUE
  [x] verification_code removido em produção
  [x] Hash de password com bcrypt
  [x] JWT para autenticação
  [x] Google OAuth auto-verifica
  [x] Rate limiting (backend ready)

⏳ RECOMENDADO:
  [ ] Rate limiting em /auth/register
  [ ] CAPTCHA em formulário de registro
  [ ] Verificação de disposição de email (MX record)
  [ ] Email duplo (confirmation link + código)
  [ ] Re-envio de código (resend endpoint)
  [ ] Logs de auditoria para verificação
  [ ] 2FA adicional (SMS/TOTP opcional)
```

---

## Modo MOCK - Output Exemplo

```
============================================================
📧 EMAIL MOCK (Development Mode)
============================================================
Para: joao.silva@example.com
De: Clínica Universitária <rececao@clinica.pt>
Assunto: Verificação de Email - Clínica Universitária
Data: 2026-05-09 16:03:15
------------------------------------------------------------
Corpo:
------------------------------------------------------------
Bem-vindo à Clínica Universitária!

Para completar o seu registo, utilize o seguinte código de verificação:

   🔐 548710

Este código expira em 24 horas.

Se não criou esta conta, ignore este email.
------------------------------------------------------------
(Este é um email MOCK. Configure SMTP para enviar de verdade)
============================================================
```

---

**Diagrama criado com sucesso! 🎨**
