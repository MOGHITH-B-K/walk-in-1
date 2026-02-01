
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Sparkles, Loader2, Package, Upload, Image as ImageIcon, Store, AlertTriangle, ListFilter, AlertCircle, CheckCircle2, Cloud, CloudOff, FileSpreadsheet, Search } from 'lucide-react';
import { Product, ShopDetails } from '../types';
import { generateProductDetails } from '../services/gemini';
import { dbService } from '../services/db';
import * as XLSX from 'xlsx';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onClearProducts: () => Promise<void>;
  onNavigateToPos: () => void;
  shopDetails: ShopDetails;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onClearProducts,
  onNavigateToPos,
  shopDetails
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [dbConnected] = useState(dbService.isConfigured());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'Beverages',
    description: '',
    image: '',
    taxRate: shopDetails.defaultTaxRate,
    minStockLevel: 5
  });

  const [editId, setEditId] = useState<string | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();
  const dropdownCategories = categories.length > 0 ? categories : ['Beverages', 'Food', 'Snacks', 'Dessert'];

  const resetForm = () => {
    setCurrentProduct({ 
      name: '', 
      price: 0, 
      stock: 0, 
      category: dropdownCategories[0], 
      description: '', 
      image: '', 
      taxRate: shopDetails.defaultTaxRate, 
      minStockLevel: 5
    });
    setEditId(null);
    setIsModalOpen(false);
    setIsSaving(false);
    setSaveSuccess(false);
    setIsCustomCategory(false);
  };

  const handleExportExcel = () => {
    if (products.length === 0) return;
    const data = products.map(p => ({
      'Name': p.name,
      'Price': p.price,
      'Stock': p.stock,
      'Category': p.category,
      'Description': p.description || '',
      'Tax Rate (%)': p.taxRate || 0,
      'Min Stock Level': p.minStockLevel || 5
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const term = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.category.toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    );
  }, [products, searchQuery]);

  const handleSubmit = async (e: React.FormEvent, shouldRedirect: boolean) => {
    e.preventDefault();
    if (!currentProduct.name || currentProduct.price === undefined) {
      alert("Please enter a product name and price.");
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);

    const processedProduct = {
      ...currentProduct,
      stock: Number(currentProduct.stock) || 0,
      price: Number(currentProduct.price) || 0,
      taxRate: Number(currentProduct.taxRate) || 0,
      minStockLevel: Number(currentProduct.minStockLevel) || 5
    };

    try {
      if (editId) {
        await onUpdateProduct({ ...processedProduct, id: editId } as Product);
      } else {
        const newProduct: Product = {
          ...processedProduct as Product,
          id: Date.now().toString(),
        };
        await onAddProduct(newProduct);
      }
      
      setSaveSuccess(true);
      
      setTimeout(() => {
        if (shouldRedirect) {
          onNavigateToPos();
        } else {
          resetForm();
        }
      }, 800);

    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save product. Please check your database settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setEditId(product.id);
    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!currentProduct.name) return;
    setIsLoadingAI(true);
    const data = await generateProductDetails(currentProduct.name, shopDetails.aiDescriptionPrompt);
    if (data) {
      setCurrentProduct(prev => ({
        ...prev,
        description: data.description || prev.description,
        price: data.suggestedPrice || prev.price,
        category: data.category || prev.category
      }));
    }
    setIsLoadingAI(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            setCurrentProduct(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto scroll-gpu">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-800">Stock Management</h2>
            {dbConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                    <Cloud size={12} /> CLOUD SYNC ACTIVE
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-100">
                    <CloudOff size={12} /> LOCAL MODE
                </div>
            )}
          </div>
          <p className="text-slate-500 mt-1">Add product details and set inventory thresholds.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="relative flex-grow min-w-[240px] xl:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-all"
                >
                  <FileSpreadsheet size={18} /> Export
                </button>
                <button 
                  onClick={() => setIsCategoryModalOpen(true)} 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
                >
                  <ListFilter size={18} /> Categories
                </button>
                <button 
                  onClick={() => { resetForm(); setIsModalOpen(true); }} 
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg"
                >
                  <Plus size={18} /> New Product
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden optimize-gpu">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    {searchQuery ? `No products matching "${searchQuery}"` : 'Database is empty. Add a product to get started.'}
                  </td>
                </tr>
            ) : filteredProducts.map(product => {
              const threshold = product.minStockLevel || 5;
              const isLow = product.stock > 0 && product.stock <= threshold;
              const isOut = product.stock <= 0;

              return (
                <tr key={product.id} className={`transition-colors content-auto ${isOut ? 'bg-red-50/20' : isLow ? 'bg-orange-50/20' : 'hover:bg-slate-50'}`} style={{ containIntrinsicSize: '0 80px' }}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                      {product.image ? <img src={product.image} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <ImageIcon size={20} className="text-slate-400" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 truncate">{product.name}</span>
                        <span className="text-[10px] text-slate-400 max-w-[200px] truncate">{product.description || 'Synced to cloud'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] uppercase font-black rounded-full border border-blue-100">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isOut ? (
                      <div className="flex items-center gap-1.5 text-red-600 font-black text-xs bg-red-100 px-3 py-1 rounded-lg w-fit">
                        <AlertCircle size={14} /> OUT: {product.stock}
                      </div>
                    ) : isLow ? (
                      <div className="flex items-center gap-1.5 text-orange-600 font-black text-xs bg-orange-100 px-3 py-1 rounded-lg w-fit">
                        <AlertTriangle size={14} /> LOW: {product.stock}
                      </div>
                    ) : (
                      <div className="text-green-600 font-bold text-sm">
                        {product.stock} available
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-800">₹{product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editId ? 'Edit Product' : 'Product Details'}</h3>
                <p className="text-xs text-slate-500 font-medium">Synced to cloud for walk-in billing.</p>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
            </div>
            
            <form className="p-8 space-y-6 overflow-y-auto scroll-gpu">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Image</label>
                   <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                         {currentProduct.image ? (
                           <img src={currentProduct.image} className="w-full h-full object-cover" decoding="async" />
                         ) : (
                           <ImageIcon size={32} className="text-slate-200" />
                         )}
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors w-fit">
                          <Upload size={16} /> {currentProduct.image ? 'Change Photo' : 'Upload Photo'}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2">Recommended: 400x400px, Max 2MB.</p>
                      </div>
                   </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      required
                      value={currentProduct.name} 
                      onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} 
                      className="flex-1 px-5 py-3.5 border-2 border-slate-100 rounded-2xl focus:border-blue-500 font-bold outline-none" 
                      placeholder="e.g. Classic Brownie" 
                    />
                    <button 
                      type="button" 
                      onClick={handleAIGenerate} 
                      disabled={isLoadingAI || !currentProduct.name} 
                      className="px-5 py-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 hover:scale-105 transition-all"
                    >
                      {isLoadingAI ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  {isCustomCategory ? (
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        autoFocus
                        value={currentProduct.category} 
                        onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})} 
                        className="flex-1 px-5 py-3.5 border-2 border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none bg-blue-50/20 font-bold" 
                        placeholder="Type category..." 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomCategory(false); setCurrentProduct(prev => ({...prev, category: dropdownCategories[0]})); }} 
                        className="px-4 py-3 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-slate-200"
                      >
                        Back
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={currentProduct.category} 
                      onChange={(e) => {
                        if (e.target.value === 'NEW_CATEGORY') {
                          setIsCustomCategory(true);
                          setCurrentProduct(prev => ({...prev, category: ''}));
                        } else {
                          setCurrentProduct({...currentProduct, category: e.target.value});
                        }
                      }} 
                      className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none bg-white font-bold"
                    >
                      {dropdownCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="NEW_CATEGORY">+ NEW CATEGORY</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Unit Price (₹)</label>
                  <input type="number" step="0.01" value={currentProduct.price} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" />
                </div>
                 <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Stock</label>
                  <input type="number" value={currentProduct.stock} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Min Stock Alert Level</label>
                  <input 
                    type="number" 
                    value={currentProduct.minStockLevel} 
                    onChange={(e) => setCurrentProduct({...currentProduct, minStockLevel: parseInt(e.target.value)})} 
                    className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" 
                    placeholder="e.g. 5"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">System will alert you when stock drops below this value.</p>
                </div>
              </div>

              <div className="pt-8 flex flex-col gap-4">
                <button 
                  type="button" 
                  disabled={isSaving || saveSuccess}
                  onClick={(e) => handleSubmit(e, true)}
                  className={`w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    saveSuccess 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-900 text-white hover:bg-blue-600 shadow-2xl'
                  } disabled:opacity-70`}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : saveSuccess ? <CheckCircle2 size={24} /> : <Store size={24} />} 
                  {saveSuccess ? 'SUCCESSFULLY SYNCED' : 'Save & GO TO BILLING'}
                </button>
                <button 
                  type="button"
                  disabled={isSaving || saveSuccess}
                  onClick={(e) => handleSubmit(e, false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs rounded-[1.25rem] hover:bg-slate-200"
                >
                  Save Only
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
