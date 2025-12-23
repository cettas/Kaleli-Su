
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category } from '../types';

interface StockManagementProps {
  inventory: InventoryItem[];
  categories: Category[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
}

const ICON_LIST = ['droplet', 'faucet', 'bottle-water', 'box', 'cubes', 'truck', 'credit-card', 'tags', 'clipboard-list', 'glass-water', 'bucket', 'filter'];

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

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '', quantity: 0, unit: 'Adet', costPrice: 0, salePrice: 0, category: categories[0]?.id || 'diger', isActive: true, imageUrl: ''
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesCategory = activeCategory === 'all' || i.category === activeCategory;
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, activeCategory, searchTerm]);

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (showForm === 'add') {
      const newItem: InventoryItem = { ...formData as InventoryItem, id: 'inv-' + Date.now() };
      onUpdateInventory([...inventory, newItem]);
    } else if (showForm === 'edit' && selectedItem) {
      onUpdateInventory(inventory.map(i => i.id === selectedItem.id ? { ...i, ...formData } as InventoryItem : i));
    }
    setShowForm(null);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex-1 w-full relative">
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input 
            type="text" placeholder="Katalogda ürün ara..." 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button onClick={() => setShowCategoryManager(true)} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200">GRUPLAR</button>
          <button onClick={() => setShowForm('add')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100">YENİ ÜRÜN</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-8">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl hover:border-indigo-200 transition-all duration-500">
            <div className="h-48 bg-slate-50 relative">
              {item.imageUrl ? (
                <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-100 text-5xl">
                  <i className={`fas fa-${categories.find(c => c.id === item.category)?.icon || 'box'}`}></i>
                </div>
              )}
              <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedItem(item); setFormData({...item}); setShowForm('edit'); }} className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-lg"><i className="fas fa-pen"></i></button>
              </div>
            </div>
            <div className="p-8">
              <h4 className="font-black text-slate-900 text-base uppercase leading-tight mb-2 truncate">{item.name}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categories.find(c => c.id === item.category)?.label}</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <span className="text-[8px] font-black text-slate-400 block mb-1">STOK</span>
                  <span className="text-xl font-black text-slate-900 tracking-tighter">{item.quantity}</span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl text-center">
                  <span className="text-[8px] font-black text-indigo-400 block mb-1">FİYAT</span>
                  <span className="text-xl font-black text-indigo-600 tracking-tighter">{item.salePrice}₺</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(null)}>
          <form onSubmit={handleSubmitItem} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-900 uppercase">ÜRÜN AYARLARI</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">ÜRÜN ADI</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">RESİM URL (Opsiyonel)</label>
                  <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[10px]" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">KATEGORİ</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">FİYAT</label>
                    <input type="number" className="w-full px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-700" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl">KAYDET</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
