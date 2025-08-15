import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { KegInstance, Product } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SearchInput from '../components/common/SearchInput';
import Toast from '../components/common/Toast';
import { FaPlus, FaBeer, FaTint, FaFileAlt, FaSignOutAlt, FaHistory, FaCheckCircle, FaFilePdf } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter';

// --- Add Keg Modal ---
const AddKegModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAdd: (productId: string, count: number) => void;
}> = ({ isOpen, onClose, products, onAdd }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [count, setCount] = useState(1);

  const kegProducts = useMemo(() => products.filter(p => p.productType === 'Keg'), [products]);

  React.useEffect(() => {
    if (isOpen && kegProducts.length > 0) {
      // If the currently selected ID isn't in the list anymore, reset it.
      if (!kegProducts.some(p => p.id === selectedProductId)) {
        setSelectedProductId(kegProducts[0].id);
      }
    }
  }, [isOpen, kegProducts, selectedProductId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId && count > 0) {
      onAdd(selectedProductId, count);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Full Kegs to Inventory">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Keg Product</label>
          <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
            {kegProducts.length === 0 ? (
                <option value="" disabled>No keg products found. Add one in Inventory.</option>
            ) : (
                kegProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity to Add</label>
          <input type="number" min="1" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Kegs</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Summary Modal ---
const KegSummaryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  keg: KegInstance | null;
}> = ({ isOpen, onClose, keg }) => {
  const { storeSettings } = useData();
  const salesSummary = useMemo(() => {
    if (!keg) return [];
    const summary = keg.sales.reduce((acc, sale) => {
      if (!acc[sale.userName]) {
        acc[sale.userName] = { totalVolumeSold: 0, totalRevenue: 0 };
      }
      acc[sale.userName].totalVolumeSold += sale.volumeSold;
      acc[sale.userName].totalRevenue += sale.revenue;
      return acc;
    }, {} as Record<string, { totalVolumeSold: number, totalRevenue: number }>);
    return Object.entries(summary)
      .map(([userName, data]) => ({ userName, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [keg]);

  const { totalVolume, totalRevenue } = useMemo(() => {
    if (!keg) return { totalVolume: 0, totalRevenue: 0 };
    return {
      totalVolume: keg.sales.reduce((sum, s) => sum + s.volumeSold, 0),
      totalRevenue: keg.sales.reduce((sum, s) => sum + s.revenue, 0)
    };
  }, [keg]);


  const handleGenerateSummaryPDF = async () => {
    if (!keg) return;
    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

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

    doc.setFontSize(18);
    doc.text(`Keg Summary: ${keg.productName}`, 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Keg ID: ${keg.id}`, 14, 36);
    
    autoTable(doc, {
        startY: 42,
        theme: 'plain',
        body: [
            ['Tapped By:', `${keg.tappedBy || 'N/A'} on ${keg.tappedDate ? new Date(keg.tappedDate).toLocaleString() : 'N/A'}`],
            ['Closed By:', `${keg.closedBy || 'N/A'} on ${keg.closedDate ? new Date(keg.closedDate).toLocaleString() : 'N/A'}`]
        ]
    });

    if (salesSummary.length > 0) {
        const tableColumns = ["Server", "Volume Sold (L)", "Amount Sold (Ksh)"];
        const bodyRows = [
            ...salesSummary.map(s => [
                s.userName,
                (s.totalVolumeSold / 1000).toFixed(2),
                s.totalRevenue.toFixed(2)
            ]),
            ['', '', ''], // spacer
            [
                { content: 'TOTALS', styles: { fontStyle: 'bold' as const } },
                { content: `${(totalVolume / 1000).toFixed(2)} L`, styles: { fontStyle: 'bold' as const } },
                { content: `Ksh ${totalRevenue.toFixed(2)}`, styles: { fontStyle: 'bold' as const } }
            ]
        ];

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [tableColumns],
            body: bodyRows,
            theme: 'striped',
            headStyles: { fillColor: '#ea5314' },
        });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
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
    doc.text(`Page 1`, pageWidth - 20, pageHeight - 10);

    doc.save(`keg_summary_${keg.id.split('-').pop() || 'summary'}.pdf`);
  };

  if (!isOpen || !keg) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Summary for ${keg.productName}`}>
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-gray-100 dark:bg-dark-mode-blue-800/50">
          <h4 className="font-semibold mb-2">Keg Details</h4>
          <p><strong>Tapped By:</strong> {keg.tappedBy || 'N/A'} on {keg.tappedDate ? new Date(keg.tappedDate).toLocaleString() : 'N/A'}</p>
          <p><strong>Closed By:</strong> {keg.closedBy || 'N/A'} on {keg.closedDate ? new Date(keg.closedDate).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Sales by Server</h4>
          {salesSummary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left dark:text-gray-200">
                <thead className="dark:text-gray-400">
                  <tr className="border-b dark:border-dark-mode-blue-700"><th className="p-2">Server</th><th className="p-2">Volume Sold</th><th className="p-2">Amount Sold</th></tr>
                </thead>
                <tbody>
                  {salesSummary.map(summary => (
                    <tr key={summary.userName} className="border-b dark:border-dark-mode-blue-800">
                      <td className="p-2 font-medium">{summary.userName}</td>
                      <td className="p-2">{(summary.totalVolumeSold / 1000).toFixed(2)} L</td>
                      <td className="p-2">Ksh {summary.totalRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                 <tfoot className="font-bold border-t-2 dark:border-dark-mode-blue-700">
                    <tr>
                      <td className="p-2">Total</td>
                      <td className="p-2">{(totalVolume / 1000).toFixed(2)} L</td>
                      <td className="p-2">Ksh {totalRevenue.toFixed(2)}</td>
                    </tr>
                </tfoot>
              </table>
            </div>
          ) : <p className="text-gray-500 dark:text-gray-400">No sales were recorded for this keg.</p>}
        </div>
        <div className="flex justify-end space-x-2 pt-4">
            <Button 
                onClick={handleGenerateSummaryPDF}
                icon={<FaFilePdf/>}
            >Generate PDF</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- Keg Card ---
const KegCard: React.FC<{
  keg: KegInstance;
  onTap: (id: string) => void;
  onClose: (keg: KegInstance) => void;
  onViewSummary: (keg: KegInstance) => void;
  isTapDisabled?: boolean;
}> = ({ keg, onTap, onClose, onViewSummary, isTapDisabled = false }) => {
  const volumePercent = (keg.currentVolume / keg.capacity) * 100;

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <h4 className="font-bold">{keg.productName}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">ID: {keg.id.split('-').pop()}</p>
        <div className="my-2">
          <div className="w-full bg-gray-200 dark:bg-dark-mode-blue-800 rounded-full h-2.5">
            <div className="bg-primary-cyan-600 h-2.5 rounded-full" style={{ width: `${volumePercent}%` }}></div>
          </div>
          <p className="text-center text-sm font-semibold mt-1">
            {(keg.currentVolume / 1000).toFixed(2)}L / {(keg.capacity / 1000).toFixed(1)}L
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col space-y-2">
        {keg.status === 'Full' && <Button onClick={() => onTap(keg.id)} disabled={isTapDisabled} title={isTapDisabled ? `Another ${keg.productName} is already tapped.` : 'Tap this keg'} icon={<FaTint />}>Tap Keg</Button>}
        {keg.status === 'Tapped' && <Button onClick={() => onClose(keg)} variant="danger" icon={<FaSignOutAlt />}>Close Keg</Button>}
        {keg.status === 'Empty' && <Button onClick={() => onViewSummary(keg)} variant="secondary" icon={<FaFileAlt />}>View Summary</Button>}
      </div>
    </Card>
  );
};

const toInputDateString = (date: Date): string => date.toISOString().split('T')[0];

const KegManagement: React.FC = () => {
  const { kegInstances, products, currentUser, addKegInstances, tapKeg, closeKeg, storeSettings } = useData();
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [summaryKeg, setSummaryKeg] = useState<KegInstance | null>(null);
  const [kegToClose, setKegToClose] = useState<KegInstance | null>(null);
  
  const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'yesterday', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastInfo, setToastInfo] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToastInfo({ show: true, message, type });
  };


  useEffect(() => {
    const today = new Date();
    setEndDate(toInputDateString(today));
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    setStartDate(toInputDateString(lastWeek));
  }, []);

  if (!currentUser) {
    return null; // or a loading spinner
  }
  
  const handleTapKeg = (kegId: string) => {
    const kegToTap = kegInstances.find(k => k.id === kegId);
    if (!kegToTap) return;

    const isAnotherTapped = kegInstances.some(
        k => k.productId === kegToTap.productId && k.status === 'Tapped'
    );
    if (isAnotherTapped) {
        alert(`Another ${kegToTap.productName} is already tapped. Please close it before tapping a new one.`);
        return;
    }
    tapKeg(kegToTap.id, currentUser.name);
  };

  const handleConfirmClose = async () => {
    if (kegToClose) {
      try {
        await closeKeg(kegToClose.id, currentUser.name);
        showToast(`Keg of ${kegToClose.productName} closed successfully.`);
      } catch (error: any) {
        console.error("Failed to close keg:", error);
        showToast(`Error closing keg: ${error.message}`, 'error');
      } finally {
        setKegToClose(null);
      }
    }
  };
  
  const handleSetFilterType = (type: string) => {
    setFilterType(type);
  };
  
  const filteredKegs = useMemo(() => {
    // 1. Filter by date range
    let dateFilteredKegs = kegInstances;
    if (filterType !== 'all') {
        let startRange: Date;
        let endRange: Date;

        if (filterType === 'today') {
        startRange = new Date();
        startRange.setHours(0, 0, 0, 0);
        endRange = new Date();
        endRange.setHours(23, 59, 59, 999);
        } else if (filterType === 'yesterday') {
        startRange = new Date();
        startRange.setDate(startRange.getDate() - 1);
        startRange.setHours(0, 0, 0, 0);
        endRange = new Date();
        endRange.setDate(endRange.getDate() - 1);
        endRange.setHours(23, 59, 59, 999);
        } else if (filterType === 'custom' && startDate && endDate) {
        startRange = new Date(startDate);
        startRange.setHours(0, 0, 0, 0);
        endRange = new Date(endDate);
        endRange.setHours(23, 59, 59, 999);
        } else {
            startRange = new Date(0); // Should not happen if logic is correct
            endRange = new Date();
        }
        
        dateFilteredKegs = kegInstances.filter(keg => {
        // Always include Full and Tapped kegs regardless of date filter
        if (keg.status === 'Tapped' || keg.status === 'Full') return true;
        // For empty kegs, check if their closedDate falls within the range
        if (keg.status === 'Empty' && keg.closedDate) {
            const closedDate = new Date(keg.closedDate);
            return closedDate >= startRange && closedDate <= endRange;
        }
        return false;
        });
    }

    // 2. Filter by search query on top of date-filtered results
    if (!searchQuery) {
        return dateFilteredKegs;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return dateFilteredKegs.filter(keg => {
        const hasMatchingSaleServer = keg.sales.some(sale => sale.userName.toLowerCase().includes(lowercasedQuery));
        return (
            keg.productName.toLowerCase().includes(lowercasedQuery) ||
            (keg.tappedBy && keg.tappedBy.toLowerCase().includes(lowercasedQuery)) ||
            (keg.closedBy && keg.closedBy.toLowerCase().includes(lowercasedQuery)) ||
            keg.id.toLowerCase().includes(lowercasedQuery) ||
            hasMatchingSaleServer
        );
    });

  }, [kegInstances, filterType, startDate, endDate, searchQuery]);
  
  const handleGenerateListPDF = async () => {
    if (filteredKegs.length === 0) {
      alert("No kegs match the current filters to generate a report.");
      return;
    }
    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text("Keg Management Report", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const filterTexts = [
      `Report Date: ${new Date().toLocaleDateString()}`,
      searchQuery ? `Search: "${searchQuery}"` : null,
      filterType !== 'all' ? `Date Filter: ${filterType}` : 'Date Filter: All Time'
    ].filter(Boolean);
    
    doc.text(filterTexts.join(' | '), 14, 36);
    
    const tableColumns = ["ID", "Product Name", "Status", "Volume (L)", "Tapped By", "Closed By"];
    const tableRows = filteredKegs.map(keg => [
        keg.id.split('-').pop(),
        keg.productName,
        keg.status,
        `${(keg.currentVolume/1000).toFixed(2)} / ${(keg.capacity/1000).toFixed(1)}`,
        keg.tappedBy || 'N/A',
        keg.closedBy || 'N/A',
    ]);
    
    autoTable(doc, {
        startY: 42,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: '#ea5314' },
        margin: { top: 40 },
        didDrawPage: (data) => {
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
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            
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

    doc.save(`keg_report_${toInputDateString(new Date())}.pdf`);
  };

  const kegsByStatus = useMemo(() => {
    return filteredKegs.reduce((acc, keg) => {
      acc[keg.status].push(keg);
      return acc;
    }, { Tapped: [], Full: [], Empty: [] } as Record<KegInstance['status'], KegInstance[]>);
  }, [filteredKegs]);
  
  const tappedProductIds = useMemo(() => 
    new Set(kegInstances.filter(k => k.status === 'Tapped').map(k => k.productId))
  , [kegInstances]);

  return (
    <>
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">Keg Management</h2>
           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, person, ID..."
                    className="w-full sm:w-48"
                />
                <Button onClick={handleGenerateListPDF} variant="secondary" icon={<FaFilePdf />}>Generate List PDF</Button>
                <Button onClick={() => setAddModalOpen(true)} icon={<FaPlus />}>Add Kegs</Button>
            </div>
        </div>
        <div className="border-t dark:border-dark-mode-blue-700 pt-4">
            <h4 className="text-sm font-semibold mb-2">Filter Empty Kegs by Date Closed</h4>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant={filterType === 'all' ? 'primary' : 'secondary'} className="!text-xs !py-1" onClick={() => handleSetFilterType('all')}>All Time</Button>
                <Button variant={filterType === 'today' ? 'primary' : 'secondary'} className="!text-xs !py-1" onClick={() => handleSetFilterType('today')}>Today</Button>
                <Button variant={filterType === 'yesterday' ? 'primary' : 'secondary'} className="!text-xs !py-1" onClick={() => handleSetFilterType('yesterday')}>Yesterday</Button>
                <Button variant={filterType === 'custom' ? 'primary' : 'secondary'} className="!text-xs !py-1" onClick={() => handleSetFilterType('custom')}>Custom</Button>
                {filterType === 'custom' && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-mode-blue-900/50 p-1.5 rounded-lg">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 rounded-md text-sm border-gray-300 dark:border-dark-mode-blue-700 bg-gray-50 dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500" />
                        <span className="text-sm font-semibold">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 rounded-md text-sm border-gray-300 dark:border-dark-mode-blue-700 bg-gray-50 dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500" />
                    </div>
                )}
            </div>
        </div>
      </Card>

      <div className="space-y-6 mt-6">
        {/* Tapped Kegs */}
        <Card>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <FaCheckCircle className="text-green-500" /> Tapped & Active
          </h3>
          {kegsByStatus.Tapped.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kegsByStatus.Tapped.map(keg => <KegCard key={keg.id} keg={keg} onTap={handleTapKeg} onClose={setKegToClose} onViewSummary={setSummaryKeg} />)}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No kegs are currently tapped.</p>
          )}
        </Card>

        {/* Full Kegs */}
        <Card>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <FaBeer className="text-yellow-500" /> Full & Ready
          </h3>
           {kegsByStatus.Full.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kegsByStatus.Full.map(keg => <KegCard key={keg.id} keg={keg} onTap={handleTapKeg} onClose={setKegToClose} onViewSummary={setSummaryKeg} isTapDisabled={tappedProductIds.has(keg.productId)} />)}
            </div>
           ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No full kegs found matching filters.</p>
           )}
        </Card>

        {/* Empty Kegs */}
        <Card>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <FaHistory className="text-red-500" /> Empty
          </h3>
           {kegsByStatus.Empty.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kegsByStatus.Empty.map(keg => <KegCard key={keg.id} keg={keg} onTap={handleTapKeg} onClose={setKegToClose} onViewSummary={setSummaryKeg} />)}
            </div>
           ) : (
             <p className="text-gray-500 dark:text-gray-400 text-center py-4">No empty kegs found for the selected filters.</p>
           )}
        </Card>
      </div>
      
      <AddKegModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        products={products}
        onAdd={addKegInstances}
      />

      <KegSummaryModal
        isOpen={!!summaryKeg}
        onClose={() => setSummaryKeg(null)}
        keg={summaryKeg}
      />
      
      <ConfirmationModal
        isOpen={!!kegToClose}
        onClose={() => setKegToClose(null)}
        onConfirm={handleConfirmClose}
        title="Close Keg"
        message={
            kegToClose && kegToClose.currentVolume > 0.01 * kegToClose.capacity
            ? `This keg still has approximately ${(kegToClose.currentVolume / 1000).toFixed(2)}L remaining. Are you sure you want to close it? The remaining volume will be discarded.`
            : 'Are you sure you want to close this empty keg?'
        }
    />
    <Toast 
      message={toastInfo.message} 
      show={toastInfo.show} 
      onClose={() => setToastInfo({ ...toastInfo, show: false })} 
      type={toastInfo.type}
    />
      
    </>
  );
};

export default KegManagement;
