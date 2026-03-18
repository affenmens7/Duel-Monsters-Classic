import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { AppDataProvider } from './store/AppDataContext';
import { CardProvider } from './store/CardContext';
import { SessionProvider } from './store/SessionContext';
import { InventoryProvider } from './store/InventoryContext';
import { App } from './App';
import './i18n';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AppDataProvider>
          <CardProvider>
            <SessionProvider>
              <InventoryProvider>
                <App />
              </InventoryProvider>
            </SessionProvider>
          </CardProvider>
        </AppDataProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
