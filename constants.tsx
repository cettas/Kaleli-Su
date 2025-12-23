
import { Courier, User } from './types';

export const DEFAULT_USERS: User[] = [
  { id: 'admin1', username: 'admin', password: 'admin123', name: 'Sistem Yöneticisi', role: "Admin" },
  { id: 'office1', username: 'ofis', password: 'ofis123', name: 'Ofis Personeli', role: "Ofis Personeli" },
  { id: 'courier1', username: 'kurye', password: 'kurye123', name: 'Ahmet Yılmaz', role: "Kurye", courierId: 'c1' },
  { id: 'courier2', username: 'kurye2', password: 'kurye123', name: 'Mehmet Demir', role: "Kurye", courierId: 'c2' },
];

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
  "ATALAR", "CEVİZLİ", "CUMHURİYET", "ÇAVUŞOĞLU", "ESENTEPE", "ESKİ KARTAL",
  "GÜMÜŞPINAR", "HÜRRİYET", "HURMALIK", "KARLIKTEPE", "KARLIDERE", "KORDONBOYU",
  "ORHANTEPE", "ORHANGAZİ", "ORTA", "PETROL İŞ", "SOĞANLIK", "SOĞANLIK YENİ",
  "TOPÇULAR", "TOPSELVİ", "UĞUR MUMCU", "YAKACIK ÇARŞI", "YAKACIK YENİ",
  "YALI", "YENİDOĞAN", "YUKARI", "YUNUS"
];

export const POPULAR_NEIGHBORHOODS = [
  "SOĞANLIK YENİ", "ESENTEPE", "TOPSELVİ", "KORDONBOYU", "ATALAR", "CEVİZLİ", "UĞUR MUMCU", "YAKACIK YENİ"
];

export const STATUS_COLORS = {
  'Bekliyor': 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10',
  'Yolda': 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10',
  'Teslim Edildi': 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10',
  'İptal': 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10',
};

export const SOURCE_STYLES = {
  'Web/Müşteri': { bg: 'bg-indigo-600', text: 'text-white', icon: 'fa-globe' },
  'Telefon': { bg: 'bg-slate-700', text: 'text-white', icon: 'fa-phone' },
  'Getir': { bg: 'bg-[#5d3ebc]', text: 'text-white', icon: 'fa-bolt' },
  'Trendyol': { bg: 'bg-[#ff6000]', text: 'text-white', icon: 'fa-basket-shopping' },
  'Yemeksepeti': { bg: 'bg-[#ea004b]', text: 'text-white', icon: 'fa-utensils' },
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
