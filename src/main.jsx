import React from 'react';
import { createRoot } from 'react-dom/client';
import ShieldLandingPage from './ShieldLandingPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><ShieldLandingPage signupEndpoint={import.meta.env.VITE_SIGNUP_ENDPOINT} /></React.StrictMode>,
);
