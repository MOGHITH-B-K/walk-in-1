
import React, { useState, useMemo } from 'react';
import { Order, ShopDetails } from '../types';
import { Printer, Calendar, TrendingUp, ShoppingBag, DollarSign, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyAnalysisProps {
  orders: Order[];
  shopDetails: ShopDetails;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({ orders, shopDetails }) => {
  // Use local time for the default date to match the user's current day
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Offset for local timezone
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });

  const dailyOrders = useMemo(() => {
    return orders.filter(order => {
      // Order dates are typically stored in ISO (UTC).
      // We need to compare the Local Date representation of the order to the selected local date.
      const orderDate = new Date(order.date);
      const localOrderDate = new Date(orderDate.getTime() - (orderDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      return localOrderDate === selectedDate;
    });
  }, [orders, selectedDate]);

  const stats = useMemo(() => {
    const totalSales = dailyOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = dailyOrders.length;
    const avgOrder = orderCount > 0 ? totalSales / orderCount : 0;
    
    // Item Breakdown
    const itemMap = new Map<string, { qty: number, revenue: number }>();
    
    dailyOrders.forEach(order => {
      order.items.forEach(item => {
        // Create unique key for rentals with different durations
        const key = item.rentalDuration ? `${item.name} (${item.rentalDuration})` : item.name;
        
        const existing = itemMap.get(key) || { qty: 0, revenue: 0 };
        itemMap.set(key, {
          qty: existing.qty + item.qty,
          revenue: existing.revenue + (item.price * item.qty) // Excl tax for item breakdown
        });
      });
    });

    const itemBreakdown = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return { totalSales, orderCount, avgOrder, itemBreakdown };
  }, [dailyOrders]);

  const handleExportExcel = () => {
    if (stats.itemBreakdown.length === 0) return;

    const summaryData = [
      { 'Metric': 'Total Sales (Gross)', 'Value': stats.totalSales },
      { 'Metric': 'Total Orders', 'Value': stats.orderCount },
      { 'Metric': 'Average Ticket Size', 'Value': stats.avgOrder },
      { 'Metric': 'Selected Date', 'Value': selectedDate }
    ];

    const breakdownData = stats.itemBreakdown.map(item => ({
      'Product Name': item.name,
      'Quantity Sold': item.qty,
      'Revenue (Excl Tax)': item.revenue
    }));

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Report Summary");
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Itemized Breakdown");
    
    XLSX.writeFile(workbook, `Z_Report_${selectedDate}.xlsx`);
  };

  const handlePrint = () => {
     const content = document.getElementById('z-report-print');
     if (!content) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Z-Report-${selectedDate}</title>
            <style>
              body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; color: black; background: white; }
              .print-wrapper { max-width: 300px; margin: 0 auto; }
              
              h1, p, div { margin: 0; padding: 0; }
              
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              
              .w-full { width: 100%; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              
              .border-t { border-top: 1px solid black; }
              .border-dashed { border-style: dashed; }
              .border-black { border-color: black; }
              
              .text-lg { font-size: 18px; }
              .text-sm { font-size: 14px; }
              .text-xs { font-size: 12px; }
              
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-1 { margin-top: 4px; }
              .mt-4 { margin-top: 16px; }
              .pb-1 { padding-bottom: 4px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              
              table { width: 100%; border-collapse: collapse; }
              img { max-width: 100%; height: auto; }
              .grayscale { filter: grayscale(100%); }
            </style>
          </head>
          <body>
            <div class="print-wrapper">
              ${content.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Daily Sales Analysis</h2>
          <p className="text-slate-500 mt-1">Review performance and print End-of-Day (Z) Reports.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg"
            >
                <FileSpreadsheet size={18} /> Export Excel
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg"
            >
                <Printer size={18} /> Print Z-Report
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <DollarSign size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-800">₹{stats.totalSales.toFixed(2)}</p>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <ShoppingBag size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Orders</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.orderCount}</p>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Avg Order Value</p>
                    <p className="text-2xl font-bold text-slate-800">₹{stats.avgOrder.toFixed(2)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Item Breakdown Table (Screen View) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
         <div className="p-6 border-b border-slate-100">
             <h3 className="font-bold text-lg text-slate-800">Item Sales Breakdown</h3>
         </div>
         <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Item Name</th>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Qty Sold</th>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Revenue (Excl. Tax)</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {stats.itemBreakdown.length === 0 ? (
                     <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No sales recorded for this date.</td></tr>
                 ) : stats.itemBreakdown.map((item, idx) => (
                     <tr key={idx} className="hover:bg-slate-50">
                         <td className="px-6 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                         <td className="px-6 py-3 text-sm text-slate-600 text-right">{item.qty}</td>
                         <td className="px-6 py-3 text-sm text-slate-600 text-right">₹{item.revenue.toFixed(2)}</td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      {/* Print View - Z-Report Structure - Hidden from screen */}
      <div className="hidden">
        <div id="z-report-print">
            <div className="text-center mb-4">
                {shopDetails.logo && <img src={shopDetails.logo} className="h-12 mx-auto mb-2 grayscale object-contain" />}
                <h1 className="font-bold text-lg uppercase">{shopDetails.name}</h1>
                <p className="text-xs">Z-REPORT (Day End)</p>
                <p className="text-xs">{shopDetails.address}</p>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>
            
            <div className="flex justify-between text-xs mb-1">
                <span>Date:</span>
                <span>{selectedDate}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
                <span>Printed At:</span>
                <span>{new Date().toLocaleTimeString()}</span>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            <div className="mb-2">
                <div className="flex justify-between text-sm font-bold">
                    <span>Total Sales (Gross)</span>
                    <span>₹{stats.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Total Orders</span>
                    <span>{stats.orderCount}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Avg Ticket</span>
                    <span>₹{stats.avgOrder.toFixed(2)}</span>
                </div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            <div className="text-xs font-bold mb-2 uppercase">Category Breakdown</div>
            <table className="w-full text-xs">
                <thead>
                    <tr>
                        <th className="text-left pb-1">Item</th>
                        <th className="text-right pb-1">Qty</th>
                        <th className="text-right pb-1">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.itemBreakdown.map((item, i) => (
                        <tr key={i}>
                            <td className="pb-1">{item.name.substring(0, 15)}</td>
                            <td className="text-right pb-1">{item.qty}</td>
                            <td className="text-right pb-1">{item.revenue.toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-dashed border-black my-2"></div>
            <div className="text-center text-xs mt-4">
                *** END OF REPORT ***
            </div>
        </div>
      </div>

    </div>
  );
};
