import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startDemo } from './sim/demo';
import './styles.css';

// `?demo` in the URL opens the dashboard straight in demo mode (handy to share a preview).
if (new URLSearchParams(window.location.search).has('demo')) startDemo();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
