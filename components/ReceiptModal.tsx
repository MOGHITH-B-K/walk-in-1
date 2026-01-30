
import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  order: Order | null;
  shopDetails: ShopDetails;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, shopDetails, onClose, autoPrint = false }) => {
  const [isPrinting, setIsPrinting] = useState(autoPrint);

  const handlePrint = () => {
    const content = document.getElementById('printable-receipt');
    if (!content) {
        setIsPrinting(false);
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt-${order?.id}</title>
            <style>
              @page { size: auto; margin: 0; }
              body { 
                margin: 0; 
                padding: 15px; 
                font-family: 'Courier New', Courier, monospace; 
                color: #000; 
                background: #fff;
                width: 300px;
                font-size: 12px;
              }
              .print-wrapper { width: 100%; }
              h1 { font-size: 18px; font-weight: bold; margin: 5px 0; }
              p, div { margin: 0; padding: 0; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .flex { display: flex; }
              .items-center { align-items: center; }
              .justify-between { justify-content: space-between; }
              .justify-center { justify-content: center; }
              .gap-1 { gap: 4px; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .font-mono { font-family: 'Courier New', Courier, monospace; }
              .w-full { width: 100%; }
              .border-t { border-top: 1px solid #000; }
              .border-b { border-bottom: 1px solid #000; }
              .border-y { border-top: 1px solid #000; border-bottom: 1px solid #000; }
              .border-dashed { border-style: dashed; border-width: 1px 0 0 0; border-color: #000; }
              .text-2xl { font-size: 22px; }
              .text-xl { font-size: 18px; }
              .text-lg { font-size: 16px; }
              .text-sm { font-size: 11px; }
              .text-xs { font-size: 10px; }
              .text-\\[10px\\] { font-size: 10px; }
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-1 { margin-top: 4px; }
              .mt-2 { margin-top: 8px; }
              .mt-4 { margin-top: 16px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .py-1 { padding: 4px 0; }
              .py-2 { padding: 8px 0; }
              .whitespace-pre-wrap { white-space: pre-wrap; }
              .leading-tight { leading: 1.2; }
              .tracking-widest { letter-spacing: 0.1em; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
              th { border-bottom: 1px solid #000; }
              td, th { padding: 4px 0; vertical-align: top; }
              img { max-width: 100%; height: auto; }
              .grayscale { filter: grayscale(100%); }
              .shrink-0 { flex-shrink: 0; }
              .w-24 { width: 96px; }
              .h-24 { height: 96px; }
              .w-5 { width: 20px; }
              .h-5 { height: 20px; }
              .rounded-full { border-radius: 9999px; }
              .bg-slate-200 { background-color: #e2e8f0; }
              .text-slate-500 { color: #64748b; }
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

      const triggerPrint = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          setTimeout(() => {
              document.body.removeChild(iframe);
              setIsPrinting(false);
              if (autoPrint) {
                  onClose();
              }
          }, 500);
        }, 300);
      };

      // Ensure images are loaded before printing to avoid blank segments
      const images = doc.getElementsByTagName('img');
      if (images.length === 0) {
        triggerPrint();
      } else {
        let loaded = 0;
        const total = images.length;
        const onImgLoad = () => {
          loaded++;
          if (loaded === total) triggerPrint();
        };
        for (let i = 0; i < total; i++) {
          if (images[i].complete) onImgLoad();
          else {
            images[i].onload = onImgLoad;
            images[i].onerror = onImgLoad;
          }
        }
      }
    }
  };

  useEffect(() => {
    if (autoPrint && order) {
      const timer = setTimeout(() => {
          handlePrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, order]);

  const handleDownload = async () => {
    const element = document.getElementById('printable-receipt');
    if (element) {
        const originalStyle = element.style.cssText;
        element.style.background = 'white';
        element.style.padding = '20px'; 
        element.style.width = '350px'; 
        element.style.margin = '0 auto';
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `Receipt_${order?.id || 'doc'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate receipt image", err);
        } finally {
            element.style.cssText = originalStyle;
        }
    }
  };

  if (!order) return null;
  const subTotal = order.total - (order.taxTotal || 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-800">Transaction Details</h3>
              {isPrinting && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Printing...</span>}
          </div>
          <div className="flex gap-2">
             <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
              <Download size={16} /> Save
            </button>
            <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70">
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-slate-50 flex-1 p-8">
            <div id="printable-receipt" className="max-w-[300px] mx-auto bg-white p-4 shadow-sm font-mono">
                <div className="text-center mb-4">
                    {shopDetails.showLogo && shopDetails.logo && (
                        <div className="flex justify-center mb-2">
                            <img src={shopDetails.logo} alt="Logo" className="h-12 object-contain grayscale" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-black uppercase tracking-widest mb-1">{shopDetails.name}</h1>
                    <p className="text-[10px] text-black whitespace-pre-wrap leading-tight">{shopDetails.address}</p>
                    {shopDetails.phone && <p className="text-[10px] text-black mt-1">Tel: {shopDetails.phone}</p>}
                </div>

                <div className="text-center my-4 border-y border-black py-2">
                    <div className="text-[10px] uppercase font-bold text-black">Order Transaction ID</div>
                    <div className="text-xl font-black tracking-widest text-black"># {order.id}</div>
                </div>

                <div className="flex justify-between text-xs text-black">
                    <span>Date:</span>
                    <span>{new Date(order.date).toLocaleString()}</span>
                </div>
                {order.customer && (
                    <div className="mt-2 text-[10px] text-black border-t border-dashed border-slate-300 pt-2">
                        {order.customer.name && <div>Cust: {order.customer.name}</div>}
                        {order.customer.phone && <div>Ph: {order.customer.phone}</div>}
                    </div>
                )}
                <div className="border-t border-dashed border-black my-2"></div>
                <table className="w-full text-xs mb-2">
                    <thead className="text-black">
                    <tr>
                        <th className="text-left py-1">#</th>
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Amt</th>
                    </tr>
                    </thead>
                    <tbody>
                    {order.items.map((item, index) => (
                        <tr key={`${item.id}-${index}`}>
                        <td className="py-1 text-black align-top pr-1 text-[10px]">{index + 1}</td>
                        <td className="py-1 text-black align-top">{item.name}</td>
                        <td className="py-1 text-center text-black align-top">{item.qty}</td>
                        <td className="py-1 text-right font-medium text-black align-top">{(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <div className="border-t border-dashed border-black my-2"></div>
                <div className="space-y-1 text-xs text-black">
                    <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{subTotal.toFixed(2)}</span>
                    </div>
                    {shopDetails.taxEnabled ? (
                        <div className="flex justify-between">
                        <span>Tax Total</span>
                        <span>{order.taxTotal.toFixed(2)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between text-slate-400">
                        <span>Tax</span>
                        <span>0.00</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t border-black">
                    <span>TOTAL</span>
                    <span>₹{order.total.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-6 text-center space-y-4">
                    {shopDetails.showPaymentQr && shopDetails.paymentQrCode && (
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[10px] font-bold text-black uppercase">Scan to Pay</p>
                            <img src={shopDetails.paymentQrCode} alt="Payment QR" className="w-24 h-24 border border-black p-1" />
                        </div>
                    )}
                    <p className="text-[10px] text-black whitespace-pre-wrap">{shopDetails.footerMessage}</p>
                    <p className="text-[8px] text-black pt-2 opacity-50 uppercase tracking-widest">{shopDetails.poweredByText || 'Powered by SmartPOS'}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
