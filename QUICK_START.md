# ⚡ Quick Start - Email Verification (5 min)

## Status: ✅ FUNCIONAL

O sistema **já funciona** com modo MOCK. Para emails reais, configure em 5 minutos.

---

## 🚀 Começar AGORA (Modo MOCK)

```bash
# Terminal 1: Backend
cd /home/rafael/Documentos/Projects\ /ProjetoLPI/backend
go run cmd/main.go

# Terminal 2: Abra browser
http://localhost:8000/criar-conta

# Registre com:
# Nome: Test User
# Email: test@example.com (fictício)
# Senha: Teste123456

# Terminal 3: Copie código dos logs
tail -50 /tmp/backend.log | grep "🔐"

# Cole no formulário e pronto! ✅
```

---

## 📧 Configurar Email Real (Gmail - 5 min)

### Passo 1: Ativar 2FA

```
https://myaccount.google.com
→ Segurança
→ Verificação em 2 passos
→ Confirme com telefone
```

### Passo 2: App Password

```
https://myaccount.google.com/apppasswords
→ Mail + seu dispositivo
→ Copie: abcdefghijklmnop (sem espaços)
```

### Passo 3: Editar `.env`

```bash
cd /home/rafael/Documentos/Projects\ /ProjetoLPI/backend

# Descomente e preencha:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu.email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=seu.email@gmail.com
SMTP_FROM_NAME=Clínica Universitária
```

### Passo 4: Reiniciar

```bash
pkill -f "go run cmd/main.go"
go run cmd/main.go
```

### Passo 5: Testar

```
http://localhost:8000/criar-conta
→ Registre com seu email real
→ Verifique inbox (3-5 seg)
→ Copie código do email
→ Cole no formulário
→ ✅ Login bem-sucedido
```

---

## 🧪 Teste Automático

```bash
cd /home/rafael/Documentos/Projects\ /ProjetoLPI
./teste_email.sh
```

Faz tudo automaticamente!

---

## 📋 Documentação

| Arquivo                        | Propósito           |
| ------------------------------ | ------------------- |
| `README_EMAIL_VERIFICATION.md` | Resumo completo     |
| `CONFIGURAR_EMAIL_PRODUCAO.md` | Guia detalhado SMTP |
| `TESTE_EMAIL_REAL.md`          | Passo a passo Gmail |
| `DIAGRAMAS.md`                 | Visualizações       |
| `PRODUCAO_CHECKLIST.md`        | Segurança           |
| `teste_email.sh`               | Script automatizado |

---

## ✅ Funcionalidades

- ✅ Registro com email + código
- ✅ Verificação de código (24h)
- ✅ Login bloqueado sem verificação
- ✅ Google OAuth auto-verifica
- ✅ Modo MOCK (desenvolvimento)
- ✅ Modo REAL (SMTP)
- ✅ Segurança em produção

---

## 🔧 Troubleshooting

| Problema                 | Solução                                 |
| ------------------------ | --------------------------------------- |
| "Email não chega"        | Verificar pasta **Spam**                |
| "Code not found in logs" | Aguardar 2-3 seg após registro          |
| "Authentication failed"  | Usar **App Password**, não senha normal |
| "Connection refused"     | Backend parado → reiniciar              |
| "Port 587 blocked"       | Usar 465 (adicionar SMTP_PORT=465)      |

---

## 📊 Estados

```
Usuário novo → Registra → Código enviado
    ↓                           ↓
email_verified=false    Clica "Verificar"
    ↓                           ↓
Pode fazer login? ❌     Insere código
    ↓                           ↓
Erro:                   email_verified=true
"Verificar email"       ↓
                        Pode fazer login? ✅
```

---

## 🎯 Próximas Fases

### Fase 1: AGORA ✅

- [x] Sistema funcional
- [x] Modo MOCK pronto
- [x] Documentação completa

### Fase 2: Produção

- [ ] Configurar SMTP
- [ ] Rate limiting
- [ ] Monitoramento

### Fase 3: Melhorias (Opcional)

- [ ] Re-envio de código
- [ ] Verificação por link
- [ ] CAPTCHA
- [ ] SMS 2FA

---

## 📞 Suporte Rápido

**Como ver código (MOCK)?**

```bash
tail -50 /tmp/backend.log | grep "🔐"
```

**Como resetar banco?**

```bash
cd /home/rafael/Documentos/Projects\ /ProjetoLPI
bash init-db.sh
```

**Código expirou?**
→ Registre novamente (24h)

**Email não funciona?**
→ Modo MOCK continua funcionando

---

## ✨ Tudo Pronto!

```
Modo MOCK    → Use AGORA para testes
Modo REAL    → Configure SMTP quando precisar
Documentação → Complete em DIAGRAMAS.md
Script teste → ./teste_email.sh
```

**System Status: READY TO GO 🚀**
