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
  priceDisplay: number | null;
  packSize: number;
  displaySize: number | null;
  descDe: string;
  descEn: string;
  featured: boolean;
}

export interface AdminSetRow {
  name: string;
  code: string;
  type: string;
  wave: number;
  active: boolean;
  release_date: string | null;
  product_type: string;
  price_pack: number;
  price_display: number | null;
  pack_size: number;
  display_size: number | null;
  desc_de: string;
  desc_en: string;
  featured: boolean;
  sort_order: number;
  shop_visible: boolean;
  showcase_card_ids: number[] | null;
  showcase_animated: boolean;
  display_showcase_card_ids: number[] | null;
  display_showcase_animated: boolean;
  game_release_date: string | null;
  card_count: number;
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
