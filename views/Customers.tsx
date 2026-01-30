import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Search, User, Phone, MapPin, Users, FileSpreadsheet } from 'lucide-react';
import { Customer } from '../types';
import * as XLSX from 'xlsx';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const Customers: React.FC<CustomersProps> = ({ 
  customers, 
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    place: ''
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', place: '' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    if (customers.length === 0) return;
    const data = customers.map(c => ({
      'Name': c.name,
      'Phone': c.phone,
      'Place': c.place
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    const customerData = {
        ...formData,
        id: editingId || Date.now().toString()
    } as Customer;

    if (editingId) {
        await onUpdateCustomer(customerData);
    } else {
        await onAddCustomer(customerData);
    }
    resetForm();
  };

  const handleEdit = (customer: Customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await onDeleteCustomer(id);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery) ||
    c.place.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Customer Details</h2>
          <p className="text-slate-500 mt-1">Manage your customer database.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-all shadow-sm"
            >
                <FileSpreadsheet size={18} /> Export Excel
            </button>
            <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                />
            </div>
            <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
                <Plus size={18} /> Add Customer
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Place</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Users size={32} className="opacity-20" />
                            <span>No customers found.</span>
                        </div>
                    </td>
                </tr>
            ) : filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {customer.name.charAt(0).toUpperCase()}
                    </div>
                    {customer.name}
                </td>
                <td className="px-6 py-4 text-slate-600">{customer.phone}</td>
                <td className="px-6 py-4 text-slate-600">{customer.place}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                        placeholder="e.g. John Doe"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="tel" 
                        required 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                        placeholder="e.g. 9876543210"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Place / Address</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={formData.place} 
                        onChange={(e) => setFormData({...formData, place: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                        placeholder="e.g. Tech Park"
                    />
                </div>
              </div>

              <div className="pt-2">
                <button 
                    type="submit" 
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                    {editingId ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};