import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

// Adiciona o token no header de cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Adicionar headers esperados pelo middleware
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      config.headers['X-User-ID'] = user.id;
      config.headers['X-User-Role'] = user.role;
    } catch (e) {
      console.error('Erro ao parsear user do localStorage', e);
    }
  }

  return config;
});

export async function getUtentes() {
  const { data } = await api.get('/utentes');
  return data;
}

export async function getUtenteDetails(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}`);
  return data;
}

export async function getUtenteConsultas(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}/consultas`);
  return data;
}

export async function getUtenteRegistos(utenteId) {
  const { data } = await api.get(`/utentes/${utenteId}/registos`);
  return data;
}

export async function createUtente(utente) {
  const { data } = await api.post('/utentes', utente);
  return data;
}

export async function updateUtente(utenteId, utente) {
  const { data } = await api.patch(`/utentes/${utenteId}`, utente);
  return data;
}

export async function deleteUtente(utenteId) {
  await api.delete(`/utentes/${utenteId}`);
}

export async function uploadAvatar(utenteId, file) {
  const formData = new FormData();
  formData.append('avatar', file);

  // NÃO especificar Content-Type - deixar que o axios determine automaticamente
  const { data } = await api.post(`/utentes/${utenteId}/avatar`, formData);

  return data;
}
