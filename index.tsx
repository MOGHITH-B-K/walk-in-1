
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const errorMsg = "Critical: Root element '#root' not found.";
  console.error(errorMsg);
  document.body.innerHTML = `<div style="padding: 20px; color: red;">${errorMsg}</div>`;
} else {
  try {
    console.log("React 19: Starting boot sequence...");
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React 19: Root render initialized.");
  } catch (error) {
    console.error("React 19: Mounting Error", error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #ef4444;">
        <h1 style="font-weight: bold; margin-bottom: 1rem;">Mounting Error</h1>
        <p style="margin-bottom: 1rem;">The application failed to initialize properly.</p>
        <pre style="text-align: left; background: #f1f5f9; padding: 1rem; font-size: 0.75rem; border-radius: 0.5rem; overflow: auto;">
          ${error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    `;
  }
}
