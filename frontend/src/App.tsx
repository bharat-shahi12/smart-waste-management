import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import UserLayout from './layouts/UserLayout';
import ResponderLayout from './layouts/ResponderLayout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DustbinMapPage from './pages/DustbinMapPage';
import AdminComplaints from './pages/AdminComplaints';
import AdminPickupRequests from './pages/AdminPickupRequests';
import RegisterPage from './pages/RegisterPage';
import AuthorityDashboard from './pages/authority/AuthorityDashboard';

import UserDashboard from './pages/user/UserDashboard';
import UserLiveMap from './pages/user/UserLiveMap';
import UserDustbinDetails from './pages/user/UserDustbinDetails';
import UserReportIssue from './pages/user/UserReportIssue';
import UserPickupRequests from './pages/user/UserPickupRequests';
import UserAiDetection from './pages/user/UserAiDetection';
import UserComplaints from './pages/user/UserComplaints';
import UserAnalytics from './pages/user/UserAnalytics';
import UserProfile from './pages/user/UserProfile';
import UserAlerts from './pages/user/UserAlerts';
import UserRewards from './pages/user/UserRewards';
import UserSuggestions from './pages/user/UserSuggestions';
import UserImpact from './pages/user/UserImpact';
import PlaceholderPage from './pages/user/PlaceholderPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import ResponderDashboard from './pages/responder/ResponderDashboard';
import ResponderAssignments from './pages/responder/ResponderAssignments';
import ResponderMap from './pages/responder/ResponderMap';
import ResponderProfile from './pages/responder/ResponderProfile';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      
      {/* Dynamic Root Redirect based on Role */}
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === 'USER' ? <Navigate to="/user/dashboard" replace /> : 
           user?.role === 'COLLECTOR' ? <Navigate to="/responder/dashboard" replace /> : 
           user?.role === 'AUTHORITY' ? <Navigate to="/authority/dashboard" replace /> : 
           <Navigate to="/admin/dashboard" replace />}
        </ProtectedRoute>
      } />

      {/* Admin/Staff Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="map" element={<DustbinMapPage />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="pickups" element={<AdminPickupRequests />} />
      </Route>

      {/* Authority Routes */}
      <Route path="/authority" element={<ProtectedRoute roles={['AUTHORITY']}><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AuthorityDashboard />} />
        <Route path="map" element={<DustbinMapPage />} />
      </Route>

      <Route path="/responder" element={<ProtectedRoute roles={['COLLECTOR']}><ResponderLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ResponderDashboard />} />
        <Route path="assignments" element={<ResponderAssignments />} />
        <Route path="map" element={<ResponderMap />} />
        <Route path="complaints" element={<ResponderAssignments />} />
        <Route path="pickups" element={<ResponderAssignments />} />
        <Route path="bin-alerts" element={<ResponderAssignments />} />
        <Route path="notifications" element={<PlaceholderPage title="Responder Notifications" />} />
        <Route path="history" element={<ResponderAssignments />} />
        <Route path="profile" element={<ResponderProfile />} />
      </Route>

      {/* Citizen/User Routes */}
      <Route path="/user" element={<ProtectedRoute roles={['USER', 'ADMIN', 'AUTHORITY']}><UserLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="bins" element={<PlaceholderPage title="Smart Bins" />} />
        <Route path="map" element={<UserLiveMap />} />
        <Route path="ai-detection" element={<UserAiDetection />} />
        <Route path="pickup" element={<UserPickupRequests />} />
        <Route path="analytics" element={<UserAnalytics />} />
        <Route path="suggestions" element={<UserSuggestions />} />
        <Route path="alerts" element={<UserAlerts />} />
        <Route path="rewards" element={<UserRewards />} />
        <Route path="impact" element={<UserImpact />} />
        <Route path="profile" element={<UserProfile />} />
        
        {/* Legacy Routes kept for safety */}
        <Route path="dustbins/:id" element={<UserDustbinDetails />} />
        <Route path="report" element={<UserReportIssue />} />
        <Route path="complaints" element={<UserComplaints />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
