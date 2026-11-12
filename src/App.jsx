import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BidKaroStoreProvider } from './context/BidKaroStoreContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { Auth } from './pages/Auth';
import { Workspace } from './pages/Workspace';
import { Dashboard } from './pages/Dashboard';
import { CompanyVault } from './pages/CompanyVault';
import { Settings } from './pages/Settings';
import { GuestTrial } from './pages/GuestTrial';
import { Admin } from './pages/Admin';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BidKaro UI ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-canvas)',
            padding: 24,
          }}
        >
          <div className="surface-card" style={{ maxWidth: 460, width: '100%', textAlign: 'center', padding: '36px 28px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Unexpected View Error</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {this.state.error?.message || 'A client-side error occurred.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BidKaroStoreProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Landing & Marketing Route */}
                <Route path="/" element={<LandingPage />} />

                {/* Guest Free Trial — no auth required */}
                <Route path="/try" element={<GuestTrial />} />

                {/* Public Auth Routes */}
                <Route path="/login" element={<Auth defaultMode="login" />} />
                <Route path="/signup" element={<Auth defaultMode="register" />} />
                <Route path="/register" element={<Navigate to="/signup" replace />} />

                {/* Protected Workspace Frame */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <Routes>
                          {/* 1. Tender Copilot Workspace */}
                          <Route path="/workspace" element={<Workspace />} />
                          <Route path="/workspace/:tenderId" element={<Workspace />} />
                          <Route path="/app" element={<Navigate to="/workspace" replace />} />

                          {/* 2. My Tenders Dashboard */}
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/tenders" element={<Navigate to="/dashboard" replace />} />

                          {/* 3. Company Qualification Vault */}
                          <Route path="/vault" element={<CompanyVault />} />
                          <Route path="/profile" element={<Navigate to="/vault" replace />} />

                          {/* 4. Plans & Credits Settings */}
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/plans" element={<Navigate to="/settings" replace />} />

                          {/* 5. Enterprise Admin Operations */}
                          <Route path="/admin" element={<Admin />} />

                          {/* Fallback */}
                          <Route path="*" element={<Navigate to="/workspace" replace />} />
                        </Routes>
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>

          </BidKaroStoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
