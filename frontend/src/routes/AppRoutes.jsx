import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { UserPage } from '../pages/UserPage.jsx';
import { ListaUtentes } from '../pages/ListaUtentes.jsx';
import { CriarUtente } from '../pages/CriarUtente.jsx';
import { EditarUtente } from '../pages/EditarUtente.jsx';
import { ListaConsultas } from '../pages/ListaConsultas.jsx';
import { AgendarConsulta } from '../pages/AgendarConsulta.jsx';
import { EditarConsulta } from '../pages/EditarConsulta.jsx';
import { Layout } from '../components/Layout.jsx';
import { Navbar } from '../components/Navbar.jsx';

function PublicLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes"
        element={
          <ProtectedRoute>
            <ListaUtentes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes/novo"
        element={
          <ProtectedRoute>
            <CriarUtente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes/:id/editar"
        element={
          <ProtectedRoute>
            <EditarUtente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas"
        element={
          <ProtectedRoute>
            <ListaConsultas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas/nova"
        element={
          <ProtectedRoute>
            <AgendarConsulta />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas/:id/editar"
        element={
          <ProtectedRoute>
            <EditarConsulta />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}