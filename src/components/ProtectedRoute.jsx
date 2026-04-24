import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  agent: '/agent/dashboard',
  worker: '/worker/dashboard',
  'special-agent': '/special-agent/dashboard',
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto mb-4" />
          <p className="text-[#A0A0A0]">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    const homePath = ROLE_HOME[role] || '/login';
    if (location.pathname === homePath) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-red-500">
          Accès refusé
        </div>
      );
    }
    return <Navigate to={homePath} replace />;
  }

  return children;
};

export default ProtectedRoute;