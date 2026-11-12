import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--outer-shell-bg, #050508)',
          color: 'var(--text-primary, #F8FAFC)',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent-gradient, linear-gradient(135deg, #3B82F6 0%, #2DD4BF 100%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px var(--accent-glow, rgba(59, 130, 246, 0.35))',
          }}
        >
          <Sparkles size={24} color="#FFFFFF" className="spin" />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
          Authenticating BidKaro Workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
