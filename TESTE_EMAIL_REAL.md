# 🚀 Teste Rápido: Email Real com Gmail

## 5 Minutos para Configurar

### Passo 1: Habilitar 2FA no Gmail

1. Abra https://myaccount.google.com
2. **Segurança** → **Verificação em 2 passos**
3. Confirme com seu telefone

### Passo 2: Gerar App Password

1. Volte para https://myaccount.google.com/apppasswords
2. Selecione: **Mail** e **Seu Dispositivo**
3. Google mostra: `abcd efgh ijkl mnop`
4. **Copie SEM espaços**: `abcdefghijklmnop`

### Passo 3: Configurar `.env`

Edite `/home/rafael/Documentos/Projects /ProjetoLPI/backend/.env` e altere:

```env
# Encontre estas linhas e DESCOMENTE + PREENCHA:

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email.gmail@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=seu.email.gmail@gmail.com
SMTP_FROM_NAME=Clínica Universitária
```

**Use seu email Gmail real!**

### Passo 4: Reiniciar Backend

```bash
pkill -f "go run cmd/main.go"
sleep 2
cd /home/rafael/Documentos/Projects\ /ProjetoLPI/backend && go run cmd/main.go
```

Se correto, verá:

```
✓ Email SMTP configurado: smtp.gmail.com:587
```

### Passo 5: Testar Registro

1. Abra http://localhost:8000/criar-conta
2. Preencha com:
   - Nome: "Teste Real"
   - Email: **seu.email.real@gmail.com**
   - Senha: Teste123456
3. Clique "Criar Conta"
4. **Abra a caixa de entrada do seu Gmail** (aguarde 3-5 segundos)
5. Procure email de "Clínica Universitária"
6. Copie o código
7. Cole no formulário de verificação
8. ✅ Pronto!

---

## Validação

Depois de configurar, verifique:

- [ ] Backend mostra "Email SMTP configurado"
- [ ] Email recebido no Gmail após registro
- [ ] Código de 6 dígitos vem no email
- [ ] Verificação funciona após inserir o código
- [ ] Redirecionamento para login bem-sucedido

---

## Se Algo Falhar

### Erro: "Connection refused"

→ Porta 587 bloqueada pela rede. Use 465 (porta para TLS):

```env
SMTP_PORT=465
```

### Erro: "Authentication failed"

→ Verifique:

- Se gerou **App Password** (não senha normal)
- Se copiou SEM espaços
- Se 2FA está ativado

### Email não chega

→ Verificar pasta **Spam**
→ Liberar em: https://myaccount.google.com/apppasswords

---

## Para Ambiente de Produção

Depois de testar com sucesso:

1. ✅ Sistema funciona com Gmail
2. ✅ Pode usar SendGrid/AWS SES para volume maior
3. ✅ Remova `verification_code` da resposta JSON (segurança)
4. ✅ Mude `ENVIRONMENT=production` no `.env`

---

**Está tudo funcional! Apenas configure as credenciais no `.env` e teste.**
