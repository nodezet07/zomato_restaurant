import { apiFetch } from '@/lib/api';
import type { ApiResponse, MenuAddon, MenuCategory, MenuCombo, MenuItem } from '@/types/api';

export type MenuItemInput = {
  restaurantId: string;
  categoryId: string;
  itemName: string;
  description?: string;
  shortDescription?: string;
  price: number;
  discountedPrice?: number;
  foodType: 'veg' | 'nonveg' | 'egg';
  isRecommended?: boolean;
  images?: string[];
  addons?: MenuAddon[];
  spiceLevel?: 'low' | 'medium' | 'high';
  preparationTimeMinutes?: number;
  ingredients?: string[];
};

export type MenuItemUpdate = Partial<
  Omit<MenuItemInput, 'restaurantId' | 'categoryId'>
>;

export async function fetchMenuCategories(restaurantId: string) {
  const body = await apiFetch<
    ApiResponse<{ categories: MenuCategory[]; uncategorized?: MenuItem[] }>
  >(`/menu/categories/${restaurantId}`);
  return body.data;
}

export async function fetchMenuItems(restaurantId: string) {
  const body = await apiFetch<ApiResponse<{ items: MenuItem[] }>>(
    `/menu/items/${restaurantId}`,
  );
  return body.data.items ?? [];
}

export async function fetchMenuCombos(restaurantId: string) {
  const body = await apiFetch<ApiResponse<{ combos: MenuCombo[] }>>(
    `/menu/items/combos/${restaurantId}`,
  );
  return body.data.combos ?? [];
}

export async function fetchOwnerCombos(restaurantId: string) {
  const body = await apiFetch<ApiResponse<{ combos: MenuCombo[] }>>(
    `/menu/combos/${restaurantId}`,
  );
  return body.data.combos ?? [];
}

export type MenuComboInput = {
  restaurantId: string;
  title: string;
  tag?: string;
  image?: string;
  price: number;
  foodType: 'veg' | 'nonveg' | 'egg';
  items: Array<{ menuItemId: string; quantity: number }>;
  mainItemId: string;
  sortOrder?: number;
  isAvailable?: boolean;
};

export async function createMenuCombo(payload: MenuComboInput) {
  const body = await apiFetch<ApiResponse<{ combo: MenuCombo }>>('/menu/combos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data.combo;
}

export async function updateMenuCombo(comboId: string, payload: Partial<Omit<MenuComboInput, 'restaurantId'>>) {
  const body = await apiFetch<ApiResponse<{ combo: MenuCombo }>>(`/menu/combos/${comboId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return body.data.combo;
}

export async function deleteMenuCombo(comboId: string) {
  await apiFetch<ApiResponse<unknown>>(`/menu/combos/${comboId}`, { method: 'DELETE' });
}

export async function createMenuCategory(payload: {
  restaurantId: string;
  categoryName: string;
  sortOrder?: number;
}) {
  const body = await apiFetch<ApiResponse<{ category: MenuCategory }>>('/menu/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data.category;
}

export async function updateMenuCategory(
  categoryId: string,
  payload: { categoryName?: string; sortOrder?: number; isActive?: boolean },
) {
  const body = await apiFetch<ApiResponse<{ category: MenuCategory }>>(
    `/menu/categories/${categoryId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
  return body.data.category;
}

export async function deleteMenuCategory(categoryId: string) {
  await apiFetch<ApiResponse<unknown>>(`/menu/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function createMenuItem(payload: MenuItemInput) {
  const body = await apiFetch<ApiResponse<{ item: MenuItem }>>('/menu/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data.item;
}

export async function toggleMenuItemAvailability(itemId: string, isAvailable: boolean) {
  const body = await apiFetch<ApiResponse<{ item: MenuItem }>>(
    `/menu/items/availability/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    },
  );
  return body.data.item;
}

export async function updateMenuItem(itemId: string, payload: MenuItemUpdate) {
  const body = await apiFetch<ApiResponse<{ item: MenuItem }>>(`/menu/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return body.data.item;
}

export async function deleteMenuItem(itemId: string) {
  await apiFetch<ApiResponse<unknown>>(`/menu/items/${itemId}`, { method: 'DELETE' });
}
