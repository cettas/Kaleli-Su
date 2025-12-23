export const OrderStatus = {
  PENDING: 'Bekliyor',
  ON_WAY: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal'
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderSource = {
  WEB: 'Web/Müşteri',
  PHONE: 'Telefon',
  GETIR: 'Getir',
  TRENDYOL: 'Trendyol',
  YEMEKSEPETI: 'Yemeksepeti',
  AI_PHONE: 'telefon-robot',
  WHATSAPP: 'whatsapp'
} as const;

export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const UserRole = {
  ADMIN: 'Admin',
  OFFICE: 'Ofis Personeli',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri'
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  district: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo: string;
  lastNote?: string;
  orderCount: number;
  lastOrderDate?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface Courier {
  id: string;
  name: string;
  status: 'active' | 'busy' | 'offline';
  phone: string;
  fullInventory: number;
  emptyInventory: number;
  serviceRegion?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export const PaymentMethod = {
  CASH: 'Nakit',
  POS: 'POS',
  NOT_COLLECTED: 'Alınmadı'
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  courierId?: string;
  courierName?: string;
  status: OrderStatus;
  source: OrderSource;
  note?: string;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  isCore?: boolean;
  category: string;
  imageUrl?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  courierId?: string;
}

// =====================================================
// AI TELEFON ROBOTU ENTEGRASYONU
// =====================================================

export interface AIPhoneIntegration {
  id: string;
  name: string;
  isActive: boolean;
  apiKey: string;
  provider: 'twilio' | 'vonage' | 'custom';
  phoneNumber: string;
  webhookUrl?: string;
  systemPrompt: string;
  voiceSettings: {
    language: 'tr-TR';
    voice: string;
    speed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CallLog {
  id: string;
  callerId: string;
  customerName?: string;
  customerFound: boolean;
  transcript: string;
  orderData?: {
    product: string;
    quantity: number;
    address: string;
    note?: string;
  };
  status: 'success' | 'failed' | 'incomplete';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIOrderRequest {
  telefon: string;
  musteri_adi?: string;
  urun: string;
  adet: number;
  adres: string;
  siparis_kaynagi: 'telefon-robot';
  not?: string;
}

export interface AICustomerResponse {
  found: boolean;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
}
