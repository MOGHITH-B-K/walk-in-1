
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, ShoppingCart, Coffee, Utensils, CreditCard, ToggleLeft, ToggleRight, AlertCircle, Package, User, Phone, MapPin, ChevronDown, ChevronUp, History, Clock, Plus, X, Sparkles, Loader2, Tag, Upload, Image as ImageIcon, Edit3, RotateCcw } from 'lucide-react';
import { Product, CartItem, Order, ShopDetails, Customer } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ReceiptModal } from '../components/ReceiptModal';
import { dbService } from '../services/db';
import { generateProductDetails } from '../services/gemini';

interface POSProps {
  products: Product[];
  customers: Customer[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onSaveOrder: (order: Order) => void;
  onSaveCustomer: (customer: Customer) => void;
  shopDetails: ShopDetails;
  onManageStock: () => void;
  onViewHistory: () => void;
  initialCustomer?: { name: string; phone: string; place: string } | null;
  onAddProduct: (product: Product) => Promise<void>;
  editingOrderId?: string | null;
  onCancelEdit?: () => void;
}

export const POS: React.FC<POSProps> = ({ 
    products, 
    customers, 
    cart, 
    setCart, 
    onSaveOrder, 
    onSaveCustomer,
    shopDetails, 
    onManageStock,
    onViewHistory,
    initialCustomer,
    onAddProduct,
    editingOrderId,
    onCancelEdit
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualQtyMode, setManualQtyMode] = useState(false);
  const [qtyPromptProduct, setQtyPromptProduct] = useState<Product | null>(null);
  const [qtyPromptValue, setQtyPromptValue] = useState<string>('1');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPlace, setCustomerPlace] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isCustomerSectionOpen, setIsCustomerSectionOpen] = useState(true);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Quick Add Product Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<Partial<Product>>({
      name: '',
      price: 0,
      stock: 0,
      category: 'Beverages'
  });
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Initialize customer state from prop if editing an order
  useEffect(() => {
    if (initialCustomer) {
      setCustomerName(initialCustomer.name || '');
      setCustomerPhone(initialCustomer.phone || '');
      setCustomerPlace(initialCustomer.place || '');
      setIsCustomerSectionOpen(true);
    }
  }, [initialCustomer]);

  // Filter customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerPhone && !customerName) return [];
    const term = (customerPhone || customerName).toLowerCase();
    return customers.filter(c => 
        c.phone.includes(term) || c.name.toLowerCase().includes(term)
    ).slice(0, 5); // Limit suggestions
  }, [customers, customerPhone, customerName]);

  // Click outside to close search suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowCustomerSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerPlace(customer.place);
    setShowCustomerSearch(false);
  };

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cart]);

  const taxTotal = useMemo(() => {
    if (!shopDetails.taxEnabled) return 0;
    
    return cart.reduce((sum, item) => {
        const rate = item.taxRate !== undefined ? item.taxRate : shopDetails.defaultTaxRate;
        const itemTax = (item.price * item.qty) * (rate / 100);
        return sum + itemTax;
    }, 0);
  }, [cart, shopDetails]);

  const grandTotal = subTotal + taxTotal;

  const dynamicCategories = useMemo(() => {
      const cats = new Set(products.map(p => p.category));
      return Array.from(cats).sort();
  }, [products]);

  const availableCategories = dynamicCategories.length > 0 ? dynamicCategories : ['General'];

  useEffect(() => {
      if (selectedCategory !== 'All' && !dynamicCategories.includes(selectedCategory)) {
          setSelectedCategory('All');
      }
  }, [dynamicCategories, selectedCategory]);

  // Handlers
  const initiateAddToCart = (product: Product) => {
    if (manualQtyMode) {
      setQtyPromptProduct(product);
      setQtyPromptValue('1');
    } else {
      addToCart(product, 1);
    }
  };

  const confirmQtyAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyPromptProduct) {
      const qty = parseInt(qtyPromptValue) || 1;
      addToCart(qtyPromptProduct, qty);
      setQtyPromptProduct(null);
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQtyInCart = existing ? existing.qty : 0;
      const totalRequested = currentQtyInCart + quantity;

      if (totalRequested > product.stock) {
        alert(`Only ${product.stock} items available.`);
        return prev;
      }

      const taxRate = product.taxRate !== undefined ? product.taxRate : shopDetails.defaultTaxRate;
      const productWithTax = { ...product, taxRate };

      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { ...productWithTax, qty: quantity }];
    });
  };

  const updateQty = (id: string, newQty: string) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;
    
    const product = products.find(p => p.id === id);
    if (product && qty > product.stock) {
        alert(`Max available: ${product.stock}`);
        return;
    }

    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, qty } : item
    ));
  };

  const updateItemName = (id: string, newName: string) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, name: newName } : item
    ));
  };

  const updateItemPrice = (id: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, price } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    if (editingOrderId) {
        if (window.confirm("Cancel editing this order? Changes will be lost.")) {
            onCancelEdit?.();
        }
    } else {
        if(window.confirm("Clear the current bill?")) {
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerPlace('');
        }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    
    try {
        if (customerPhone && customerName) {
            const existingCustomer = customers.find(c => c.phone === customerPhone);
            if (!existingCustomer) {
                const newCustomer: Customer = {
                    id: Date.now().toString(),
                    name: customerName,
                    phone: customerPhone,
                    place: customerPlace || ''
                };
                onSaveCustomer(newCustomer);
            }
        }

        // Use the existing order ID if we are editing
        const orderId = editingOrderId || await dbService.getNextOrderId();

        const newOrder: Order = {
          id: orderId,
          date: new Date().toISOString(),
          items: [...cart],
          total: grandTotal,
          taxTotal: taxTotal,
          customer: (customerName || customerPhone) ? {
              name: customerName,
              phone: customerPhone,
              place: customerPlace
          } : undefined
        };

        onSaveOrder(newOrder);
        setLastOrder(newOrder);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerPlace('');
    } catch (error) {
        console.error("Checkout failed:", error);
        alert("Failed to process order.");
    } finally {
        setIsCheckingOut(false);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickAddProduct.name || quickAddProduct.price === undefined) return;
      
      const newProduct: Product = {
          id: Date.now().toString(),
          name: quickAddProduct.name,
          price: Number(quickAddProduct.price),
          stock: Number(quickAddProduct.stock),
          category: quickAddProduct.category || 'General',
          taxRate: shopDetails.defaultTaxRate,
          minStockLevel: 5,
          image: quickAddProduct.image,
          description: quickAddProduct.description
      };
      
      await onAddProduct(newProduct);
      addToCart(newProduct, 1);
      setQuickAddProduct({ name: '', price: 0, stock: 0, category: 'Beverages' });
      setIsQuickAddOpen(false);
  };
  
  const handleAIGenerate = async () => {
    if (!quickAddProduct.name) return;
    setIsLoadingAI(true);
    const data = await generateProductDetails(quickAddProduct.name, shopDetails.aiDescriptionPrompt);
    if (data) {
      setQuickAddProduct(prev => ({
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
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            setQuickAddProduct(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* Left Side: Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
             <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-bold text-slate-800">Menu</h2>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setIsQuickAddOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                    <button onClick={onManageStock} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200">
                      <Package size={14} /> Stock
                    </button>
                    <button onClick={onViewHistory} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200">
                      <History size={14} /> History
                    </button>
                 </div>
             </div>
             <button onClick={() => setManualQtyMode(!manualQtyMode)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                {manualQtyMode ? <ToggleRight className="text-blue-600" size={24} /> : <ToggleLeft className="text-slate-400" size={24} />}
                <span className="font-medium">Manual Qty</span>
             </button>
          </div>

          {editingOrderId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg"><Edit3 size={16}/></div>
                    <div>
                        <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Editing Order #{editingOrderId}</p>
                        <p className="text-[10px] text-blue-600">Stock has been temporarily restored for editing.</p>
                    </div>
                </div>
                <button onClick={onCancelEdit} className="px-3 py-1.5 bg-white text-blue-600 text-[10px] font-black uppercase rounded-lg border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-1">
                    <RotateCcw size={12}/> Cancel Edit
                </button>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
              <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>All</button>
              {dynamicCategories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Coffee size={48} className="mb-2 opacity-20" />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => <ProductCard key={product.id} product={product} onAdd={initiateAddToCart} />)}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Billing Cart */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-8rem)] lg:h-auto sticky top-4">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" />
              {editingOrderId ? 'Update Order' : 'Current Bill'}
            </h3>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{cart.length} Items</span>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white" ref={searchWrapperRef}>
            <button onClick={() => setIsCustomerSectionOpen(!isCustomerSectionOpen)} className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 hover:text-blue-600">
                <span>Customer Info</span>
                {isCustomerSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {isCustomerSectionOpen && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Phone size={14} /></div>
                        <input type="tel" placeholder="Phone (Search)" className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setShowCustomerSearch(true); }} onFocus={() => setShowCustomerSearch(true)} />
                        {showCustomerSearch && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {filteredCustomers.map(customer => (
                                    <div key={customer.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-0" onClick={() => selectCustomer(customer)}>
                                        <span className="text-sm font-bold text-slate-800">{customer.name}</span>
                                        <span className="text-xs text-slate-500">{customer.phone}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><User size={14} /></div>
                        <input type="text" placeholder="Name" className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                </div>
            )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Utensils size={24} className="opacity-30" />
              </div>
              <p className="text-sm">Bill is empty.</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={item.id} className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-blue-100 hover:bg-white transition-all">
                {/* Serial Number Badge */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-slate-200 text-slate-500 rounded-full text-[10px] font-black font-mono">
                  {index + 1}
                </div>
                
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm border border-slate-100">{item.qty}x</div>
                <div className="flex-1 min-w-0">
                    <input 
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemName(item.id, e.target.value)}
                      className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-all truncate"
                      title="Edit item name for this bill"
                    />
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <input type="number" step="0.01" value={item.price} onChange={(e) => updateItemPrice(item.id, e.target.value)} className="w-14 bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none" />
                        <span>/ unit</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-slate-800 text-sm">₹{(item.price * item.qty).toFixed(2)}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <input type="number" min="1" className="w-10 h-6 text-xs text-center border rounded bg-white" value={item.qty} onChange={(e) => updateQty(item.id, e.target.value)} />
                     <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
            {shopDetails.taxEnabled && <div className="flex justify-between text-xs text-slate-500"><span>Tax</span><span>₹{taxTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="font-bold text-blue-600 text-lg">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button onClick={clearCart} disabled={isCheckingOut} className="py-2.5 rounded-xl text-slate-600 font-bold text-xs bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50">{editingOrderId ? 'Cancel Edit' : 'Clear'}</button>
            <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className="py-2.5 rounded-xl text-white font-bold text-xs bg-slate-900 hover:bg-blue-600 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              <CreditCard size={14} /> {isCheckingOut ? 'Saving...' : editingOrderId ? 'Update Bill' : 'Pay & Print'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Quantity Modal */}
      {qtyPromptProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold mb-4">Quantity for {qtyPromptProduct.name}</h3>
                <form onSubmit={confirmQtyAddToCart}>
                    <input type="number" min="1" max={qtyPromptProduct.stock} autoFocus className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl mb-4" value={qtyPromptValue} onChange={(e) => setQtyPromptValue(e.target.value)} />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setQtyPromptProduct(null)} className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600">Cancel</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 text-white">Add</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastOrder && <ReceiptModal order={lastOrder} shopDetails={shopDetails} onClose={() => setLastOrder(null)} autoPrint={true} />}
    </div>
  );
};
