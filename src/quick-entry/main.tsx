import React from 'react';
import ReactDOM from 'react-dom/client';
import { QuickEntry } from './QuickEntry';
import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('quick-entry-root')!).render(
  <React.StrictMode>
    <QuickEntry />
  </React.StrictMode>
);
