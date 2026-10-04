import React from 'react';
import { createRoot } from 'react-dom/client';
import InvisFieldingLandingPage from './InvisFieldingLandingPage.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><InvisFieldingLandingPage signupEndpoint={import.meta.env.VITE_SIGNUP_ENDPOINT} /></React.StrictMode>,
);
