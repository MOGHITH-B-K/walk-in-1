
import React, { useState, useMemo, useRef } from 'react';
import { Calendar, Search, Trash2, Clock, ChevronDown, ChevronUp, Tag, FileArchive, Loader2, CheckCircle2, FileSpreadsheet, Edit3 } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

interface HistoryProps {
  orders: Order[];
  onDeleteOrder: (id: string) => Promise<void>;
  onClearOrders: () => Promise<void>;
  onEditOrder: (order: Order) => void;
  shopDetails: ShopDetails;
}

export const History: React.FC<HistoryProps> = ({ orders, onDeleteOrder, onClearOrders, onEditOrder, shopDetails }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const hiddenReceiptRef = useRef<HTMLDivElement>(null);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const orderDate = new Date(order.date);
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (order.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (order.customer?.phone || '').includes(searchTerm);
        
        let matchesDate = true;
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && orderDate >= from;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && orderDate <= to;
        }

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchTerm, dateFrom, dateTo]);

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return;
    const data = filteredOrders.map(order => ({
      'Order ID': order.id,
      'Date': new Date(order.date).toLocaleString(),
      'Customer': order.customer?.name || 'Walk-in',
      'Phone': order.customer?.phone || '',
      'Total': order.total
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadAll = async () => {
    if (filteredOrders.length === 0) return;
    setIsDownloadingAll(true);
    const zip = new JSZip();
    const container = hiddenReceiptRef.current;
    if (!container) return setIsDownloadingAll(false);

    try {
      for (let i = 0; i < filteredOrders.length; i++) {
        const order = filteredOrders[i];
        setDownloadProgress({ current: i + 1, total: filteredOrders.length });
        container.innerHTML = `<div style="width:300px;padding:20px;background:white;font-family:Courier New,monospace;"><h1>#${order.id}</h1><p>${new Date(order.date).toLocaleString()}</p></div>`;
        const canvas = await html2canvas(container);
        zip.file(`${order.id}.png`, canvas.toDataURL().split(',')[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "Bills.zip";
      link.click();
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <div ref={hiddenReceiptRef} style={{ position: 'fixed', left: '-9999px', top: '0' }}></div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Order History</h2>
          <p className="text-slate-500 mt-1">Review past transactions and update existing bills.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm"><FileSpreadsheet size={18} /> Export Excel</button>
          <button onClick={() => filteredOrders.length > 0 && onClearOrders()} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-bold"><Trash2 size={18} /> Clear History</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-100 bg-slate-50/50 text-sm outline-none" />
        </div>
        <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">View</th>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No matching orders.</td></tr>
            ) : filteredOrders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-slate-50/80 group transition-colors ${expandedOrderId === order.id ? 'bg-slate-50' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className={`p-1.5 rounded-lg border transition-all ${expandedOrderId === order.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600'}`}>
                          {expandedOrderId === order.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600 text-xs">#{order.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{order.customer?.name || 'Walk-in'}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="flex items-center gap-1"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1 mt-0.5"><Clock size={12}/> {new Date(order.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">₹{order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                          <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className="px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200">Items</button>
                          <button onClick={() => setSelectedOrder(order)} className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all">Receipt</button>
                          <button onClick={() => onEditOrder(order)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit and Update Order"><Edit3 size={16}/></button>
                          <button onClick={() => onDeleteOrder(order.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-xl">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Item Breakdown</h4>
                            <div className="space-y-1">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                                  <span className="font-bold text-slate-800">{it.name} <span className="text-slate-400 ml-1">x{it.qty}</span></span>
                                  <span className="font-mono text-slate-600">₹{(it.price * it.qty).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>
      {selectedOrder && <ReceiptModal order={selectedOrder} shopDetails={shopDetails} onClose={() => setSelectedOrder(null)} autoPrint={false} />}
    </div>
  );
};
