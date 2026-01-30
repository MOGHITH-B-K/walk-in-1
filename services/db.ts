import { supabase } from './supabaseClient';
import { Product, Order, ShopDetails, Customer } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SETTINGS: 'settings'
};

const compressImage = async (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const getLocal = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (e) { return []; }
};

const setLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local Storage Error:", e);
  }
};

export const dbService = {
  isConfigured: () => {
    try {
      const url = (supabase as any).supabaseUrl || "";
      return url && !url.includes('placeholder.supabase.co');
    } catch {
      return false;
    }
  },

  subscribeToTables(handlers: Record<string, (payload: any) => void>): RealtimeChannel | null {
    if (!this.isConfigured()) return null;
    try {
      const channel = supabase.channel('main_db_changes');
      channel
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
              const table = payload.table;
              if (handlers[table]) handlers[table](payload);
          })
        .subscribe();
      return channel;
    } catch (e) {
      console.error("Realtime subscription failed:", e);
      return null;
    }
  },

  unsubscribe(channel: RealtimeChannel) {
    if (channel) supabase.removeChannel(channel);
  },

  async getProducts() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data as Product[];
    } catch (error) {
      return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    }
  },

  async saveProduct(product: Product) {
    let finalImage = product.image;
    if (finalImage && finalImage.startsWith('data:image')) {
      finalImage = await compressImage(finalImage);
    }
    
    const updatedProduct = { ...product, image: finalImage };
    const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    const index = products.findIndex(p => p.id === product.id);
    
    if (index >= 0) products[index] = updatedProduct;
    else products.push(updatedProduct);
    
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products);

    if (this.isConfigured()) {
      try {
        const { error } = await supabase.from('products').upsert(updatedProduct);
        if (error) throw error;
      } catch (error) {
        console.error("Cloud product save failed:", error);
      }
    }
  },

  async deleteProduct(id: string) {
    const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products.filter(p => p.id !== id));
    if (this.isConfigured()) {
      await supabase.from('products').delete().eq('id', id);
    }
  },

  async clearProducts() {
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, []);
    if (this.isConfigured()) {
      await supabase.from('products').delete().neq('id', '0');
    }
  },

  async getOrders() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    try {
      const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Order[];
    } catch (error) {
      return getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    }
  },

  async getNextOrderId() {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    const maxLocal = orders.reduce((max, order) => {
      const numId = parseInt(order.id, 10);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);
    
    if (!this.isConfigured()) return (maxLocal + 1).toString();
    
    try {
      // Fetch only the latest ID to find the max
      const { data } = await supabase.from('orders').select('id').order('id', { ascending: false }).limit(1);
      const maxCloud = (data && data.length > 0) ? parseInt(data[0].id, 10) : 0;
      return (Math.max(maxLocal, isNaN(maxCloud) ? 0 : maxCloud) + 1).toString();
    } catch {
      return (maxLocal + 1).toString();
    }
  },

  async saveOrder(order: Order) {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) orders[index] = order;
    else orders.push(order);
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders);

    if (this.isConfigured()) {
      try {
        const { error } = await supabase.from('orders').upsert(order);
        if (error) throw error;
      } catch (error) {
        console.error("Cloud order save failed:", error);
      }
    }
  },

  async deleteOrder(id: string) {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders.filter(o => o.id !== id));
    if (this.isConfigured()) {
      await supabase.from('orders').delete().eq('id', id);
    }
  },

  async clearOrders() {
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, []);
    if (this.isConfigured()) {
      await supabase.from('orders').delete().neq('id', '0');
    }
  },

  async getCustomers() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data as Customer[];
    } catch (error) {
      return getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    }
  },

  async saveCustomer(customer: Customer) {
    const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) customers[index] = customer;
    else customers.push(customer);
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);
    if (this.isConfigured()) {
      await supabase.from('customers').upsert(customer);
    }
  },

  async deleteCustomer(id: string) {
    const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    if (this.isConfigured()) {
      await supabase.from('customers').delete().eq('id', id);
    }
  },

  async clearCustomers() {
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, []);
    if (this.isConfigured()) {
      await supabase.from('customers').delete().neq('id', '0');
    }
  },

  async getShopDetails() {
    const localSettings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS);
    const mainDetails = localSettings?.main_details || null;
    if (!this.isConfigured()) return mainDetails;
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 'main_details').maybeSingle();
      return data || mainDetails;
    } catch {
      return mainDetails;
    }
  },

  async saveShopDetails(details: ShopDetails) {
    const payload = { ...details, id: 'main_details' };
    const settings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS) || {};
    settings.main_details = payload;
    setLocal(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    if (this.isConfigured()) {
      await supabase.from('settings').upsert(payload);
    }
  },

  async resetDatabase() {
    localStorage.clear();
    if (this.isConfigured()) {
      try {
        await Promise.all([
          supabase.from('products').delete().neq('id', '0'),
          supabase.from('orders').delete().neq('id', '0'),
          supabase.from('customers').delete().neq('id', '0'),
          supabase.from('settings').delete().neq('id', '0')
        ]);
      } catch (e) {
        console.error("Cloud reset failed:", e);
      }
    }
  }
};