import React, { useState, useMemo } from 'react';
import { InventoryItem, Category } from '../types';
import { supabase } from '../services/supabaseClient';

interface StockManagementProps {
  inventory: InventoryItem[];
  categories: Category[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
}

const ICON_LIST = ['droplet', 'faucet', 'bottle-water', 'box', 'cubes', 'truck', 'credit-card', 'tags', 'clipboard-list', 'glass-water', 'bucket', 'filter', 'wine-bottle', 'glass-water', 'jug-detergent', 'pump-soap', 'cart-shopping', 'package', 'warehouse', 'industry'];

const COLOR_LIST = [
  { name: 'İndigo', value: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'Yeşil', value: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Turuncu', value: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Kırmızı', value: 'from-rose-500 to-rose-600', bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-50', border: 'border-rose-200' },
  { name: 'Violet', value: 'from-violet-500 to-violet-600', bg: 'bg-violet-500', text: 'text-violet-500', light: 'bg-violet-50', border: 'border-violet-200' },
  { name: 'Camgöbeği', value: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-500', text: 'text-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200' },
  { name: 'Pembe', value: 'from-pink-500 to-pink-600', bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50', border: 'border-pink-200' },
  { name: 'Mavi', value: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', border: 'border-blue-200' },
];

interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  type: 'danger' | 'warning';
}

const StockManagement: React.FC<StockManagementProps> = ({ inventory, categories, onUpdateInventory, onUpdateCategories }) => {
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  // Kategori yönetimi için state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(ICON_LIST[0]);
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_LIST[0]);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '', quantity: 0, unit: 'Adet', costPrice: 0, salePrice: 0, category: categories[0]?.id || 'diger', isActive: true, imageUrl: ''
  });

  // İstatistikler
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const activeItems = inventory.filter(i => i.isActive).length;
    const totalStock = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const lowStock = inventory.filter(i => (i.quantity || 0) < 10).length;
    const totalValue = inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.salePrice || 0)), 0);

    return { totalItems, activeItems, totalStock, lowStock, totalValue };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, activeCategory, searchTerm]);

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (showForm === 'add') {
      const newItem: InventoryItem = { ...formData as InventoryItem, id: 'inv-' + Date.now() };

      // Supabase'e kaydet
      await supabase.from('inventory').insert({
        id: newItem.id,
        name: newItem.name,
        quantity: newItem.quantity,
        unit: newItem.unit,
        cost_price: newItem.costPrice,
        sale_price: newItem.salePrice,
        is_active: newItem.isActive,
        is_core: newItem.isCore,
        category: newItem.category,
        image_url: newItem.imageUrl
      });

      onUpdateInventory([...inventory, newItem]);
    } else if (showForm === 'edit' && selectedItem) {
      const updatedItem = { ...selectedItem, ...formData } as InventoryItem;

      // Supabase'e güncelle
      await supabase.from('inventory').update({
        name: updatedItem.name,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit,
        cost_price: updatedItem.costPrice,
        sale_price: updatedItem.salePrice,
        is_active: updatedItem.isActive,
        is_core: updatedItem.isCore,
        category: updatedItem.category,
        image_url: updatedItem.imageUrl
      }).eq('id', selectedItem.id);

      onUpdateInventory(inventory.map(i => i.id === selectedItem.id ? updatedItem : i));
    }
    // Formu kapat ve resetle
    setShowForm(null);
    setSelectedItem(null);
    setFormData({
      name: '', quantity: 0, unit: 'Adet', costPrice: 0, salePrice: 0, category: categories[0]?.id || 'diger', isActive: true, imageUrl: ''
    });
  };

  // Kategori ekle
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: 'cat-' + Date.now(),
      label: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: newCategoryColor.value
    };

    onUpdateCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryIcon(ICON_LIST[0]);
    setNewCategoryColor(COLOR_LIST[0]);
  };

  // Kategori sil
  const handleDeleteCategory = (categoryId: string) => {
    const categoryItems = inventory.filter(i => i.category === categoryId);
    if (categoryItems.length > 0) {
      setConfirmConfig({
        title: 'Kategori Silinemez',
        message: `Bu kategoride ${categoryItems.length} ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.`,
        onConfirm: () => {},
        type: 'warning'
      });
      return;
    }

    setConfirmConfig({
      title: 'Kategoriyi Sil',
      message: 'Bu kategoriyi silmek istediğinizden emin misiniz?',
      onConfirm: () => {
        onUpdateCategories(categories.filter(c => c.id !== categoryId));
        setConfirmConfig(null);
      },
      type: 'danger'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* İstatistikler */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Toplam Ürün</span>
          <span className="text-3xl font-black tracking-tighter">{stats.totalItems}</span>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Müşteriye Açık</span>
          <span className="text-3xl font-black tracking-tighter">{stats.activeItems}</span>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Toplam Stok</span>
          <span className="text-3xl font-black tracking-tighter">{stats.totalStock}</span>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Kritik Stok</span>
          <span className="text-3xl font-black tracking-tighter">{stats.lowStock}</span>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Değer</span>
          <span className="text-2xl font-black tracking-tighter">{stats.totalValue.toLocaleString()}₺</span>
        </div>
      </div>

      {/* Arama ve Filtreler */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex-1 w-full relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input
            type="text" placeholder="Katalogda ürün ara..."
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Kategori Filtre */}
          <div className="relative">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="appearance-none px-6 py-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
          </div>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-6 py-4 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-violet-200/50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-layer-group"></i>
            Kategoriler
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-[8px]">{categories.length}</span>
          </button>
          <button
            onClick={() => setShowForm('add')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-200/50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Yeni Ürün
          </button>
        </div>
      </div>

      {/* Ürün Kartları */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 text-4xl mx-auto mb-6">
            <i className="fas fa-box-open"></i>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Ürün Bulunamadı</h3>
          <p className="text-sm text-slate-500">Arama kriterlerine uygun ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-6">
          {filteredInventory.map(item => {
            const category = categories.find(c => c.id === item.category);
            const icon = category?.icon || 'box';
            const isLowStock = (item.quantity || 0) < 10;
            const isOutOfStock = (item.quantity || 0) === 0;
            const isActive = item.isActive;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[2.5rem] border-2 ${
                  !isActive
                    ? 'border-slate-200 opacity-60'
                    : isOutOfStock
                      ? 'border-rose-200 shadow-rose-100/50'
                      : isLowStock
                        ? 'border-amber-200 shadow-amber-100/50'
                        : 'border-slate-100 shadow-sm'
                } shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl hover:border-indigo-300 transition-all duration-500 relative`}
              >
                {/* Durum Rozeti */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  {isOutOfStock && (
                    <span className="px-3 py-1 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg">
                      TÜKENDİ
                    </span>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg">
                      KRİTİK
                    </span>
                  )}
                  {!isActive && !isOutOfStock && (
                    <span className="px-3 py-1 bg-slate-400 text-white text-[9px] font-black uppercase rounded-full shadow-lg">
                      PASİF
                    </span>
                  )}
                  {isActive && !isOutOfStock && !isLowStock && (
                    <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg">
                      SATIŞTA
                    </span>
                  )}
                </div>

                {/* Ürün Görseli */}
                <div className="h-52 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <i className={`fas fa-${icon} text-6xl text-indigo-200 mb-2`}></i>
                        <p className="text-[10px] font-black text-indigo-300 uppercase">{category?.label}</p>
                      </div>
                    </div>
                  )}

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6 gap-3">
                    <button
                      onClick={() => { setSelectedItem(item); setFormData({...item}); setShowForm('edit'); }}
                      className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                      title="Düzenle"
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button
                      onClick={() => setConfirmConfig({
                        title: 'Ürünü Sil',
                        message: `"${item.name}" ürününü silmek istediğinizden emin misiniz?`,
                        onConfirm: async () => {
                          await supabase.from('inventory').delete().eq('id', item.id);
                          onUpdateInventory(inventory.filter(i => i.id !== item.id));
                        },
                        type: 'danger'
                      })}
                      className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 hover:scale-110 transition-all"
                      title="Sil"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Ürün Bilgileri */}
                <div className="p-6 flex-1 flex flex-col">
                  <h4 className="font-black text-slate-900 text-base uppercase leading-tight mb-3 truncate">{item.name}</h4>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">{category?.label}</p>

                  {/* Metrikler */}
                  <div className="grid grid-cols-3 gap-3 mt-auto">
                    <div className={`p-3 rounded-2xl text-center border ${
                      !isActive
                        ? 'bg-slate-50 border-slate-200'
                        : isOutOfStock
                          ? 'bg-rose-50 border-rose-200'
                          : isLowStock
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Stok</span>
                      <span className={`text-lg font-black tracking-tighter ${
                        !isActive ? 'text-slate-500' : isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                      }`}>{item.quantity}</span>
                    </div>
                    <div className="p-3 rounded-2xl text-center border bg-slate-50">
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Birim</span>
                      <span className="text-sm font-black text-slate-900">{item.unit}</span>
                    </div>
                    <div className="p-3 rounded-2xl text-center border bg-emerald-50">
                      <span className="text-[8px] font-black text-emerald-600 uppercase block mb-1">Fiyat</span>
                      <span className="text-lg font-black text-emerald-700">{item.salePrice}₺</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ürün Ekleme/Düzenleme Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowForm(null)}>
          <form onSubmit={handleSubmitItem} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {showForm === 'add' ? 'Yeni Ürün' : 'Ürün Düzenle'}
                </h3>
                <p className="text-indigo-200 text-xs font-bold uppercase mt-1">Katalog ürün bilgilerini girin</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ürün Adı */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-tag text-indigo-500"></i>
                    Ürün Adı
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-bold outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: 19LT Damacana Su"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-layer-group text-indigo-500"></i>
                    Kategori
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-bold appearance-none outline-none transition-all cursor-pointer"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                {/* Birim */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-cubes text-indigo-500"></i>
                    Birim
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-bold appearance-none outline-none transition-all cursor-pointer"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="Adet">Adet</option>
                    <option value="LT">LT</option>
                    <option value="KG">KG</option>
                    <option value="Paket">Paket</option>
                  </select>
                </div>

                {/* Stok */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-boxes text-indigo-500"></i>
                    Stok Miktarı
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-bold outline-none transition-all"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>

                {/* Satış Fiyatı */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-lira-sign text-emerald-500"></i>
                    Satış Fiyatı
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-200 focus:border-emerald-500 rounded-2xl font-black text-emerald-700 outline-none transition-all"
                    value={formData.salePrice}
                    onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                {/* Maliyet Fiyatı */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-calculator text-amber-500"></i>
                    Maliyet Fiyatı
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-5 py-4 bg-amber-50 border-2 border-amber-200 focus:border-amber-500 rounded-2xl font-bold text-amber-700 outline-none transition-all"
                    value={formData.costPrice}
                    onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                {/* Resim URL */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-image text-violet-500"></i>
                    Resim URL (Opsiyonel)
                  </label>
                  <input
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-violet-500 rounded-2xl font-mono text-xs outline-none transition-all"
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://..."
                  />
                </div>

                {/* Aktif/Pasif */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-all">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="w-6 h-6 rounded-lg border-2 border-emerald-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-black text-emerald-900 block">Müşteriye Açık (Satışta Göster)</span>
                      <span className="text-[10px] font-bold text-emerald-600">Kapalıysa sadece admin panelinde görünür</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-200/50 transition-all"
                >
                  <i className="fas fa-check mr-2"></i>
                  {showForm === 'add' ? 'Ürün Ekle' : 'Güncelle'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Kategori Yönetimi Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCategoryManager(false)}>
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 p-8 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Kategori Yönetimi</h3>
                <p className="text-violet-200 text-xs font-bold uppercase mt-1">Kategori ekle, düzenle veya sil</p>
              </div>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Yeni Kategori Ekle */}
              <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-200">
                <h4 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                  <i className="fas fa-plus-circle text-violet-500"></i>
                  Yeni Kategori Ekle
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kategori Adı</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Örn: Su Ürünleri"
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-violet-500 rounded-xl font-bold text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">İkon</label>
                    <select
                      value={newCategoryIcon}
                      onChange={e => setNewCategoryIcon(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-violet-500 rounded-xl font-bold text-sm appearance-none outline-none transition-all cursor-pointer"
                    >
                      {ICON_LIST.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Renk</label>
                    <select
                      value={newCategoryColor.name}
                      onChange={e => setNewCategoryColor(COLOR_LIST.find(c => c.name === e.target.value) || COLOR_LIST[0])}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-violet-500 rounded-xl font-bold text-sm appearance-none outline-none transition-all cursor-pointer"
                    >
                      {COLOR_LIST.map(color => (
                        <option key={color.name} value={color.name}>{color.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="mt-4 w-full py-4 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-violet-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <i className="fas fa-plus"></i>
                  Kategori Ekle
                </button>
              </div>

              {/* Mevcut Kategoriler */}
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                  <i className="fas fa-list text-violet-500"></i>
                  Mevcut Kategoriler ({categories.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map(category => {
                    const colorObj = COLOR_LIST.find(c => category.color?.includes(c.name)) || COLOR_LIST[0];
                    const item_count = inventory.filter(i => i.category === category.id).length;

                    return (
                      <div
                        key={category.id}
                        className={`bg-white rounded-2xl border-2 ${colorObj.border} p-4 flex items-center gap-4 hover:shadow-lg transition-all`}
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color || colorObj.value} flex items-center justify-center text-white text-xl shadow-lg`}>
                          <i className={`fas fa-${category.icon}`}></i>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-black text-slate-900 uppercase">{category.label}</h5>
                          <p className="text-[10px] font-bold text-slate-400">{item_count} ürün</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-all"
                          title="Kategoriyi Sil"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {categories.length === 0 && (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
                    <i className="fas fa-folder-open text-4xl text-slate-300 mb-3"></i>
                    <p className="text-sm font-bold text-slate-400">Henüz kategori yok</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setShowCategoryManager(false)}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setConfirmConfig(null)}>
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center ${
                confirmConfig.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}>
                <i className={`fas ${confirmConfig.type === 'danger' ? 'fa-exclamation-triangle' : 'fa-question-circle'} text-3xl`}></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase mb-3">{confirmConfig.title}</h3>
              <p className="text-sm text-slate-500 mb-8">{confirmConfig.message}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setConfirmConfig(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    confirmConfig.onConfirm();
                    if (confirmConfig.title !== 'Kategori Silinemez') {
                      setConfirmConfig(null);
                    }
                  }}
                  className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                    confirmConfig.type === 'danger'
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-200/50'
                      : 'bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200/50'
                  }`}
                >
                  Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
