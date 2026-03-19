/**
 * AdminShopPage — manage the shop's featured section.
 * Admins can add/edit/delete/toggle/reorder featured items.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import {
  fetchFeaturedItems,
  createFeaturedItem,
  updateFeaturedItem,
  deleteFeaturedItem,
  type FeaturedItem,
} from '../../services/admin';
import { fetchShopProducts, type ShopSetProduct } from '../../services/shopApi';
import styles from './AdminShop.module.css';

interface FeaturedForm {
  product_type: string;
  product_id: string;
  title_de: string;
  title_en: string;
  subtitle_de: string;
  subtitle_en: string;
  active: boolean;
  sort_order: number;
}

const emptyForm: FeaturedForm = {
  product_type: 'booster',
  product_id: '',
  title_de: '',
  title_en: '',
  subtitle_de: '',
  subtitle_en: '',
  active: true,
  sort_order: 0,
};

export function AdminShopPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [products, setProducts] = useState<ShopSetProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FeaturedForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [featuredData, shopData] = await Promise.all([
        fetchFeaturedItems(token),
        fetchShopProducts(),
      ]);
      setItems(featuredData);
      setProducts([...shopData.boosters, ...shopData.starters]);
    } catch {
      setError(t('admin.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function openEdit(item: FeaturedItem) {
    setEditId(item.id);
    setForm({
      product_type: item.product_type,
      product_id: item.product_id,
      title_de: item.title_de,
      title_en: item.title_en ?? '',
      subtitle_de: item.subtitle_de ?? '',
      subtitle_en: item.subtitle_en ?? '',
      active: item.active,
      sort_order: item.sort_order,
    });
    setShowForm(true);
    setError('');
  }

  async function handleSave() {
    if (!token || !form.product_id || !form.title_de) {
      setError(t('admin.requiredFields'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateFeaturedItem(token, editId, form);
      } else {
        await createFeaturedItem(token, form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: FeaturedItem) {
    if (!token) return;
    try {
      await updateFeaturedItem(token, item.id, { active: !item.active });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, active: !i.active } : i));
    } catch {
      setError(t('admin.toggleFailed'));
    }
  }

  async function handleDelete(item: FeaturedItem) {
    if (!token) return;
    try {
      await deleteFeaturedItem(token, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      setError(t('admin.deleteFailed'));
    }
  }

  function handleProductSelect(productId: string) {
    const product = products.find((p) => p.setName === productId);
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      product_type: product?.productType ?? 'booster',
      title_de: prev.title_de || product?.setName || '',
      title_en: prev.title_en || product?.setName || '',
    }));
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>{t('admin.loading')}</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('admin.shopFeatured')}</h1>
        <button className={styles.addBtn} onClick={openNew}>{t('admin.addNew')}</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Featured Items Table */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colOrder}>#</span>
          <span className={styles.colProduct}>{t('admin.product')}</span>
          <span className={styles.colTitle}>{t('admin.titleDe')}</span>
          <span className={styles.colType}>{t('admin.type')}</span>
          <span className={styles.colActive}>{t('admin.active')}</span>
          <span className={styles.colActions}></span>
        </div>

        {items.length === 0 && (
          <div className={styles.emptyRow}>{t('admin.noFeaturedItems')}</div>
        )}

        {items.map((item) => (
          <div key={item.id} className={`${styles.tableRow} ${!item.active ? styles.rowInactive : ''}`}>
            <span className={styles.colOrder}>{item.sort_order}</span>
            <span className={styles.colProduct}>{item.product_id}</span>
            <span className={styles.colTitle}>{item.title_de}</span>
            <span className={styles.colType}>{item.product_type}</span>
            <span className={styles.colActive}>
              <button
                className={`${styles.toggleBtn} ${item.active ? styles.toggleOn : styles.toggleOff}`}
                onClick={() => handleToggle(item)}
              >
                {item.active ? t('admin.on') : t('admin.off')}
              </button>
            </span>
            <span className={styles.colActions}>
              <button className={styles.editBtn} onClick={() => openEdit(item)}>{t('admin.edit')}</button>
              <button className={styles.deleteBtn} onClick={() => handleDelete(item)}>{t('admin.delete')}</button>
            </span>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className={styles.formOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.formPanel} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>
              {editId ? t('admin.editFeatured') : t('admin.addFeatured')}
            </h2>

            <label className={styles.label}>{t('admin.product')}</label>
            <select
              className={styles.select}
              value={form.product_id}
              onChange={(e) => handleProductSelect(e.target.value)}
            >
              <option value="">{t('admin.selectProduct')}</option>
              {products.map((p) => (
                <option key={p.setName} value={p.setName}>
                  {p.setName} ({p.code}) — {p.productType ?? 'booster'}
                </option>
              ))}
            </select>

            <label className={styles.label}>{t('admin.titleDe')}</label>
            <input
              className={styles.input}
              value={form.title_de}
              onChange={(e) => setForm({ ...form, title_de: e.target.value })}
              placeholder={t('admin.titleDe')}
            />

            <label className={styles.label}>{t('admin.titleEn')}</label>
            <input
              className={styles.input}
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              placeholder={t('admin.titleEn')}
            />

            <label className={styles.label}>{t('admin.subtitleDe')}</label>
            <textarea
              className={styles.textarea}
              value={form.subtitle_de}
              onChange={(e) => setForm({ ...form, subtitle_de: e.target.value })}
              placeholder={t('admin.subtitleDe')}
              rows={2}
            />

            <label className={styles.label}>{t('admin.subtitleEn')}</label>
            <textarea
              className={styles.textarea}
              value={form.subtitle_en}
              onChange={(e) => setForm({ ...form, subtitle_en: e.target.value })}
              placeholder={t('admin.subtitleEn')}
              rows={2}
            />

            <div className={styles.formRow}>
              <div>
                <label className={styles.label}>{t('admin.sortOrder')}</label>
                <input
                  className={styles.inputSmall}
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className={styles.label}>{t('admin.active')}</label>
                <button
                  className={`${styles.toggleBtn} ${form.active ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => setForm({ ...form, active: !form.active })}
                >
                  {form.active ? t('admin.on') : t('admin.off')}
                </button>
              </div>
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('admin.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
