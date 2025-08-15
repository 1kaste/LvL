import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { Theme, Sale, Product, KegInstance, ScheduledShift, TimeLog, PurchaseOrder, Supplier, MeasureUnit, ShiftStatus } from '../types';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import { FaDollarSign, FaShoppingCart, FaStar, FaFilePdf, FaPrint } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter';
import ReceiptModal from '../components/common/ReceiptModal';
import Toast from '../components/common/Toast';

interface ReportsProps {
  currentTheme: Theme;
}

// --- Helper Functions ---
const normalizeUnit = (value: number, unit: MeasureUnit): number => {
    if (unit === 'L' || unit === 'kg') {
        return value * 1000;
    }
    return value; // ml or g
};

const toYYYYMMDD = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getStatusText = (shift: { status: ShiftStatus | 'Awaiting Clock-In', actualClockOut?: Date }): string => {
    if (shift.status === 'Late') {
        return shift.actualClockOut ? 'Completed (Late)' : 'Ongoing (Late)';
    }
    return shift.status;
};


const Reports: React.FC<ReportsProps> = ({ currentTheme }) => {
  const location = useLocation();
  const { sales, storeSettings, products, kegInstances, scheduledShifts, timeLogs, purchaseOrders, suppliers } = useData();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [salesLogSearch, setSalesLogSearch] = useState(location.state?.searchQuery || '');
  const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);
  const [toastInfo, setToastInfo] = useState({ show: false, message: '' });

  useEffect(() => {
    if (location.state?.searchQuery) {
        setSalesLogSearch(location.state.searchQuery);
        window.history.replaceState({}, document.title)
    }
  }, [location.state]);


  const salesChartRef = useRef<HTMLDivElement>(null);
  const paymentChartRef = useRef<HTMLDivElement>(null);
  const topProductsChartRef = useRef<HTMLDivElement>(null);

  const summaryStats = useMemo(() => {
    if (sales.length === 0) {
      return { totalRevenue: 0, totalSales: 0, avgSaleValue: 0, topSellingItemName: 'N/A' };
    }
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = sales.length;
    
    const topSellingItems = sales.flatMap(sale => sale.items).reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);
      
    const topItem = Object.entries(topSellingItems).sort((a, b) => b[1] - a[1])[0];

    return { totalRevenue, totalSales, avgSaleValue: totalRevenue / totalSales, topSellingItemName: topItem ? topItem[0] : 'N/A' };
  }, [sales]);

  const salesByDay = useMemo(() => {
    const data = sales.reduce((acc, sale) => {
      const day = new Date(sale.date).toLocaleDateString('en-CA'); // Use YYYY-MM-DD for sorting
      acc[day] = (acc[day] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(data)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({ ...item, date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}));
  }, [sales]);
  
  const topProductsData = useMemo(() => {
    const productSales = sales.flatMap(sale => sale.items).reduce((acc, item) => {
      if (!acc[item.id]) acc[item.id] = { name: item.name, quantity: 0, revenue: 0 };
      acc[item.id].quantity += item.quantity;
      acc[item.id].revenue += item.quantity * item.price;
      return acc;
    }, {} as Record<string, {name: string, quantity: number, revenue: number}>);
      
    return Object.values(productSales).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales]);

  const salesByPaymentMethod = useMemo(() => {
      const data = sales.reduce((acc, sale) => {
          acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
          return acc; 
      }, {} as Record<string, number>);
      
      return Object.entries(data).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [sales]);

  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!salesLogSearch) {
        return sortedSales;
    }
    const lowercasedQuery = salesLogSearch.toLowerCase();
    return sortedSales.filter(sale => {
        const saleDate = new Date(sale.date).toLocaleString().toLowerCase();
        const itemsMatch = sale.items.some(item => item.name.toLowerCase().includes(lowercasedQuery));
        const totalMatch = sale.total.toFixed(2).includes(lowercasedQuery);
        return (
            sale.id.toLowerCase().includes(lowercasedQuery) ||
            sale.servedBy.toLowerCase().includes(lowercasedQuery) ||
            saleDate.includes(lowercasedQuery) ||
            sale.customerType.toLowerCase().includes(lowercasedQuery) ||
            itemsMatch ||
            totalMatch
        );
    });
  }, [sortedSales, salesLogSearch]);

  const PIE_COLORS_LIGHT = ['#fc6621', '#00848d', '#4CAF50'];
  const PIE_COLORS_DARK = ['#ea5314', '#00a3ad', '#66BB6A'];
  const COLORS = currentTheme === 'light' ? PIE_COLORS_LIGHT : PIE_COLORS_DARK;

  const handleGenerateSalesLog = async () => {
    if (filteredSales.length === 0) {
      alert("There are no sales to download in the current view.");
      return;
    }

    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;

    const tableColumns = ["ID", "Date", "Customer", "Items", "Served By", "Payment", "Total (Ksh)"];
    const tableRows = filteredSales.map(sale => [
        sale.id,
        new Date(sale.date).toLocaleString(),
        sale.customerType,
        sale.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
        sale.servedBy,
        sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1),
        sale.total.toFixed(2)
    ]);
    
    doc.setFontSize(18);
    doc.text("Sales Log Report", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    
    const reportDate = new Date().toLocaleString();
    const searchQueryText = salesLogSearch ? `Search Query: "${salesLogSearch}"` : "Showing all sales";
    doc.text(reportDate, 14, 36);
    doc.text(searchQueryText, 14, 42);

    autoTable(doc, {
        startY: 48,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: '#ea5314' },
        columnStyles: { 3: { cellWidth: 'auto' } },
        margin: { top: 40 },
        didDrawPage: (data) => {
            const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            
            // Header
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(storeSettings.storeName || '', 14, 10);
            doc.text(`${storeSettings.address || ''} | ${storeSettings.phone || ''}`, 14, 14);

            if (logoDataUrl) {
              try {
                  doc.addImage(logoDataUrl, pageWidth - 24, 8, 10, 10);
              } catch (e) {
                  console.error("Error adding store logo to PDF", e);
              }
            }

            // Footer
            if (storeSettings.showPdfFooter) {
                doc.setFontSize(8);
                doc.setTextColor(150);
                let textX = 14;

                if (footerLogoDataUrl) {
                    const imageSize = 8;
                    const circleRadius = 5;
                    const imageX = 14;
                    const imageY = pageHeight - 15;
                    const circleX = imageX + imageSize / 2;
                    const circleY = imageY + imageSize / 2;
                    
                    doc.setFillColor(229, 231, 235);
                    doc.circle(circleX, circleY, circleRadius, 'F');
                    doc.addImage(footerLogoDataUrl, imageX, imageY, imageSize, imageSize);
                    
                    textX = imageX + (circleRadius * 2) + 2;
                }
                
                if (storeSettings.pdfFooterText) {
                    const footerTextLines = (storeSettings.pdfFooterText || '').split('\n');
                    doc.text(footerTextLines, textX, pageHeight - 13);
                }
            }
            
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${data.pageNumber}`, pageWidth - 20, pageHeight - 10);
        }
    });

    doc.save(`jobiflow_sales-log_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateFullReport = async () => {
    if (!salesChartRef.current || !topProductsChartRef.current || !paymentChartRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
        const doc = new jsPDF();
        const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
        const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
            ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
            : null;

        const addHeader = (docInstance: jsPDF) => {
            const pageWidth = docInstance.internal.pageSize.width || docInstance.internal.pageSize.getWidth();
            docInstance.setFontSize(8);
            docInstance.setTextColor(150);
            docInstance.text(storeSettings.storeName || '', 14, 10);
            docInstance.text(`${storeSettings.address || ''} | ${storeSettings.phone || ''}`, 14, 14);
            if (logoDataUrl) {
                try {
                    docInstance.addImage(logoDataUrl, pageWidth - 24, 8, 10, 10);
                } catch (e) { console.error("Error adding store logo to PDF", e); }
            }
        };

        const addFooter = (docInstance: jsPDF, pageNum: number) => {
            const pageHeight = docInstance.internal.pageSize.height || docInstance.internal.pageSize.getHeight();
            const pageWidth = docInstance.internal.pageSize.width || docInstance.internal.pageSize.getWidth();
            
            if (storeSettings.showPdfFooter) {
                docInstance.setFontSize(8);
                docInstance.setTextColor(150);
                let textX = 14;

                if (footerLogoDataUrl) {
                    const imageSize = 8;
                    const circleRadius = 5;
                    const imageX = 14;
                    const imageY = pageHeight - 15;
                    const circleX = imageX + imageSize / 2;
                    const circleY = imageY + imageSize / 2;
                    
                    docInstance.setFillColor(229, 231, 235);
                    docInstance.circle(circleX, circleY, circleRadius, 'F');
                    docInstance.addImage(footerLogoDataUrl, imageX, imageY, imageSize, imageSize);
                    textX = imageX + (circleRadius * 2) + 2;
                }
                
                if (storeSettings.pdfFooterText) {
                    const footerTextLines = (storeSettings.pdfFooterText || '').split('\n');
                    docInstance.text(footerTextLines, textX, pageHeight - 13);
                }
            }
            
            docInstance.setFontSize(8);
            docInstance.setTextColor(150);
            docInstance.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 10);
        };
        
        const autoTableConfig = {
            margin: { top: 40 },
            didDrawPage: (data: any) => {
                addHeader(doc);
                addFooter(doc, data.pageNumber);
            }
        };

        // --- PAGE 1: Summary ---
        doc.setFontSize(18);
        doc.text("Comprehensive Business Report", 14, 28);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 36);

        doc.setFontSize(14);
        doc.text("Overall Performance Summary", 14, 50);
        autoTable(doc, {
            ...autoTableConfig,
            startY: 55,
            head: [['Metric', 'Value']],
            body: [
                ['Total Revenue', `Ksh ${summaryStats.totalRevenue.toFixed(2)}`],
                ['Total Sales', summaryStats.totalSales.toString()],
                ['Average Sale Value', `Ksh ${summaryStats.avgSaleValue.toFixed(2)}`],
                ['Top Selling Item', summaryStats.topSellingItemName],
            ],
            theme: 'grid',
            headStyles: { fillColor: '#ea5314' }
        });

        // --- PAGE 2: Charts ---
        const salesChartImg = await toPng(salesChartRef.current, { quality: 0.95, backgroundColor: currentTheme === 'light' ? 'white' : '#152c3a' });
        const topProductsImg = await toPng(topProductsChartRef.current, { quality: 0.95, backgroundColor: currentTheme === 'light' ? 'white' : '#152c3a' });
        const paymentMethodImg = await toPng(paymentChartRef.current, { quality: 0.95, backgroundColor: currentTheme === 'light' ? 'white' : '#152c3a' });

        doc.addPage();
        doc.setFontSize(14);
        doc.text("Sales Revenue Over Time", 14, 28);
        doc.addImage(salesChartImg, 'PNG', 14, 35, 180, 80);
        doc.text("Top 5 Products by Revenue", 14, 130);
        doc.addImage(topProductsImg, 'PNG', 14, 137, 90, 80);
        doc.text("Sales by Payment Method", 110, 130);
        doc.addImage(paymentMethodImg, 'PNG', 110, 137, 90, 80);

        // --- Sales by Server ---
        const salesPerServer = sales.reduce((acc, sale) => {
            const serverName = sale.servedBy;
            if (!acc[serverName]) {
                acc[serverName] = { totalRevenue: 0, salesCount: 0 };
            }
            acc[serverName].totalRevenue += sale.total;
            acc[serverName].salesCount += 1;
            return acc;
        }, {} as Record<string, { totalRevenue: number, salesCount: number }>);

        const salesPerServerArray = Object.entries(salesPerServer).map(([name, data]) => ({
            name,
            ...data,
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (salesPerServerArray.length > 0) {
            doc.addPage();
            doc.setFontSize(18);
            doc.text("Sales Analysis", 14, 28);
            autoTable(doc, { 
                ...autoTableConfig, 
                startY: 35, 
                head: [['Server', 'Number of Sales', 'Total Revenue (Ksh)']], 
                body: salesPerServerArray.map(s => [s.name, s.salesCount, s.totalRevenue.toFixed(2)]),
                theme: 'striped',
                headStyles: { fillColor: '#00848d' },
            });
        }
        
        // --- INVENTORY SECTION ---
        const productsWithDerivedInfo = products.map(p => {
            let derivedStock: number | string = p.stock;
            let stockLabel: string;
            if (p.productType === 'Service') {
                if (p.linkedKegProductId && p.servingSize && p.servingSizeUnit) {
                    const tappedKeg = kegInstances.find(k => k.productId === p.linkedKegProductId && k.status === 'Tapped');
                    if (tappedKeg) {
                        const normalizedServingSize = normalizeUnit(p.servingSize, p.servingSizeUnit);
                        derivedStock = normalizedServingSize > 0 ? Math.floor(tappedKeg.currentVolume / normalizedServingSize) : Infinity;
                        stockLabel = 'servings';
                    } else { derivedStock = 0; stockLabel = 'No Keg Tapped'; }
                } else { derivedStock = 'N/A'; stockLabel = 'Service'; }
            } else if (p.productType === 'Keg') { stockLabel = 'kegs'; } else { stockLabel = 'units'; }
            return { ...p, derivedStock, stockLabel };
        });
        
        const lowStockItems = productsWithDerivedInfo.filter(p => p.stock > 0 && typeof p.derivedStock === 'number' && p.derivedStock <= p.lowStockThreshold);

        doc.addPage();
        doc.setFontSize(18);
        doc.text("Inventory Report", 14, 28);
        autoTable(doc, { ...autoTableConfig, startY: 35, head: [['Name', 'Category', 'Type', 'Price (Ksh)', 'Stock']], body: productsWithDerivedInfo.map(p => [ p.name, p.category, p.productType, p.price.toFixed(2), typeof p.derivedStock === 'number' ? `${p.derivedStock} ${p.stockLabel}` : p.derivedStock ]) });
        if(lowStockItems.length > 0) {
            autoTable(doc, { ...autoTableConfig, head: [['Low Stock Items', 'Stock Left']], body: lowStockItems.map(p => [ p.name, `${p.derivedStock} ${p.stockLabel}`])});
        }

        // --- SHIFT SUMMARY ---
        const allProcessedShifts = scheduledShifts.map(shift => {
            const log = timeLogs.find(log => log.userId === shift.userId && toYYYYMMDD(new Date(log.clockInTime)) === shift.date);
            const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
            const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
            const now = new Date();
            let status: ShiftStatus | 'Awaiting Clock-In' = now > shiftEnd ? (log ? 'Completed' : 'Missed') : (now > shiftStart ? (log ? 'Ongoing' : 'Awaiting Clock-In') : 'Upcoming');
            if (log) {
                const clockInTime = new Date(log.clockInTime);
                const lateTime = new Date(shiftStart.getTime() + 5 * 60000);
                if (clockInTime > lateTime) status = 'Late';
            }
            return { ...shift, status, actualClockIn: log?.clockInTime, actualClockOut: log?.clockOutTime, hoursWorked: log?.durationHours };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        doc.addPage();
        doc.setFontSize(18);
        doc.text("Shift Summary", 14, 28);
        autoTable(doc, { ...autoTableConfig, startY: 35, head: [['Date', 'Employee', 'Scheduled', 'Clock In/Out', 'Hours', 'Status']], body: allProcessedShifts.map(s => [ s.date, s.userName, `${s.startTime}-${s.endTime}`, `${formatTime(s.actualClockIn)} - ${formatTime(s.actualClockOut)}`, s.hoursWorked?.toFixed(2) || 'N/A', getStatusText(s) ]) });

        // --- PURCHASE ORDERS, KEGS, SUPPLIERS ---
        doc.addPage();
        doc.setFontSize(18); doc.text("Purchasing & Suppliers", 14, 28);
        autoTable(doc, { ...autoTableConfig, startY: 35, head: [['PO Number', 'Supplier', 'Date', 'Status', 'Total (Ksh)']], body: purchaseOrders.map(p => [p.id, p.supplierName, p.orderDate.toLocaleDateString(), p.status, p.totalCost.toFixed(2)])});
        autoTable(doc, { ...autoTableConfig, head: [['Keg ID', 'Product', 'Status', 'Volume (L)', 'Tapped/Closed By']], body: kegInstances.map(k => [k.id.split('-').pop(), k.productName, k.status, `${(k.currentVolume / 1000).toFixed(2)}/${(k.capacity / 1000).toFixed(1)}`, k.tappedBy || k.closedBy || 'N/A']) });
        autoTable(doc, { ...autoTableConfig, head: [['Supplier', 'Contact Person', 'Phone', 'Email']], body: suppliers.map(s => [s.name, s.contactPerson, s.phone, s.email])});

        // --- FULL SALES LOG ---
        doc.addPage();
        doc.setFontSize(18);
        doc.text("Full Sales Log", 14, 28);
        autoTable(doc, { ...autoTableConfig, startY: 35, head: [["ID", "Date", "Customer", "Served By", "Payment", "Total"]], body: sortedSales.map(sale => [sale.id, new Date(sale.date).toLocaleString(), sale.customerType, sale.servedBy, sale.paymentMethod, `Ksh ${sale.total.toFixed(2)}`])});

        doc.save(`jobiflow_comprehensive-report_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch(error) {
        console.error("Error generating PDF:", error);
        alert("Could not generate PDF. Please try again.");
    } finally {
        setIsGeneratingPDF(false);
    }
  };


  return (
    <div className="space-y-6">
        <Card className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold">Sales Reports</h2>
            <Button onClick={handleGenerateFullReport} variant="secondary" icon={<FaFilePdf />} disabled={isGeneratingPDF}>
                {isGeneratingPDF ? "Generating..." : "Generate Full Report"}
            </Button>
        </Card>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="flex items-center"><FaDollarSign className="text-3xl text-green-500 mr-4"/><div className="flex-grow"><p className="text-gray-500 dark:text-gray-400">Total Revenue</p><p className="font-bold text-2xl">Ksh {summaryStats.totalRevenue.toFixed(2)}</p></div></Card>
            <Card className="flex items-center"><FaShoppingCart className="text-3xl text-primary-cyan-500 mr-4"/><div className="flex-grow"><p className="text-gray-500 dark:text-gray-400">Total Sales</p><p className="font-bold text-2xl">{summaryStats.totalSales}</p></div></Card>
            <Card className="flex items-center"><FaDollarSign className="text-3xl text-primary-orange-500 mr-4"/><div className="flex-grow"><p className="text-gray-500 dark:text-gray-400">Avg. Sale Value</p><p className="font-bold text-2xl">Ksh {summaryStats.avgSaleValue.toFixed(2)}</p></div></Card>
            <Card className="flex items-center"><FaStar className="text-3xl text-yellow-400 mr-4"/><div className="flex-grow"><p className="text-gray-500 dark:text-gray-400">Top Product</p><p className="font-bold text-lg truncate">{summaryStats.topSellingItemName}</p></div></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Sales Revenue Chart */}
            <Card>
                <div ref={salesChartRef} className="p-4 bg-white dark:bg-dark-mode-blue-900">
                    <h3 className="font-bold text-lg mb-4">Sales Revenue</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesByDay}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="date" stroke="rgb(156 163 175)" fontSize={12} />
                            <YAxis stroke="rgb(156 163 175)" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', borderColor: 'rgb(51 65 85)', color: 'white', borderRadius: '0.5rem' }}/>
                            <Line type="monotone" dataKey="revenue" name="Revenue (Ksh)" stroke="#fc6621" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Top Products Chart */}
            <Card>
                <div ref={topProductsChartRef} className="p-4 bg-white dark:bg-dark-mode-blue-900">
                    <h3 className="font-bold text-lg mb-4">Top 5 Products by Revenue</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis type="number" stroke="rgb(156 163 175)" fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke="rgb(156 163 175)" width={100} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', borderColor: 'rgb(51 65 85)', color: 'white', borderRadius: '0.5rem' }}/>
                            <Bar dataKey="revenue" name="Revenue (Ksh)" fill="#00848d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Chart */}
            <Card className="lg:col-span-1">
                <div ref={paymentChartRef} className="p-4 bg-white dark:bg-dark-mode-blue-900">
                    <h3 className="font-bold text-lg mb-4">Sales by Payment Method</h3>
                    <ResponsiveContainer width="100%" height={300}>
                         <PieChart>
                            <Pie
                                data={salesByPaymentMethod}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {salesByPaymentMethod.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', borderColor: 'rgb(51 65 85)', color: 'white', borderRadius: '0.5rem' }}/>
                             <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
            <div className="lg:col-span-1">
                {/* Placeholder for future content */}
            </div>
        </div>
        
        {/* Recent Sales Log */}
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="font-bold text-lg">Recent Sales Log</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <SearchInput
                    value={salesLogSearch}
                    onChange={(e) => setSalesLogSearch(e.target.value)}
                    placeholder="Search ID, server, item, amount..."
                    className="w-full sm:w-64"
                />
                <Button onClick={handleGenerateSalesLog} variant="secondary" icon={<FaFilePdf />} className="w-full sm:w-auto">
                    Generate Log PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm dark:text-gray-200">
                    <thead className="border-b dark:border-dark-mode-blue-700 sticky top-0 bg-white dark:bg-dark-mode-blue-900">
                        <tr>
                            <th className="p-2">Sale ID</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Customer</th>
                            <th className="p-2">Items</th>
                            <th className="p-2">Served By</th>
                            <th className="p-2">Payment</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map(sale => (
                            <tr key={sale.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                                <td className="p-2 font-mono text-xs">{sale.id}</td>
                                <td className="p-2">{new Date(sale.date).toLocaleString()}</td>
                                <td className="p-2">{sale.customerType}</td>
                                <td className="p-2 max-w-xs truncate">{sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                                <td className="p-2">{sale.servedBy}</td>
                                <td className="p-2 capitalize">{sale.paymentMethod}</td>
                                <td className="p-2 text-right font-semibold">Ksh {sale.total.toFixed(2)}</td>
                                <td className="p-2 text-center">
                                    <Button variant="secondary" className="!p-2" onClick={() => setReceiptModalSale(sale)} title="Print Receipt">
                                        <FaPrint />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredSales.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">
                           {salesLogSearch ? 'No sales found matching your search.' : 'No sales data available.'}
                        </p>
                    </div>
                )}
            </div>
        </Card>

        {receiptModalSale && (
            <ReceiptModal
                isOpen={!!receiptModalSale}
                onClose={() => setReceiptModalSale(null)}
                sale={receiptModalSale}
                settings={storeSettings}
                onPrintSuccess={() => setToastInfo({ show: true, message: 'Print command sent!' })}
            />
        )}
        <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: ''})} />

    </div>
  );
};

export default Reports;