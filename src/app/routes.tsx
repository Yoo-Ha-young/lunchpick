import React from 'react';
import { createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import Room from './pages/Room';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminSeed from './pages/AdminSeed';

export const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/room/:roomId', element: <Room /> },
  { path: '/seed', element: <AdminSeed /> },
  { path: '*', element: <NotFound /> },
]);
