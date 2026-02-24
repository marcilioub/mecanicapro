import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import './index.css';

// Importação dos provedores de contexto
import { AuthProvider } from "./components/AuthContext";
import { ThemeProvider } from "./components/ThemeContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento root não encontrado no index.html.");
}

// 1. Configuramos as rotas aqui. O "*" captura todas as rotas e manda para o App.
const router = createBrowserRouter([
  {
    path: "*",
    element: <App />,
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }
});

try {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          {/* 2. O RouterProvider deve ser o contexto que envolve o App */}
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );

  console.log("🚀 MecânicaPro inicializado com sucesso.");
} catch (error: any) {
  console.error("❌ Erro crítico na inicialização do React:", error);
  rootElement.innerHTML = `<div style="padding:40px; font-family: sans-serif;">Error: ${error.message}</div>`;
}

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW: Registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.error('SW: Falha no registro:', error);
      });
  });
}