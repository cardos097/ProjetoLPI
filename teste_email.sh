#!/bin/bash

# 📧 Script de Teste - Sistema de Verificação de Email
# Uso: chmod +x teste_email.sh && ./teste_email.sh

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/rafael/Documentos/Projects /ProjetoLPI"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_FILE="/tmp/backend.log"
EMAIL_TEST="teste.$(date +%s)@example.com"
PASSWORD="Teste123456"
NOME_COMPLETO="Usuário Teste $(date +%H:%M:%S)"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}📧 TESTE DO SISTEMA DE VERIFICAÇÃO DE EMAIL${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ===== VERIFICAÇÃO INICIAL =====
echo -e "${YELLOW}[1/5] Verificando ambiente...${NC}"

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl não encontrado${NC}"
    exit 1
fi

if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependências OK${NC}"
echo ""

# ===== COMPILAÇÃO =====
echo -e "${YELLOW}[2/5] Compilando backend...${NC}"
cd "$BACKEND_DIR"
if go build ./... 2>&1; then
    echo -e "${GREEN}✓ Backend compilado com sucesso${NC}"
else
    echo -e "${RED}❌ Erro na compilação${NC}"
    exit 1
fi
echo ""

# ===== REINICIAR BACKEND =====
echo -e "${YELLOW}[3/5] Reiniciando backend...${NC}"
pkill -f "go run cmd/main.go" || true
sleep 2

go run cmd/main.go > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Aguardar servidor iniciar
echo "Aguardando servidor..."
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend rodando na porta 8080${NC}"
        break
    fi
    sleep 1
done
echo ""

# ===== VERIFICAR CONFIGURAÇÃO DE EMAIL =====
echo -e "${YELLOW}[4/5] Verificando configuração de email...${NC}"
sleep 1

if grep -q "Email SMTP configurado" "$LOG_FILE"; then
    echo -e "${GREEN}✓ SMTP configurado (Email Real)${NC}"
    SMTP_STATUS="REAL"
elif grep -q "Email SMTP não configurado" "$LOG_FILE"; then
    echo -e "${YELLOW}⚠️  Modo MOCK (Desenvolvimento)${NC}"
    SMTP_STATUS="MOCK"
else
    echo -e "${YELLOW}⚠️  Status desconhecido${NC}"
    SMTP_STATUS="UNKNOWN"
fi
echo ""

# ===== TESTE DE REGISTRO =====
echo -e "${YELLOW}[5/5] Testando registro de usuário...${NC}"
echo "Email: $EMAIL_TEST"
echo "Senha: $PASSWORD"
echo "Nome: $NOME_COMPLETO"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL_TEST\",
    \"password\":\"$PASSWORD\",
    \"confirm_password\":\"$PASSWORD\",
    \"nome_completo\":\"$NOME_COMPLETO\"
  }")

echo "Resposta: $REGISTER_RESPONSE"
echo ""

# Extrair user_id
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"user_id":[0-9]*' | cut -d: -f2 || echo "")

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ Erro no registro - user_id não encontrado${NC}"
    echo "$REGISTER_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Usuário criado com ID: $USER_ID${NC}"
echo ""

# ===== BUSCAR CÓDIGO DE VERIFICAÇÃO =====
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}📧 PROCURANDO CÓDIGO DE VERIFICAÇÃO...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

sleep 2

if [ "$SMTP_STATUS" = "MOCK" ]; then
    echo -e "${YELLOW}Modo MOCK - Procurando código nos logs...${NC}"
    
    # Procurar código nos logs
    CODE=$(tail -100 "$LOG_FILE" | grep -A 20 "EMAIL MOCK" | grep "🔐" | tail -1 | grep -o '[0-9]\{6\}' || echo "")
    
    if [ -z "$CODE" ]; then
        echo -e "${RED}❌ Código não encontrado nos logs${NC}"
        echo ""
        echo "Últimas linhas do log:"
        tail -50 "$LOG_FILE"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Código encontrado: $CODE${NC}"
    
else
    echo -e "${YELLOW}Modo SMTP - Código enviado para: $EMAIL_TEST${NC}"
    echo -e "${YELLOW}⚠️  Verifique o inbox (ou pasta de spam)${NC}"
    echo -e "${YELLOW}Cole o código abaixo para continuar o teste:${NC}"
    read -p "Código: " CODE
fi

echo ""

# ===== TESTAR VERIFICAÇÃO =====
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}✓ VERIFICANDO EMAIL...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\":$USER_ID,
    \"code\":\"$CODE\"
  }")

echo "Resposta verificação: $VERIFY_RESPONSE"
echo ""

if echo "$VERIFY_RESPONSE" | grep -q "sucesso\|success\|verified"; then
    echo -e "${GREEN}✓ Email verificado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro na verificação${NC}"
    exit 1
fi

echo ""

# ===== TESTAR LOGIN =====
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🔑 TESTANDO LOGIN...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL_TEST\",
    \"password\":\"$PASSWORD\"
  }")

echo "Resposta login: $LOGIN_RESPONSE"
echo ""

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Token não recebido${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login bem-sucedido!${NC}"
echo -e "${GREEN}Token: ${TOKEN:0:20}...${NC}"
echo ""

# ===== RESUMO FINAL =====
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ TESTE COMPLETADO COM SUCESSO!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Resumo:"
echo "  Email: $EMAIL_TEST"
echo "  User ID: $USER_ID"
echo "  Código: $CODE"
echo "  Token: ${TOKEN:0:20}..."
echo "  Modo: $SMTP_STATUS"
echo ""
echo "Próximos passos:"
echo "  1. Abra http://localhost:8000/dashboard"
echo "  2. Faça login com: $EMAIL_TEST / $PASSWORD"
echo "  3. Explore o sistema"
echo ""
