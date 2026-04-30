# 🚀 Setup da Base de Dados Local

## Quick Start (Linux/Mac)

```bash
# Na raiz do projeto
./init-db.sh
```

Pronto! A BD está criada e preenchida com dados de teste.

---

## Manual (se preferir fazer passo a passo)

### 1️⃣ Criar Utilizador e BD

```bash
sudo -u postgres psql << 'EOF'
DROP USER IF EXISTS clinica_dev CASCADE;
DROP DATABASE IF EXISTS clinicplatform;
CREATE USER clinica_dev WITH PASSWORD 'clinica1234';
CREATE DATABASE clinicplatform OWNER clinica_dev;
GRANT ALL PRIVILEGES ON DATABASE clinicplatform TO clinica_dev;
EOF
```

### 2️⃣ Aplicar Schema

```bash
PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -f database/schema.sql
```

### 3️⃣ Carregar Dados de Teste

```bash
PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -f database/seed.sql
```

### 4️⃣ Verificar

```bash
PGPASSWORD='clinica1234' psql -h 127.0.0.1 -U clinica_dev -d clinicplatform -c "SELECT COUNT(*) FROM users;"
```

---

## Após a Setup 🎯

### Backend

```bash
cd backend
go run cmd/main.go
```

Servidor rodará em `http://localhost:8080`

### Frontend

```bash
cd frontend
npm run dev
```

Aplicação rodará em `http://localhost:5173`

---

## Credenciais de Teste 🔐

Estão no `database/seed.sql`. Alguns exemplos:

| Email              | Senha       | Role           |
| ------------------ | ----------- | -------------- |
| admin@clinica.pt   | password123 | admin          |
| joao@clinica.pt    | password123 | terapeuta      |
| maria@clinica.pt   | password123 | utente         |
| rececao@clinica.pt | password123 | administrativo |

> Nota: As senhas no seed são encriptadas. Use estas credenciais para login.

---

## Para Usar Supabase (Testes com Pessoas) 🌐

Altere o `.env` do backend:

```env
DB_HOST=sua-instancia.supabase.co
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_supabase
DB_NAME=postgres
DB_SSLMODE=require
```

Depois execute os 3 passos acima com o novo `.env`:

```bash
PGPASSWORD='sua_senha' psql -h sua-instancia.supabase.co -U seu_usuario -d postgres -f database/schema.sql
PGPASSWORD='sua_senha' psql -h sua-instancia.supabase.co -U seu_usuario -d postgres -f database/seed.sql
```

---

## Troubleshooting 🔧

### "Erro: role "clinica_dev" does not exist"

PostgreSQL não está a rodar. Inicie-o:

```bash
# Linux
sudo systemctl start postgresql

# Mac (Homebrew)
brew services start postgresql
```

### "Connection refused 127.0.0.1:5432"

PostgreSQL não está em execução.

### "FATAL: password authentication failed"

Verifique o `.env` - a senha deve ser `clinica1234`

---

## Estrutura da BD 📊

- `users` - Utilizadores (admin, terapeuta, utente, administrativo)
- `terapeutas` - Dados específicos de terapeutas
- `utentes` - Dados específicos de utentes
- `consultas` - Agendamentos de consultas
- `documentos_consulta` - Ficheiros PDF das consultas ✨ (NOVO)
- `fichas_avaliacao` - Formulários de avaliação
- `fichas_psicologia` - Formulários de psicologia
- `assiduidade` - Registos de presença
- E mais... veja `database/schema.sql`

---

## 📝 Notas

- O script `init-db.sh` é idempotente - pode correr várias vezes
- Cada vez que correr, a BD é recriada (útil para "reset")
- Os dados no `seed.sql` são apenas exemplos
- A nova funcionalidade de upload de PDFs já está pronta! 📄
