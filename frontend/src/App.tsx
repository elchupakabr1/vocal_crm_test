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

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Calendar />} />
              <Route path="students" element={<Students />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="settings" element={<Settings />} />
              <Route path="finance" element={<Finance />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 