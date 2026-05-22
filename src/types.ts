export type Category = 'THREE PIECE' | 'SAREE' | 'OTHERS';
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free Size';
export type DeliveryOption = 'Home Delivery' | 'Courier Pickup';
export type DeliveryArea = 'Inside Dhaka' | 'Outside Dhaka';
export type PaymentMethod = 'Cash On Delivery' | 'bKash' | 'Nagad' | 'Rocket';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface CartItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productCode: string;
  category: Category;
  price: number;
  quantity: number;
  size: string;
}

export interface Order {
  id?: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  district: string;
  upazila: string;
  category: Category; // Keep for legacy/main category
  productCode: string; // Keep for legacy/main code
  quantity: number;    // Keep for legacy/total count
  price: number;       // Keep for legacy/base price
  items?: CartItem[];
  deliveryCharge: number;
  totalAmount: number;
  discount?: number;
  discountAmount?: number;
  deliveryOption: DeliveryOption;
  deliveryArea: DeliveryArea;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paymentScreenshotUrl?: string;
  productScreenshotUrl?: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  productId?: string;
  productImage?: string;
}

export interface Product {
  id?: string;
  title: string;
  brand?: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  productCode: string;
  stock: number;
  discount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface BrandSettings {
  logoUrl?: string;
  telegramToken?: string;
  telegramChatId?: string;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
}
