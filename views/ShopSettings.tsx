
import React, { useState, useRef } from 'react';
import { Save, Store, Image as ImageIcon, QrCode, Calculator, Database, Download, Trash2, AlertTriangle, Cloud, ExternalLink, Code, FileUp, CheckCircle2, Loader2, Sparkles, ToggleLeft, ToggleRight, FileSpreadsheet, MessageSquareQuote } from 'lucide-react';
import { ShopDetails, Order, Customer, Product } from '../types';
import { dbService } from '../services/db';
import * as XLSX from 'xlsx';

interface ShopSettingsProps {
  shopDetails: ShopDetails;
  onSave: (details: ShopDetails) => Promise<void>;
  orders?: Order[];
  customers?: Customer[];
  onClearOrders: () => Promise<void>;
  onClearProducts: () => Promise<void>;
  onClearCustomers: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
  onAddProduct: (product: Product) => Promise<void>;
  onAddCustomer?: (customer: Customer) => Promise<void>;
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({ 
    shopDetails, 
    onSave, 
    orders = [], 
    customers = [],
    onClearOrders,
    onClearProducts,
    onClearCustomers,
    onFactoryReset,
    onAddProduct,
    onAddCustomer
}) => {
  const [formData, setFormData] = useState<ShopDetails>(shopDetails);
  const [isSaved, setIsSaved] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; count: number; type: string } | null>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const customerFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setIsSaved(false);
  };

  const handleToggle = (name: keyof ShopDetails) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
    setIsSaved(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'paymentQrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: 'logo' | 'paymentQrCode') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ ...formData, defaultTaxRate: Number(formData.defaultTaxRate) });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'customer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);
        
        let importedCount = 0;
        if (type === 'product') {
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const name = row.name || row.Name || row['Product Name'];
                if (!name) continue;

                const product: Product = {
                    id: `imp-${Date.now()}-${i}`,
                    name: String(name),
                    price: parseFloat(row.price || row.Price || row['Unit Price']) || 0,
                    stock: parseInt(row.stock || row.Stock || row['Quantity']) || 0,
                    category: String(row.category || row.Category || 'General'),
                    description: String(row.description || row.Description || ''),
                    taxRate: parseFloat(row.taxRate || row.TaxRate || row['Tax Rate (%)']) || shopDetails.defaultTaxRate,
                    minStockLevel: parseInt(row.minStockLevel || row.MinStockLevel || row['Min Stock Level']) || 5
                };
                await onAddProduct(product);
                importedCount++;
            }
        } else if (type === 'customer' && onAddCustomer) {
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const name = row.name || row.Name || row['Customer Name'];
                const phone = row.phone || row.Phone || row['Customer Phone'];
                if (!name || !phone) continue;

                const customer: Customer = {
                    id: `cust-imp-${Date.now()}-${i}`,
                    name: String(name),
                    phone: String(phone),
                    place: String(row.place || row.Place || row['Location'] || '')
                };
                await onAddCustomer(customer);
                importedCount++;
            }
        }
        setImportStatus({ success: true, count: importedCount, type });
      } catch (err) {
        console.error("Excel import failed:", err);
        alert(`Failed to parse Excel file. Ensure correct columns for ${type}s.`);
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportOrdersExcel = () => {
    if (orders.length === 0) return alert("No orders available to export.");
    const data = orders.map(o => ({
      'Order ID': o.id,
      'Date': new Date(o.date).toLocaleString(),
      'Total Amount': o.total,
      'Tax Amount': o.taxTotal,
      'Items Count': o.items.length,
      'Customer Name': o.customer?.name || 'Walk-in Guest',
      'Customer Phone': o.customer?.phone || '',
      'Customer Place': o.customer?.place || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `Shop_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleReset = async (type: 'orders' | 'products' | 'customers' | 'all') => {
      let msg = "";
      if (type === 'orders') msg = "Delete ALL Order History?";
      else if (type === 'products') msg = "Delete ALL Products?";
      else if (type === 'customers') msg = "Delete ALL Customers?";
      else if (type === 'all') msg = "FACTORY RESET: Clear ALL data?";

      if (window.confirm(msg)) {
          if (type === 'orders') await onClearOrders();
          else if (type === 'products') await onClearProducts();
          else if (type === 'customers') await onClearCustomers();
          else if (type === 'all') await onFactoryReset();
          alert("Success.");
      }
  };

  const isDbConfigured = dbService.isConfigured();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Shop Settings</h2>
        <p className="text-slate-500 mt-1">Configure branding, AI assistance, and cloud management.</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDbConfigured ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Cloud size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">Cloud Sync Status</h3>
                    <p className="text-xs text-slate-500">{isDbConfigured ? 'Connected to Supabase' : 'Local-Only Mode'}</p>
                  </div>
                </div>
            </div>
            <div className="p-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Code size={18} className="text-blue-600" /> Connection Info</h4>
                    <p className="text-sm text-slate-600 mb-4">Enable multi-device sync by configuring environment variables.</p>
                    <button onClick={() => setShowSchema(!showSchema)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50">
                        <ExternalLink size={16} /> {showSchema ? 'Hide' : 'Show SQL'}
                    </button>
                    {showSchema && (
                      <div className="mt-4">
                        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                          <pre className="text-[10px] text-green-400 font-mono">
{`create table products (id text primary key, name text not null, price numeric not null, stock numeric default 0, category text not null, description text, image text, "taxRate" numeric, "minStockLevel" numeric);
create table orders (id text primary key, date timestamp with time zone not null, items jsonb not null, total numeric not null, "taxTotal" numeric not null, customer jsonb);
create table settings (id text primary key, name text, address text, phone text, email text, "footerMessage" text, "poweredByText" text, logo text, "paymentQrCode" text, "taxEnabled" boolean, "defaultTaxRate" numeric, "showLogo" boolean, "showPaymentQr" boolean, "aiDescriptionPrompt" text);
create table customers (id text primary key, name text not null, phone text, place text);`}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Store size={24} /></div>
                <h3 className="font-semibold text-lg text-slate-800">Shop Branding & Receipt</h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Shop Logo</label>
                        <div className="relative w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                            {formData.logo ? <img src={formData.logo} className="h-full object-contain" /> : <ImageIcon className="text-slate-300" />}
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment QR</label>
                        <div className="relative w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                            {formData.paymentQrCode ? <img src={formData.paymentQrCode} className="h-full object-contain" /> : <QrCode className="text-slate-300" />}
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'paymentQrCode')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Business Name</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Shop Address</label>
                        <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Receipt Footer Message (Bottom Description)</label>
                        <input type="text" name="footerMessage" value={formData.footerMessage} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" placeholder="e.g. Thank you for your visit!" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Powered By Text</label>
                        <input type="text" name="poweredByText" value={formData.poweredByText} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" placeholder="e.g. Powered by SmartPOS" />
                    </div>
                </div>
              </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={24} /></div>
                <h3 className="font-semibold text-lg text-slate-800">AI Description Settings</h3>
              </div>
              <div className="p-8 space-y-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Customize how Gemini generates descriptions for your products. You can specify tone (e.g., "fancy", "short", "funny") or content rules.
                </p>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">AI Generation Instructions</label>
                    <textarea 
                        name="aiDescriptionPrompt" 
                        rows={3} 
                        value={formData.aiDescriptionPrompt} 
                        onChange={handleChange} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none" 
                        placeholder='e.g. "Generate a short, appetizing description (max 15 words) and a typical market price for a cafe product. Keep it professional and concise."' 
                    />
                </div>
              </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Database size={24} /></div>
                  <h3 className="font-semibold text-lg text-slate-800">Excel Operations</h3>
              </div>
              <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
                          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2"><FileSpreadsheet size={14} /> Import Products</h4>
                          <input type="file" ref={productFileInputRef} accept=".xlsx,.xls" onChange={(e) => handleExcelImport(e, 'product')} className="hidden" />
                          <button type="button" disabled={isImporting} onClick={() => productFileInputRef.current?.click()} className="w-full py-3 bg-white border border-emerald-200 text-emerald-800 font-black uppercase text-[10px] rounded-xl hover:bg-emerald-50 flex items-center justify-center gap-2">
                             {isImporting ? <Loader2 className="animate-spin" size={16}/> : <FileUp size={14} />}
                             Select Excel File
                          </button>
                          {importStatus?.type === 'product' && <p className="mt-2 text-xs font-bold text-green-600">Imported {importStatus.count} items.</p>}
                      </div>
                      <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><FileSpreadsheet size={14} /> Import Customers</h4>
                          <input type="file" ref={customerFileInputRef} accept=".xlsx,.xls" onChange={(e) => handleExcelImport(e, 'customer')} className="hidden" />
                          <button type="button" disabled={isImporting} onClick={() => customerFileInputRef.current?.click()} className="w-full py-3 bg-white border border-blue-200 text-blue-800 font-black uppercase text-[10px] rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2">
                             {isImporting ? <Loader2 className="animate-spin" size={16}/> : <FileUp size={14} />}
                             Select Excel File
                          </button>
                          {importStatus?.type === 'customer' && <p className="mt-2 text-xs font-bold text-blue-600">Imported {importStatus.count} records.</p>}
                      </div>
                  </div>
                  <div className="pt-8 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Download size={18} /> Backup Data</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => {
                            if (customers.length === 0) return alert("Empty.");
                            const ws = XLSX.utils.json_to_sheet(customers.map(c => ({ 'Name': c.name, 'Phone': c.phone, 'Place': c.place })));
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Customers");
                            XLSX.writeFile(wb, `Customers_Backup.xlsx`);
                        }} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Export Customers</button>
                        <button type="button" onClick={exportOrdersExcel} className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg">Export Orders</button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="pt-4 flex justify-end pb-8">
            <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-xl font-black uppercase text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
                <Save size={20} /> {isSaved ? 'SAVED' : 'SAVE ALL SETTINGS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
