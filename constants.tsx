
import { Product, Courier, OrderStatus, OrderSource } from './types';

export const ISTANBUL_DISTRICTS = [
  "ADALAR", "ARNAVUTKÖY", "ATAŞEHİR", "AVCILAR", "BAĞCILAR", "BAHÇELİEVLER", 
  "BAKIRKÖY", "BAŞAKŞEHİR", "BAYRAMPAŞA", "BEŞİKTAŞ", "BEYKOZ", "BEYLİKDÜZÜ", 
  "BEYOĞLU", "BÜYÜKÇEKMECE", "ÇATALCA", "ÇEKMEKÖY", "ESENLER", "ESENYURT", 
  "EYÜPSULTAN", "FATİH", "GAZİOSMANPAŞA", "GÜNGÖREN", "KADIKÖY", "KAĞITHANE", 
  "KARTAL", "KÜÇÜKÇEKMECE", "MALTEPE", "PENDİK", "SANCAKTEPE", "SARIYER", 
  "SİLİVRİ", "SULTANBEYLİ", "SULTANGAZİ", "ŞİLE", "ŞİŞLİ", "TUZLA", 
  "ÜMRANİYE", "ÜSKÜDAR", "ZEYTİNBURNU"
];

export const KARTAL_NEIGHBORHOODS = [
  "ATALAR", "CEVİZLİ", "CUMHURİYET", "ÇAVUŞOĞLU", "ESENTEPE", "GÜMÜŞPINAR", 
  "HÜRRİYET", "KARLIKTEPE", "KORDONBOYU", "ORHANTEPE", "ORTA", "PETROL İŞ", 
  "SOĞANLIK YENİ", "TOPSELVİ", "UĞUR MUMCU", "YAKACIK ÇARŞI", "YAKACIK YENİ", 
  "YALI", "YUKARI", "YUNUS"
];

export const POPULAR_NEIGHBORHOODS = [
  "SOĞANLIK YENİ", "ESENTEPE", "TOPSELVİ", "KORDONBOYU", "ATALAR", "CEVİZLİ", "UĞUR MUMCU", "YAKACIK YENİ"
];

export const STATUS_COLORS = {
  [OrderStatus.PENDING]: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10',
  [OrderStatus.ON_WAY]: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10',
  [OrderStatus.DELIVERED]: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10',
  [OrderStatus.CANCELLED]: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10',
};

export const SOURCE_STYLES = {
  [OrderSource.WEB]: { bg: 'bg-indigo-600', text: 'text-white', icon: 'fa-globe' },
  [OrderSource.PHONE]: { bg: 'bg-slate-700', text: 'text-white', icon: 'fa-phone' },
  [OrderSource.GETIR]: { bg: 'bg-[#5d3ebc]', text: 'text-white', icon: 'fa-bolt' },
  [OrderSource.TRENDYOL]: { bg: 'bg-[#ff6000]', text: 'text-white', icon: 'fa-basket-shopping' },
  [OrderSource.YEMEKSEPETI]: { bg: 'bg-[#ea004b]', text: 'text-white', icon: 'fa-utensils' },
};

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust1', phone: '05001112233', name: 'Ayşe Kaya', district: 'KARTAL', neighborhood: 'KORDONBOYU', 
    street: 'Güneş Sk.', buildingNo: '12', apartmentNo: '4', lastNote: 'Zil bozuk, kapıya bırakın.', orderCount: 5
  }
];

export const COURIERS: Courier[] = [
  { id: 'c1', name: 'Ahmet Yılmaz', status: 'active', phone: '0555 111 22 33', fullInventory: 20, emptyInventory: 0, serviceRegion: 'Kordonboyu' },
  { id: 'c2', name: 'Mehmet Demir', status: 'busy', phone: '0555 222 33 44', fullInventory: 15, emptyInventory: 5, serviceRegion: 'Uğur Mumcu' }
];
