/**
 * AdminDisplayDetailPage — manage which booster packs belong to a display.
 * Shows display info, lists assigned packs with pack count editing,
 * and provides a search panel to add new boosters.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import {
  fetchAdminDisplay,
  updateDisplay,
  searchBoosters,
  type AdminDisplayRow,
} from '../../services/admin';
import styles from './AdminSetDetail.module.css';

export function AdminDisplayDetailPage() {
  const { name: displayName } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = useAuth();
  const authToken = token ?? '';

  const [display, setDisplay] = useState<AdminDisplayRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search boosters to add
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; code: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPackCounts, setSearchPackCounts] = useState<Record<string, number>>({});
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const loadDisplay = useCallback(async () => {
    if (!authToken || !displayName) return;
    setLoading(true);
    try {
      const data = await fetchAdminDisplay(authToken, decodeURIComponent(displayName));
      setDisplay(data);
    } catch {
      setDisplay(null);
    } finally {
      setLoading(false);
    }
  }, [authToken, displayName]);

  useEffect(() => { loadDisplay(); }, [loadDisplay]);

  // Debounced booster search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchBoosters(authToken, searchQuery);
        // Filter out boosters already in this display
        const existingNames = new Set(display?.contents.map((c) => c.boosterSetName) ?? []);
        setSearchResults(results.filter((r) => !existingNames.has(r.name)));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [searchQuery, authToken, display?.contents]);

  const handleAddBooster = useCallback(async (boosterName: string) => {
    if (!display || !authToken) return;
    setSaving(true);
    try {
      const packCount = searchPackCounts[boosterName] ?? 24;
      const newContents = [...display.contents, { boosterSetName: boosterName, packCount }];
      await updateDisplay(authToken, display.id, { contents: newContents });
      await loadDisplay();
      setSearchQuery('');
      setSearchResults([]);
      setSearchPackCounts({});
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [display, authToken, loadDisplay, searchPackCounts]);

  const handleMoveBooster = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (!display || !authToken) return;
    const contents = [...display.contents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= contents.length) return;
    [contents[index], contents[targetIndex]] = [contents[targetIndex], contents[index]];
    setSaving(true);
    try {
      await updateDisplay(authToken, display.id, { contents });
      await loadDisplay();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [display, authToken, loadDisplay]);

  const handleRemoveBooster = useCallback(async (boosterName: string) => {
    if (!display || !authToken) return;
    setSaving(true);
    try {
      const newContents = display.contents.filter((c) => c.boosterSetName !== boosterName);
      await updateDisplay(authToken, display.id, { contents: newContents });
      await loadDisplay();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [display, authToken, loadDisplay]);

  // Local pack count edits (optimistic, saved on blur)
  const [localPackCounts, setLocalPackCounts] = useState<Record<string, number>>({});

  const handlePackCountLocal = useCallback((boosterName: string, packCount: number) => {
    setLocalPackCounts((prev) => ({ ...prev, [boosterName]: packCount }));
  }, []);

  const handlePackCountSave = useCallback(async (boosterName: string) => {
    if (!display || !authToken) return;
    const newCount = localPackCounts[boosterName];
    if (newCount === undefined) return;
    const original = display.contents.find((c) => c.boosterSetName === boosterName);
    if (original && original.packCount === newCount) return; // no change
    setSaving(true);
    try {
      const newContents = display.contents.map((c) =>
        c.boosterSetName === boosterName ? { ...c, packCount: newCount } : c
      );
      await updateDisplay(authToken, display.id, { contents: newContents });
      await loadDisplay();
    } catch { /* ignore */ }
    finally {
      setSaving(false);
      setLocalPackCounts((prev) => { const next = { ...prev }; delete next[boosterName]; return next; });
    }
  }, [display, authToken, loadDisplay, localPackCounts]);

  const handleToggleActive = useCallback(async () => {
    if (!display || !authToken) return;
    setSaving(true);
    try {
      await updateDisplay(authToken, display.id, { active: !display.active });
      await loadDisplay();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [display, authToken, loadDisplay]);

  if (loading) return <div className={styles.page}><p>{t('admin.loading')}</p></div>;
  if (!display) return <div className={styles.page}><p>Display not found</p></div>;

  return (
    <div className={styles.page}>
      {/* Back link */}
      <Link to="/app/admin/sets/display" className={styles.backLink}>
        &#8592; {t('admin.displays')}
      </Link>

      {/* Display info bar */}
      <div className={styles.setHeader}>
        <h1 className={styles.setName}>{display.name}</h1>
        <span className={styles.badge}>{display.price} DP</span>
        <span className={styles.badge}>Wave {display.wave}</span>
        <span className={styles.badge}>{display.total_packs} Packs</span>
        <span
          className={`${styles.badge} ${display.active ? styles.badgeActive : styles.badgeInactive}`}
          onClick={handleToggleActive}
          title={display.active ? t('admin.deactivate') : t('admin.activate')}
          style={{ cursor: 'pointer' }}
        >
          {display.active ? t('admin.statusActive') : t('admin.statusInactive')}
        </span>
      </div>

      {/* Add booster search */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('admin.addBooster')}</h2>
        <input
          className={styles.searchInput}
          type="text"
          placeholder={t('admin.searchBooster')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searching && <p className={styles.empty}>{t('admin.searching')}</p>}

        {searchResults.length > 0 && (
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th className={styles.cardTh}>{t('admin.boosterName')}</th>
                <th className={styles.cardTh}>{t('admin.packCount')}</th>
                <th className={styles.cardTh} />
              </tr>
            </thead>
            <tbody>
              {searchResults.map((r) => (
                <tr key={r.name}>
                  <td className={styles.cardTd}>{r.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>({r.code})</span></td>
                  <td className={styles.cardTd}>
                    <input
                      type="number"
                      min={1}
                      value={searchPackCounts[r.name] ?? 24}
                      onChange={(e) => setSearchPackCounts((prev) => ({ ...prev, [r.name]: parseInt(e.target.value, 10) || 1 }))}
                      className={styles.inlineNumber}
                    />
                  </td>
                  <td className={styles.cardTd}>
                    <button
                      className={styles.addBtn}
                      onClick={() => handleAddBooster(r.name)}
                      disabled={saving}
                    >
                      +
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contained boosters table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('shop.displayContents')} ({display.contents.length})</h2>

        {display.contents.length === 0 ? (
          <p className={styles.empty}>{t('admin.noDisplayContents')}</p>
        ) : (
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th className={styles.cardTh} style={{ width: '50px' }} />
                <th className={styles.cardTh}>{t('admin.boosterName')}</th>
                <th className={styles.cardTh}>{t('admin.packCount')}</th>
                <th className={styles.cardTh} />
              </tr>
            </thead>
            <tbody>
              {display.contents.map((content, idx) => (
                <tr key={content.boosterSetName}>
                  <td className={styles.cardTd}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => handleMoveBooster(idx, 'up')}
                      disabled={saving || idx === 0}
                      title="Move up"
                    >&#9650;</button>
                    <button
                      className={styles.sortBtn}
                      onClick={() => handleMoveBooster(idx, 'down')}
                      disabled={saving || idx === display.contents.length - 1}
                      title="Move down"
                    >&#9660;</button>
                  </td>
                  <td
                    className={styles.cardTd}
                    style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }}
                    onClick={() => navigate(`/app/admin/sets/booster/${encodeURIComponent(content.boosterSetName)}`)}
                  >
                    {content.boosterSetName}
                  </td>
                  <td className={styles.cardTd}>
                    <input
                      type="number"
                      min={1}
                      value={localPackCounts[content.boosterSetName] ?? content.packCount}
                      onChange={(e) => handlePackCountLocal(content.boosterSetName, parseInt(e.target.value, 10) || 1)}
                      onBlur={() => handlePackCountSave(content.boosterSetName)}
                      className={styles.inlineNumber}
                      disabled={saving}
                    />
                  </td>
                  <td className={styles.cardTd}>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemoveBooster(content.boosterSetName)}
                      disabled={saving}
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
