import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { CardProvider } from './store/CardContext';
import { InventoryProvider } from './store/InventoryContext';
import { App } from './App';
import './i18n';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <CardProvider>
          <InventoryProvider>
            <App />
          </InventoryProvider>
        </CardProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
