/**
 * Type definitions for admin API responses.
 */

export interface AdminStats {
  totalUsers: number;
  totalCards: number;
  activeSets: number;
  totalDp: number;
  recentUsers7d: number;
}

export interface AdminSet {
  setName: string;
  code: string;
  wave: number;
  active: boolean;
  cardCount: number;
  productType: string;
  pricePack: number;
  packSize: number;
  descDe: string;
  descEn: string;
  featured: boolean;
}

export interface AdminSetRow {
  name: string;
  code: string;
  type: string;
  wave: number;
  shop_active: boolean;      // shop_set_config.shop_active — purchasable in shop
  og_release_date: string | null;
  product_type: string;
  price_pack: number;
  pack_size: number;
  desc_de: string;
  desc_en: string;
  featured: boolean;
  sort_order: number;
  shop_visible: boolean;
  showcase_card_ids: number[] | null;
  showcase_animated: boolean;
  ig_release_date: string | null;
  is_event: boolean;
  card_count: number;
  next_release_start: string | null;
  active_window_end: string | null;
}

export interface AdminDisplayRow {
  id: number;
  name: string;
  code: string | null;
  price: number;
  desc_de: string | null;
  desc_en: string | null;
  showcase_card_ids: number[] | null;
  showcase_animated: boolean;
  og_release_date: string | null;
  ig_release_date: string | null;
  is_event: boolean;
  shop_active: boolean;      // shop_displays.shop_active — purchasable in shop
  shop_visible: boolean;
  wave: number;
  sort_order: number;
  total_packs: number;
  card_count: number;
  created_at: string;
  next_release_start: string | null;
  active_window_end: string | null;
  contents: { boosterSetName: string; packCount: number; cardCount?: number }[];
}

export interface RarityRate {
  rarity: string;
  ratePct: number;
}

export interface AdminNews {
  id: number;
  slug: string;
  dateLabel: string;
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  contentDe: string;
  contentEn: string;
  imagePath: string | null;
  published: boolean;
}

export interface AdminRoadmap {
  id: number;
  slug: string;
  phaseLabel: string;
  titleDe: string;
  titleEn: string;
  descDe: string;
  descEn: string;
  status: string;
  sortOrder: number;
}

export interface AdminUser {
  id: number;
  username: string;
  tag: string;
  email: string;
  role: string;
  dp: number;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface AdminCosmetic {
  id: number;
  itemType: string;
  itemId: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  price: number;
  previewData: string | null;
  available: boolean;
}

export interface ReleaseWindow {
  id: number;
  product_type: string;
  product_id: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface AdminCardRow {
  id: number;
  name_de: string;
  name_en: string;
  desc_de: string;
  desc_en: string;
  frame_type: string;
  atk: number | null;
  def: number | null;
  level: number | null;
  attribute: string | null;
  race_de: string;
  race_en: string;
  archetype: string | null;
  image_path: string;
  default_artwork_id: number | null;
  ban_status: string | null;
  rarity: string | null;
  rarity_code: string | null;
}

export interface AdminCardPage {
  cards: AdminCardRow[];
  total: number;
  page: number;
  limit: number;
}

export interface SetCardRow {
  id: number;
  name_de: string;
  name_en: string;
  desc_de: string;
  desc_en: string;
  frame_type: string;
  rarity: string;
  rarity_code: string;
  artwork_id: number | null;
  quantity: number;
  atk: number | null;
  def: number | null;
  level: number | null;
  attribute: string | null;
  race_de: string | null;
  race_en: string | null;
  archetype: string | null;
  image_path: string | null;
  ban_status: string | null;
}
