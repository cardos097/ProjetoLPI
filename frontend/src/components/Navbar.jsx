import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>Clínica Platform</h2>
        </div>

        {user && (
          <div className="navbar-menu">
            <button onClick={() => navigate('/')} className="nav-link">
              Início
            </button>
            <button onClick={() => navigate('/utentes')} className="nav-link">
              Utentes
            </button>
            <button onClick={() => navigate('/consultas')} className="nav-link">
              Consultas
            </button>
            <button onClick={() => navigate('/user')} className="nav-link">
              Perfil
            </button>
          </div>
        )}

        <div className="navbar-user">
          {user ? (
            <>
              <span className="user-info">
                {user?.name || 'Utilizador'}
              </span>
              <button onClick={handleLogout} className="logout-btn">
                Sair
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="logout-btn">
              Iniciar sessão
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
