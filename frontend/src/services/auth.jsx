import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackendReady(timeoutMs = 70000, intervalMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await api.get('/health');
      if (response?.status === 200) {
        return true;
      }
    } catch {
      // ignorar e voltar a tentar
    }

    await sleep(intervalMs);
  }

  return false;
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
  const ready = await waitForBackendReady();

  if (!ready) {
    throw new Error('O servidor está a demorar a acordar. Tenta novamente em alguns segundos.');
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      return buildSession(data, email);
    } catch (err) {
      if (!shouldRetry(err) || attempt === 1) {
        throw err;
      }

      const wokeUp = await waitForBackendReady(40000, 4000);
      if (!wokeUp) {
        throw new Error('O servidor continua indisponível. Tenta novamente daqui a pouco.');
      }
    }
  }
}

export async function loginWithGoogle(idToken) {
  if (!idToken) {
    throw new Error('ID Token do Google obrigatório');
  }

  const ready = await waitForBackendReady();

  if (!ready) {
    throw new Error('O servidor está a demorar a acordar. Tenta novamente em alguns segundos.');
  }

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

      const wokeUp = await waitForBackendReady(40000, 4000);
      if (!wokeUp) {
        throw new Error('O servidor continua indisponível. Tenta novamente daqui a pouco.');
      }
    }
  }
}

export async function registerRequest({ email, password, confirm_password, nome_completo }) {
  const ready = await waitForBackendReady();

  if (!ready) {
    throw new Error('O servidor está a demorar a acordar. Tenta novamente em alguns segundos.');
  }

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