
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, LogOut, ReceiptText, Settings, BarChart3, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { POS } from './views/POS';
import { Inventory } from './views/Inventory';
import { History } from './views/History';
import { ShopSettings } from './views/ShopSettings';
import { DailyAnalysis } from './views/DailyAnalysis';
import { Customers } from './views/Customers';
import { Product, CartItem, ViewState, Order, ShopDetails, Customer } from './types';
import { dbService } from './services/db';

const INITIAL_SHOP_DETAILS: ShopDetails = {
  name: 'SmartPOS Demo Shop',
  address: '123 Innovation Drive, Tech Valley, CA 90210',
  phone: '+91 98765 43210',
  email: 'contact@smartpos.demo',
  footerMessage: 'Thank you for your business!',
  poweredByText: 'Powered by SmartPOS',
  logo: '',
  paymentQrCode: '',
  taxEnabled: true,
  defaultTaxRate: 5,
  showLogo: true,
  showPaymentQr: true
};

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cappuccino', price: 250, stock: 50, category: 'Beverages', description: 'Rich espresso with frothy milk', taxRate: 5 },
  { id: '2', name: 'Croissant', price: 180, stock: 30, category: 'Snacks', description: 'Buttery flaky pastry', taxRate: 5 },
  { id: '3', name: 'Avocado Toast', price: 350, stock: 20, category: 'Food', description: 'Sourdough with fresh avocado', taxRate: 5 },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shopDetails, setShopDetails] = useState<ShopDetails>(INITIAL_SHOP_DETAILS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<{name: string, phone: string, place: string} | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let globalSub: any = null;

    const loadData = async () => {
      try {
        setLoading(true);
        setInitError(null);
        
        const connected = dbService.isConfigured();
        const dbProducts = await dbService.getProducts();
        
        if (dbProducts.length === 0 && !connected) {
            for (const p of INITIAL_PRODUCTS) await dbService.saveProduct(p);
            setProducts(INITIAL_PRODUCTS);
        } else {
            setProducts(dbProducts.sort((a, b) => a.name.localeCompare(b.name)));
        }

        const dbOrders = await dbService.getOrders();
        setOrders(dbOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const dbCustomers = await dbService.getCustomers();
        setCustomers(dbCustomers);

        const dbSettings = await dbService.getShopDetails();
        if (dbSettings) setShopDetails({ ...INITIAL_SHOP_DETAILS, ...dbSettings });
        else await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);

        if (connected) {
            globalSub = dbService.subscribeToTables({
                'products': async () => setProducts(await dbService.getProducts()),
                'orders': async () => setOrders(await dbService.getOrders()),
                'customers': async () => setCustomers(await dbService.getCustomers())
            });
        }
      } catch (error: any) {
        console.error("Failed to load application data:", error);
        setInitError(error.message || "Unknown error during initialization.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    return () => { 
      if (globalSub) dbService.unsubscribe(globalSub); 
    };
  }, []);

  const handleAddProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(await dbService.getProducts());
  };

  const handleUpdateProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(await dbService.getProducts());
  };

  const handleDeleteProduct = async (id: string) => {
    await dbService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleClearProducts = async () => {
    await dbService.clearProducts();
    setProducts([]);
  };

  const handleSaveOrder = async (order: Order) => {
    try {
      await dbService.saveOrder(order);
      setOrders(prev => {
        const filtered = prev.filter(o => o.id !== order.id);
        return [order, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updated = { ...product, stock: Math.max(0, (product.stock || 0) - item.qty) };
          await dbService.saveProduct(updated);
        }
      }
      setProducts(await dbService.getProducts());
      setEditingCustomer(null);
      setEditingOrderId(null);
    } catch (error) {
      alert("Failed to save order.");
    }
  };

  const handleEditOrder = async (order: Order) => {
      // Find the order to get item details for stock restoration
      const orderToEdit = orders.find(o => o.id === order.id);
      if (orderToEdit) {
          // 1. Restore stock first so POS reflects correct available amounts
          for (const item of orderToEdit.items) {
              const product = products.find(p => p.id === item.id);
              if (product) {
                  await dbService.saveProduct({ ...product, stock: (product.stock || 0) + item.qty });
              }
          }
          
          // 2. We keep the order in DB until the replacement is saved or the session ends,
          // but for a clean "Edit" experience, we'll mark it as editing.
          // In this implementation, saving a new order with same ID overwrites it.
          setEditingOrderId(order.id);
          setCart(orderToEdit.items);
          if (orderToEdit.customer) setEditingCustomer(orderToEdit.customer);
          setProducts(await dbService.getProducts());
          setView('pos');
      }
  };

  const handleAddCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(await dbService.getCustomers());
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(await dbService.getCustomers());
  };

  const handleDeleteCustomer = async (id: string) => {
    await dbService.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const handleFactoryReset = async () => {
      await dbService.resetDatabase();
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setCart([]);
      setEditingOrderId(null);
      setEditingCustomer(null);
      setShopDetails(INITIAL_SHOP_DETAILS);
      await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);
  };

  const handleSaveSettings = async (details: ShopDetails) => {
    await dbService.saveShopDetails(details);
    setShopDetails(details);
  };

  if (loading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 font-medium animate-pulse">Initializing SmartPOS...</p>
        </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Failed to Start</h1>
        <p className="text-slate-500 max-w-md mb-8 leading-relaxed">Initialization error. Check logs for details.</p>
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-mono mb-8 max-w-lg break-all">{initError}</div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <nav className="w-20 lg:w-64 bg-slate-900 flex-shrink-0 flex flex-col justify-between text-slate-300 transition-all duration-300 print:hidden">
        <div>
          <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
            {shopDetails.logo ? (
               <img src={shopDetails.logo} alt="Logo" className="w-10 h-10 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
            )}
            <span className="ml-3 font-bold text-xl text-white hidden lg:block tracking-tight">SmartPOS</span>
          </div>
          <div className="p-4 space-y-2">
            <button onClick={() => setView('pos')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Store size={22} /><span className="font-medium hidden lg:block">Billing / POS</span></button>
            <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard size={22} /><span className="font-medium hidden lg:block">Stock Management</span></button>
            <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><ReceiptText size={22} /><span className="font-medium hidden lg:block">Order History</span></button>
            <button onClick={() => setView('customers')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'customers' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users size={22} /><span className="font-medium hidden lg:block">Customers</span></button>
            <button onClick={() => setView('analysis')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><BarChart3 size={22} /><span className="font-medium hidden lg:block">Sales Analysis</span></button>
            <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Settings size={22} /><span className="font-medium hidden lg:block">Settings</span></button>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 hover:text-red-400 transition-colors"><LogOut size={22} /><span className="font-medium hidden lg:block">Logout</span></button>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto scroll-smooth scroll-gpu">
          {view === 'pos' && (
            <POS 
                products={products} 
                customers={customers} 
                cart={cart} 
                setCart={setCart} 
                onSaveOrder={handleSaveOrder} 
                onSaveCustomer={handleAddCustomer} 
                shopDetails={shopDetails} 
                onManageStock={() => setView('inventory')} 
                onViewHistory={() => setView('history')} 
                initialCustomer={editingCustomer} 
                onAddProduct={handleAddProduct}
                editingOrderId={editingOrderId}
                onCancelEdit={() => { setEditingOrderId(null); setEditingCustomer(null); setCart([]); }}
            />
          )}
          {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onClearProducts={handleClearProducts} onNavigateToPos={() => setView('pos')} shopDetails={shopDetails} />}
          {view === 'history' && <History orders={orders} onDeleteOrder={async (id) => { const o = orders.find(x => x.id === id); if (o) { for (const item of o.items) { const p = products.find(y => y.id === item.id); if (p) await dbService.saveProduct({...p, stock: p.stock + item.qty}); } } await dbService.deleteOrder(id); setOrders(await dbService.getOrders()); setProducts(await dbService.getProducts()); }} onClearOrders={async () => { await dbService.clearOrders(); setOrders([]); }} onEditOrder={handleEditOrder} shopDetails={shopDetails} />}
          {view === 'analysis' && <DailyAnalysis orders={orders} shopDetails={shopDetails} />}
          {view === 'customers' && <Customers customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} />}
          {view === 'settings' && <ShopSettings shopDetails={shopDetails} onSave={handleSaveSettings} orders={orders} customers={customers} onClearOrders={async () => { await dbService.clearOrders(); setOrders([]); }} onClearProducts={handleClearProducts} onClearCustomers={async () => { await dbService.clearCustomers(); setCustomers([]); }} onFactoryReset={handleFactoryReset} onAddProduct={handleAddProduct} />}
        </div>
      </main>
    </div>
  );
};

export default App;
