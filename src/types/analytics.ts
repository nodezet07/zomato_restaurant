export type RestaurantAnalytics = {
  restaurantId: string;
  restaurantName: string;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageRating: number;
  totalRatings: number;
  isOpen: boolean;
  ordersByStatus: Array<{ _id: string; count: number }>;
  ordersByDayLast30: Array<{ _id: string; orders: number; revenue: number }>;
};

export type SupportTicket = {
  _id: string;
  ticketNumber: string;
  issueType: string;
  description: string;
  status: string;
  createdAt?: string;
  resolution?: string;
  customerId?: { fullName?: string; email?: string; mobile?: string };
  orderId?: {
    _id?: string;
    orderNumber?: string;
    orderStatus?: string;
    grandTotal?: number;
    refundAmount?: number;
  };
};
