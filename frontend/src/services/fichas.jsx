import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      config.headers['X-User-ID'] = user.id;
      config.headers['X-User-Role'] = user.role;
    } catch (error) {
      console.error('Erro ao parsear user do localStorage', error);
    }
  }

  return config;
});

export async function getFichasAvaliacao(utenteId) {
  const { data } = await api.get('/fichas-avaliacao', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function createFichaAvaliacao(ficha) {
  const { data } = await api.post('/fichas-avaliacao', ficha);
  return data;
}

export async function getFichasPsicologia(utenteId) {
  const { data } = await api.get('/fichas-psicologia', {
    params: utenteId ? { utente_id: utenteId } : undefined,
  });
  return data;
}

export async function getFichaPsicologiaByID(fichaId) {
  const { data } = await api.get(`/fichas-psicologia/${fichaId}`);
  return data;
}

export async function createFichaPsicologia(ficha) {
  const { data } = await api.post('/fichas-psicologia', ficha);
  return data;
}

export async function updateFichaPsicologia(fichaId, ficha) {
  const { data } = await api.patch(`/fichas-psicologia/${fichaId}`, ficha);
  return data;
}

export async function deleteFichaPsicologia(fichaId) {
  const { data } = await api.delete(`/fichas-psicologia/${fichaId}`);
  return data;
}