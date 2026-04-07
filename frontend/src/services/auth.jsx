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

  if (!token || !userId || !role) {
    throw new Error('Resposta de login inválida (faltam token/userId/role)');
  }

  return {
    token,
    user: {
      id: Number(userId),
      role,
      name,
    },
  };
}