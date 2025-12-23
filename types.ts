
export enum OrderStatus {
  PENDING = 'Bekliyor',
  ON_WAY = 'Yolda',
  DELIVERED = 'Teslim Edildi',
  CANCELLED = 'İptal'
}

export enum OrderSource {
  WEB = 'Web/Müşteri',
  PHONE = 'Telefon',
  GETIR = 'Getir',
  TRENDYOL = 'Trendyol',
  YEMEKSEPETI = 'Yemeksepeti'
}

export enum UserRole {
  ADMIN = 'Admin',
  OFFICE = 'Ofis Personeli',
  COURIER = 'Kurye',
  CUSTOMER = 'Müşteri'
}

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
