import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from '@/components/Login';
import Calendar from '@/components/Calendar';
import Settings from '@/components/Settings';
import Students from '@/pages/Students';
import Subscriptions from '@/pages/Subscriptions';
import Layout from '@/components/Layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Finance from '@/components/Finance';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Calendar />} />
              <Route path="students" element={<Students />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="settings" element={<Settings />} />
              <Route path="finance" element={<Finance />} />
            </Route>
          </Routes>
          <ToastContainer position="bottom-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 