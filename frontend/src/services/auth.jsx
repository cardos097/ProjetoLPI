import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

export async function loginRequest({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });

  const token = data.token || data.access_token;
  const userId = data.userId || data.user_id || data.id;
  const role = data.role || data.user?.role;
  const name = data.name || data.user?.name || email;
  const tipo = data.tipo || data.user?.tipo;
  const areaClinicaId = data.area_clinica_id || data.areaClinicaID || null;

  if (!token || !userId || !role) {
    throw new Error('Resposta de login inválida (faltam token/userId/role)');
  }

  return {
    token,
    user: {
      id: Number(userId),
      role,
      name,
      email: data.email,
      tipo,
      area_clinica_id: areaClinicaId,
    },
  };
}

export async function loginWithGoogle(idToken) {
  if (!idToken) {
    throw new Error('ID Token do Google obrigatório');
  }

  const { data } = await api.post('/auth/google/callback', {
    id_token: idToken,
  });

  const token = data.token || data.access_token;
  const userId = data.userId || data.user_id || data.id;
  const role = data.role || data.user?.role;
  const name = data.name || data.user?.name;
  const tipo = data.tipo || data.user?.tipo;
  const areaClinicaId = data.area_clinica_id || data.areaClinicaID || null;

  if (!token || !userId || !role) {
    throw new Error('Resposta de login Google inválida (faltam token/userId/role)');
  }

  return {
    token,
    user: {
      id: Number(userId),
      role,
      name,
      email: data.email,
      tipo,
      area_clinica_id: areaClinicaId,
    },
  };
}

export async function registerRequest({ email, password, confirm_password, nome_completo }) {
  const { data } = await api.post('/auth/register', {
    email,
    password,
    confirm_password,
    nome_completo,
  });

  const token = data.token || data.access_token;
  const userId = data.user_id || data.userId || data.id;
  const role = data.role || 'utente';

  if (!token || !userId) {
    throw new Error('Resposta de registo inválida (faltam token/userId)');
  }

  return {
    token,
    user: {
      id: Number(userId),
      role,
      name: nome_completo,
      email,
    },
  };
}