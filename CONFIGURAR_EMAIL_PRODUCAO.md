# 📧 Configurar Email Real - Guia Completo

## Opção 1: Gmail (Recomendado para Produção)

### Passo 1: Ativar 2-Factor Authentication no Gmail

1. Abra [myaccount.google.com](https://myaccount.google.com)
2. Clique em **"Segurança"** (lado esquerdo)
3. Procure por **"Verificação em 2 passos"**
4. Clique **"Começar a configuração"** e siga os passos
5. Confirme com o seu telefone

### Passo 2: Gerar App Password

1. Volte a [myaccount.google.com](https://myaccount.google.com)
2. Clique em **"Segurança"**
3. Procure por **"Senhas de aplicações"** (só aparece se 2FA estiver ativo)
4. Selecione:
   - **Aplicação**: Mail
   - **Dispositivo**: Windows/Linux/Mac
5. Google gera uma senha com 16 caracteres (ex: `abcd efgh ijkl mnop`)
6. **Copie a senha SEM espaços** (será: `abcdefghijklmnop`)

### Passo 3: Configurar no `.env`

Abra `/backend/.env` e **descomente e preencha**:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=seu.email@gmail.com
SMTP_FROM_NAME=Clínica Universitária
```

**Importante:**

- Use o seu email Gmail completo (ex: `rafael@gmail.com`)
- A senha deve ser a **App Password** (16 caracteres, SEM espaços)
- NÃO use a senha da sua conta Google normal

### Passo 4: Reiniciar Backend

```bash
# Matar o processo anterior
pkill -f "go run cmd/main.go"

# Iniciar novamente
cd backend && go run cmd/main.go
```

Se tudo estiver correto, verá:

```
✅ Email SMTP configurado com sucesso
De: Clínica Universitária <seu.email@gmail.com>
```

---

## Opção 2: Alternativas de SMTP

### SendGrid (Enterprise)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
```

### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=seu_usuario_ses
SMTP_PASSWORD=sua_senha_ses
```

---

## Teste Rápido

### 1. Ir para Registro

```
http://localhost:8000/criar-conta
```

### 2. Preencher Formulário

- Nome: "Teste Produção"
- Email: **seu.email.real@gmail.com**
- Senha: TesteSenha123

### 3. Verificar Email Real

- Abra sua caixa de entrada do Gmail
- Procure email de `Clínica Universitária`
- Copie o código de verificação
- Cole no formulário de verificação
- ✅ Email verificado!

---

## Troubleshooting

### Erro: "SMTP authentication failed"

- Verificar se usou a **App Password** (não a senha da conta)
- Confirmar se 2FA está ativado no Gmail
- Testar credenciais em: https://test.smtpconnection.com/

### Erro: "connection timeout"

- Firewall pode estar bloqueando porta 587
- Tentar porta 465 (requer TLS)

### Email não recebido

- Verificar pasta **Spam/Lixo**
- Usar `bcc` ou `reply-to` diferente se necessário

---

## Em Desenvolvimento

Para voltar ao **modo mock** (testes locais):

- Comente as linhas SMTP no `.env`
- Reinicie o backend
- Verá novamente: `⚠️ Email SMTP não configurado. Usando modo MOCK`

---

## Checklist Final

- [ ] 2FA ativado no Gmail
- [ ] App Password gerado
- [ ] `.env` preenchido com credenciais
- [ ] Backend reiniciado
- [ ] Teste de registro com email real
- [ ] Email recebido na caixa de entrada
- [ ] Código de verificação funciona
- [ ] Login após verificação bem-sucedido
