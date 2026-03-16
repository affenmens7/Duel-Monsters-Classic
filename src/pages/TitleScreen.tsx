import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { useCards } from '../hooks/useCards';
import { FloatingCards } from '../components/common/FloatingCards';
import { loginUser, registerUser } from '../services/authApi';
import { APP_VERSION } from '../config/version';
import styles from './TitleScreen.module.css';

type FormMode = 'start' | 'login' | 'register';

export function TitleScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { cards } = useCards();

  const [mode, setMode] = useState<FormMode>(user ? 'start' : 'start');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fading, setFading] = useState(false);

  function transitionToApp() {
    setFading(true);
    setTimeout(() => navigate('/app'), 600);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUser(username, password);
      login(result.token, result.user);
      transitionToApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await registerUser(username, email, password);
      login(result.token, result.user);
      transitionToApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  // Already logged in — show continue button
  if (user && mode === 'start') {
    return (
      <div className={`${styles.screen} ${fading ? styles.fadeOut : ''}`}>
        <FloatingCards cards={cards} count={60} />
        <div className={styles.content}>
          <div className={styles.titleBlock}>
            <div className={styles.logoMark}>DMC</div>
            <h1 className={styles.title}>{t('title.gameName')}</h1>
            <div className={styles.subtitle}>{t('title.subtitle')}</div>
          </div>
          <p className={styles.flavor}>{t('title.flavor')}</p>
          <div className={`${styles.actions} ${styles.panel}`}>
            <button className={styles.primaryBtn} onClick={transitionToApp}>
              Fortsetzen als {user.displayName}
            </button>
          </div>
          <div className={styles.footer}>
            <span className={styles.version}>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} ${fading ? styles.fadeOut : ''}`}>
      <FloatingCards cards={cards} count={60} />

      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <div className={styles.logoMark}>DMC</div>
          <h1 className={styles.title}>{t('title.gameName')}</h1>
          <div className={styles.subtitle}>{t('title.subtitle')}</div>
          <div className={styles.tagline}>{t('title.tagline')}</div>
        </div>

        <p className={styles.flavor}>{t('title.flavor')}</p>

        <div className={styles.panelWrapper}>
          <div className={styles.panelInner} key={mode}>
            {mode === 'start' && (
              <div className={styles.actions}>
                <button className={styles.primaryBtn} onClick={() => setMode('login')}>
                  {t('title.login')}
                </button>
                <button className={styles.secondaryBtn} onClick={() => setMode('register')}>
                  Registrieren
                </button>
                <button className={styles.linkBtn} onClick={transitionToApp}>
                  {t('title.guestEnter')}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <form className={styles.loginForm} onSubmit={handleLogin}>
                {error && <div className={styles.error}>{error}</div>}
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('title.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
                <input
                  type="password"
                  className={styles.input}
                  placeholder={t('title.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? '...' : t('title.enter')}
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => { setMode('start'); setError(''); }}>
                  {t('title.back')}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form className={styles.loginForm} onSubmit={handleRegister}>
                {error && <div className={styles.error}>{error}</div>}
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('title.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
                <input
                  type="email"
                  className={styles.input}
                  placeholder="E-Mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  className={styles.input}
                  placeholder={t('title.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? '...' : 'Account erstellen'}
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => { setMode('start'); setError(''); }}>
                  {t('title.back')}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.langBtn}
            onClick={() => {
              const next = i18n.language === 'de' ? 'en' : 'de';
              i18n.changeLanguage(next);
              localStorage.setItem('dmc-language', next);
            }}
          >
            {i18n.language === 'de' ? 'EN' : 'DE'}
          </button>
          <span className={styles.separator}>.</span>
          <span className={styles.version}>v{APP_VERSION}</span>
          <span className={styles.separator}>.</span>
          <span className={styles.credit}>{t('title.credit')}</span>
        </div>
      </div>
    </div>
  );
}
