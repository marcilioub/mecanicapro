import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Contextos
import { AuthProvider } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';

// Estilos Globais (Certifique-se de que o caminho está correto)
import './index.css'; 

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

const root = ReactDOM.createRoot(rootElement);

/**
 * NOTA SOBRE PERFORMANCE:
 * O React.StrictMode renderiza os componentes duas vezes em desenvolvimento 
 * para detectar efeitos colaterais. Se o login estiver muito lento no seu
 * ambiente local, o culpado pode ser essa duplicidade de chamadas.
 */

try {
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("❌ Erro crítico na inicialização do MecânicaPro:", error);
  
  rootElement.innerHTML = `
    <div style="
      height: 100vh; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      font-family: system-ui, sans-serif; 
      background: #020617; 
      color: white; 
      text-align: center; 
      padding: 20px;
    ">
      <div style="background: rgba(225, 29, 72, 0.1); border: 1px solid #e11d48; padding: 32px; rounded-radius: 24px; max-width: 400px;">
        <h1 style="color: #fb7185; font-size: 24px; font-weight: 900; margin-bottom: 16px;">ERRO DE SISTEMA</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
          Não foi possível iniciar a interface operacional. Verifique sua conexão ou configurações de ambiente.
        </p>
        <button onclick="window.location.reload()" style="
          background: #e11d48; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 12px; 
          font-weight: bold; 
          cursor: pointer;
          width: 100%;
        ">
          RECARREGAR OPERAÇÃO
        </button>
      </div>
    </div>
  `;
}