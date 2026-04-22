import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wakeBackend() {
  try {
    await api.get('/health');
  } catch {
    // serve apenas para acordar o backend no Render Free
  }
}

function buildSession(data, fallbackEmail) {
  const token = data.token || data.access_token;
  const userId = data.userId || data.user_id || data.id;
  const role = data.role || data.user?.role;
  const name = data.name || data.user?.name || fallbackEmail;
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
      email: data.email || fallbackEmail,
      tipo,
      area_clinica_id: areaClinicaId,
    },
  };
}

function shouldRetry(err) {
  const status = err?.response?.status;
  const renderRouting = err?.response?.headers?.['x-render-routing'];
  return status === 404 || renderRouting === 'no-server';
}

export async function loginRequest({ email, password }) {
  await wakeBackend();
  await sleep(5000);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      return buildSession(data, email);
    } catch (err) {
      if (!shouldRetry(err) || attempt === 1) {
        throw err;
      }

      await sleep(6000);
      await wakeBackend();
      await sleep(4000);
    }
  }
}

export async function loginWithGoogle(idToken) {
  if (!idToken) {
    throw new Error('ID Token do Google obrigatório');
  }

  await wakeBackend();
  await sleep(3000);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await api.post('/auth/google/callback', {
        id_token: idToken,
      });
      return buildSession(data);
    } catch (err) {
      if (!shouldRetry(err) || attempt === 1) {
        throw err;
      }

      await sleep(6000);
      await wakeBackend();
      await sleep(4000);
    }
  }
}

export async function registerRequest({ email, password, confirm_password, nome_completo }) {
  await wakeBackend();
  await sleep(3000);

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