import { createBrowserRouter, Navigate } from 'react-router';
import { MainLayout } from './components/cdsv/MainLayout';
import { Login } from './components/cdsv/Login';
import { Register } from './components/cdsv/Register';
import { Dashboard } from './components/cdsv/Dashboard';
import { FileUpload } from './components/cdsv/FileUpload';
import { DataFlow } from './components/cdsv/DataFlow';
import { AttackSimulation } from './components/cdsv/AttackSimulation';
import { AISecurityAnalysis } from './components/cdsv/AISecurityAnalysis';
import { ActivityLogs } from './components/cdsv/ActivityLogs';
import { Settings } from './components/cdsv/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/upload',
        element: <FileUpload />,
      },
      {
        path: '/dataflow',
        element: <DataFlow />,
      },
      {
        path: '/attack',
        element: <AttackSimulation />,
      },
      {
        path: '/ai',
        element: <AISecurityAnalysis />,
      },
      {
        path: '/logs',
        element: <ActivityLogs />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);