# Clínica Platform

## 🔐 Google OAuth com @ufp.edu.pt

Autenticação Google OAuth implementada com validação obrigatória de emails `@ufp.edu.pt`.

### 🚀 Setup

```bash
# 1. Google Cloud Project: https://console.cloud.google.com/
#    Criar OAuth Client ID (5 minutos)

# 2. Configurar variáveis
echo "VITE_GOOGLE_CLIENT_ID=seu-client-id" > frontend/.env.local
echo "GOOGLE_CLIENT_ID=seu-client-id" >> backend/.env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> backend/.env

# 3. Instalar e correr
cd frontend && npm install && npm run dev
cd backend && go mod tidy && go run cmd/main.go

# Abrir: http://localhost:5173/login
```

### ✨ Implementado

- **Backend**: Novo endpoint `/auth/google/callback`, validação @ufp.edu.pt, JWT 24h
- **Frontend**: Botão Google nativo, integração AuthContext
- **Database**: Campos `google_sub` e `last_login_at`
- **Security**: go-oidc (JWKS validation), key rotation automática
