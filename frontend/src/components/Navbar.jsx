import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [consultasDropdownOpen, setConsultasDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <img src="/images/ufp-logo.png" alt="Logo Clínica" className="navbar-logo-img" />
            <span className="navbar-logo-text">Clínica Universitária</span>
          </a>
        </div>

        {/* Menu Center */}
        {user && (
          <div className="navbar-menu">
            <button onClick={() => navigate('/')} className="navbar-link">
              Início
            </button>

            {/* Dropdown Consultas */}
            <div className="navbar-dropdown">
              <button
                className="navbar-link dropdown-toggle"
                onClick={() => setConsultasDropdownOpen(!consultasDropdownOpen)}
                onBlur={() => setTimeout(() => setConsultasDropdownOpen(false), 200)}
              >
                Consultas
                <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {consultasDropdownOpen && (
                <div className="dropdown-menu">
                  <a
                    href="/consultas"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/consultas');
                      setConsultasDropdownOpen(false);
                    }}
                  >
                    Ver Consultas
                  </a>
                  <a
                    href="/calendario"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/calendario');
                      setConsultasDropdownOpen(false);
                    }}
                  >
                    📅 Calendário
                  </a>
                  <a
                    href="/consultas/nova"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/consultas/nova');
                      setConsultasDropdownOpen(false);
                    }}
                  >
                    ➕ Marcar Consulta
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Area */}
        <div className="navbar-user">
          {user ? (
            <div className="navbar-dropdown user-dropdown">
              <button
                className="navbar-link user-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
              >
                <span className="user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                <span className="user-name">{user?.name || 'Utilizador'}</span>
                <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="dropdown-menu user-menu">
                  <a
                    href="/perfil"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/user');
                      setUserDropdownOpen(false);
                    }}
                  >
                    Perfil
                  </a>
                  <button
                    className="dropdown-item logout-item"
                    onClick={() => {
                      handleLogout();
                      setUserDropdownOpen(false);
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="navbar-login-btn">
              Iniciar sessão
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
