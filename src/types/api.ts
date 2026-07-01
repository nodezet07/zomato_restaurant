export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthUser = {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: string;
  profileImage?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type WeeklyHour = {
  day: string;
  open?: string;
  close?: string;
  isClosed?: boolean;
};

export type BankDetails = {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
};

export type RestaurantAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

export type Restaurant = {
  _id: string;
  restaurantName: string;
  slug: string;
  description?: string;
  logo?: string;
  bannerImages?: string[];
  phone?: string;
  email?: string;
  cuisines: string[];
  isOpen: boolean;
  restaurantStatus: string;
  averageRating?: number;
  totalRatings?: number;
  totalOrders?: number;
  openingTime?: string;
  closingTime?: string;
  weeklyHours?: WeeklyHour[];
  bankAccountDetails?: BankDetails;
  minimumOrderAmount?: number;
  packagingCharge?: number;
  deliveryRadiusKm?: number;
  averageDeliveryTime?: number;
  supportsCOD?: boolean;
  supportsOnlinePayment?: boolean;
  gstNumber?: string;
  fssaiLicense?: string;
  address?: RestaurantAddress;
  latitude?: number;
  longitude?: number;
};

export type OrderItem = {
  itemName: string;
  quantity: number;
  price: number;
  total: number;
  addons?: { name: string; price: number }[];
  specialInstructions?: string;
};

export type Order = {
  _id: string;
  orderNumber?: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  grandTotal: number;
  orderItems: OrderItem[];
  customerId?: { fullName?: string; mobile?: string };
  riderId?:
    | {
        _id?: string;
        riderCode?: string;
        fullName?: string;
        mobile?: string;
        userId?: { fullName?: string; mobile?: string };
      }
    | string;
  createdAt?: string;
  deliveryInstructions?: string;
  dontSendCutlery?: boolean;
  generalNote?: string;
  estimatedPreparationTime?: number;
  estimatedDeliveryTime?: string;
  deliveryAddress?: {
    addressLine?: string;
    city?: string;
    pincode?: string;
  };
};

export type MenuAddon = {
  name: string;
  price: number;
  isAvailable?: boolean;
};

export type MenuCategory = {
  _id: string;
  categoryName: string;
  sortOrder?: number;
  isActive?: boolean;
  items?: MenuItem[];
};

export type MenuItem = {
  _id: string;
  restaurantId: string;
  categoryId: string | { _id: string; categoryName?: string };
  itemName: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  discountedPrice?: number;
  foodType: 'veg' | 'nonveg' | 'egg';
  isAvailable: boolean;
  isRecommended?: boolean;
  images?: string[];
  addons?: MenuAddon[];
  spiceLevel?: 'low' | 'medium' | 'high';
  preparationTimeMinutes?: number;
  ingredients?: string[];
};

export type AvailableRider = {
  riderId: string;
  userId: string;
  fullName: string;
  mobile?: string;
  riderCode: string;
  vehicleType?: string;
  averageRating?: number;
};

export type OrderTrackPayload = {
  orderId: string;
  orderNumber?: string;
  orderStatus: string;
  paymentStatus?: string;
  riderLocation?: { latitude: number; longitude: number; heading?: number };
  liveLocation?: { latitude: number; longitude: number; heading?: number; speed?: number };
  restaurantLocation?: { latitude: number; longitude: number };
  deliveryLocation?: { latitude: number; longitude: number };
  etaMinutes?: number | null;
  timelineLogs?: Array<{ status: string; timestamp?: string }>;
  deliveredAt?: string;
  socketLive?: boolean;
};

export type MenuComboItemRef = {
  menuItemId: string | MenuItem;
  quantity: number;
};

export type MenuCombo = {
  _id?: string;
  id?: string;
  title: string;
  image?: string;
  price: number;
  tag?: string;
  foodType: string;
  source?: 'manual' | 'auto';
  mainItemId?: string | MenuItem;
  mainItem?: MenuItem;
  items?: MenuComboItemRef[];
  comboItems?: Array<{ menuItemId: string; itemName: string; quantity: number; price: number }>;
  isAvailable?: boolean;
  sortOrder?: number;
};

export type Coupon = {
  _id: string;
  couponCode: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  validFrom?: string;
  validTo?: string;
};

export type Review = {
  _id: string;
  orderId: string;
  restaurantRating?: number;
  foodRating?: number;
  deliveryRating?: number;
  reviewText?: string;
  createdAt?: string;
  customerId?: { fullName?: string; profileImage?: string };
};

export type EarningsSummary = {
  restaurantName?: string;
  commissionRate?: number;
  pendingSettlement?: {
    orderCount: number;
    grossFoodSales: number;
    totalCommission: number;
    netPayable: number;
  };
  awaitingBankTransfer?: { orderCount: number; netPayable: number };
  totalPaidOut?: { orderCount: number; netPayable: number };
  recentPendingOrders?: unknown[];
};

export type Settlement = {
  _id: string;
  settlementNumber: string;
  orderCount: number;
  grossFoodSales: number;
  totalCommission: number;
  netPayable: number;
  status: string;
  paidAt?: string;
  createdAt?: string;
};

export type NewOrderSocketPayload = {
  orderId: string;
  orderNumber?: string;
  orderStatus?: string;
  restaurantId?: string;
  grandTotal?: number;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
