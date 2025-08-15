import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { PurchaseOrder, Supplier, Product } from '../types';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SearchInput from '../components/common/SearchInput';
import PurchaseOrderReceiptModal from '../components/common/PurchaseOrderReceiptModal';
import { FaPlus, FaEdit, FaTrash, FaPrint, FaFilePdf, FaBoxes, FaCheck, FaSearch } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter';

type POItem = PurchaseOrder['items'][0];

// --- Form Modal for Creating/Editing POs ---
const POFormModal: React.FC<{
  po?: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (poData: any) => Promise<void>;
  suppliers: Supplier[];
  products: Product[];
}> = ({ po, isOpen, onClose, onSave, suppliers, products }) => {
  const [supplierId, setSupplierId] = useState(po?.supplierId || (suppliers.length > 0 ? suppliers[0].id : ''));
  const [orderDate, setOrderDate] = useState(po?.orderDate ? po.orderDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(po?.invoiceNo || '');
  const [items, setItems] = useState<Omit<POItem, 'quantityReceived'>[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
        setSupplierId(po?.supplierId || (suppliers.length > 0 ? suppliers[0].id : ''));
        setOrderDate(po?.orderDate ? po.orderDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setInvoiceNo(po?.invoiceNo || '');
        setItems(po?.items.map(({name, productId, cost, quantityOrdered}) => ({name, productId, cost, quantityOrdered})) || []);
        setProductSearch('');
    }
  }, [po, isOpen, suppliers]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const addedProductIds = new Set(items.map(item => item.productId));
    return products.filter(p => 
        (p.productType === 'Stocked' || p.productType === 'Keg') && // Only show procurable items
        !addedProductIds.has(p.id) && 
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);
  }, [productSearch, products, items]);

  const addProductToPO = (product: Product) => {
    setItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        quantityOrdered: 1,
        cost: 0,
    }]);
    setProductSearch('');
  };
  
  const updateItem = (productId: string, field: 'quantityOrdered' | 'cost', value: number) => {
    setItems(prev => prev.map(item => 
        item.productId === productId ? { ...item, [field]: value } : item
    ));
  };
  
  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
        alert("Please select a supplier and add at least one item.");
        return;
    }
    
    const poData = {
        supplierId,
        orderDate: new Date(orderDate),
        invoiceNo,
        status: po?.status || 'Pending',
        items: items.map(item => ({ ...item, quantityReceived: po?.items.find(i => i.productId === item.productId)?.quantityReceived || 0 })),
    };

    if (po) { // Editing existing PO
      await onSave({ ...po, ...poData });
    } else { // Creating new PO
      await onSave(poData);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={po ? 'Edit Purchase Order' : 'Create New Purchase Order'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Date</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Invoice No.</label>
                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" placeholder="e.g. INV-12345" required />
            </div>
        </div>
        
        {/* Item Management */}
        <div className="space-y-2 pt-4 border-t dark:border-dark-mode-blue-700">
            <h3 className="text-lg font-semibold">Items</h3>
            <div className="relative">
                <SearchInput value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search to add products..."/>
                {filteredProducts.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-mode-blue-800 border dark:border-dark-mode-blue-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredProducts.map(p => (
                            <li key={p.id} onClick={() => addProductToPO(p)} className="p-2 hover:bg-primary-orange-100 dark:hover:bg-primary-orange-900/50 cursor-pointer">
                                {p.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <div className="max-h-60 overflow-y-auto pr-2 mt-2">
                {items.length > 0 ? (
                    <table className="w-full text-left dark:text-gray-200">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-dark-mode-blue-900 dark:text-gray-400">
                            <tr><th className="p-2">Product</th><th className="p-2">Qty Ordered</th><th className="p-2">Cost/Unit</th><th className="p-2">Actions</th></tr>
                        </thead>
                        <tbody>
                        {items.map(item => (
                            <tr key={item.productId} className="border-b dark:border-dark-mode-blue-700">
                                <td className="p-2">{item.name}</td>
                                <td className="p-2"><input type="number" min="1" value={item.quantityOrdered} onChange={e => updateItem(item.productId, 'quantityOrdered', parseInt(e.target.value) || 1)} className="w-20 p-1 rounded bg-gray-100 dark:bg-dark-mode-blue-800 dark:text-gray-200"/></td>
                                <td className="p-2"><input type="number" min="0" step="0.01" value={item.cost} onChange={e => updateItem(item.productId, 'cost', parseFloat(e.target.value) || 0)} className="w-24 p-1 rounded bg-gray-100 dark:bg-dark-mode-blue-800 dark:text-gray-200"/></td>
                                <td className="p-2"><Button type="button" variant="danger" className="!p-1.5" onClick={() => removeItem(item.productId)}><FaTrash/></Button></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : <p className="text-center text-gray-500 py-4 dark:text-gray-400">No items added yet.</p>}
            </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-dark-mode-blue-700">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{po ? 'Save Changes' : 'Create PO'}</Button>
        </div>
      </form>
    </Modal>
  )
}


// --- Modal for Receiving POs ---
const ReceivePOModal: React.FC<{
  po: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (poId: string, items: {productId: string, quantityReceived: number}[]) => void;
}> = ({ po, isOpen, onClose, onConfirm }) => {
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (po) {
            const initialQuantities: Record<string, number> = {};
            po.items.forEach(item => {
                const remaining = item.quantityOrdered - item.quantityReceived;
                initialQuantities[item.productId] = Math.max(0, remaining);
            });
            setReceivedQuantities(initialQuantities);
        }
    }, [po]);

    const handleQuantityChange = (productId: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setReceivedQuantities(prev => ({ ...prev, [productId]: numValue }));
    };

    const handleSubmit = () => {
        const itemsToReceive = Object.entries(receivedQuantities)
            .map(([productId, quantityReceived]) => ({ productId, quantityReceived }))
            .filter(item => item.quantityReceived > 0);
        
        if (itemsToReceive.length === 0) {
            alert("Please enter a quantity for at least one item to receive.");
            return;
        }
        onConfirm(po.id, itemsToReceive);
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Receive Stock for PO #${po.id}`}>
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Update the "Receiving Now" column with the quantities from the delivery. The stock levels will be updated automatically.
                </p>
                <div className="max-h-80 overflow-y-auto pr-2">
                    <table className="w-full text-left dark:text-gray-200">
                        <thead className="dark:text-gray-400">
                            <tr className="border-b dark:border-dark-mode-blue-700">
                                <th className="p-2">Product</th>
                                <th className="p-2 text-center">Ordered</th>
                                <th className="p-2 text-center">Received</th>
                                <th className="p-2 text-center">Receiving Now</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map(item => {
                                const remaining = item.quantityOrdered - item.quantityReceived;
                                return (
                                    <tr key={item.productId} className="border-b dark:border-dark-mode-blue-800">
                                        <td className="p-2 font-medium">{item.name}</td>
                                        <td className="p-2 text-center">{item.quantityOrdered}</td>
                                        <td className="p-2 text-center">{item.quantityReceived}</td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max={remaining}
                                                value={receivedQuantities[item.productId] || 0}
                                                onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                className="w-20 p-1 rounded text-center bg-gray-100 dark:bg-dark-mode-blue-800 dark:text-gray-200"
                                                disabled={remaining <= 0}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t dark:border-dark-mode-blue-700">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} icon={<FaCheck />}>Confirm &amp; Add to Stock</Button>
                </div>
            </div>
        </Modal>
    );
};


// --- Main Component ---
const PurchaseOrders: React.FC = () => {
  const location = useLocation();
  const { products, purchaseOrders, suppliers, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, storeSettings, receivePurchaseOrderItems, currentUser } = useData();
  const [isPoFormModalOpen, setPoFormModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [poForReceipt, setPoForReceipt] = useState<PurchaseOrder | null>(null);

  const [isReceiveModalOpen, setReceiveModalOpen] = useState(false);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    if (location.state?.searchQuery) {
        setSearchQuery(location.state.searchQuery);
        window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  if (!currentUser) {
    return null; // or a loading spinner, since this page requires a logged-in user
  }

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
        case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
        case 'Partially Received': return 'bg-primary-cyan-100 text-primary-cyan-800 dark:bg-primary-cyan-900/50 dark:text-primary-cyan-200';
        case 'Received': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
    }
  };

  const handleAddNew = () => {
    setEditingPO(null);
    setPoFormModalOpen(true);
  };
  
  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setPoFormModalOpen(true);
  };
  
  const handlePrint = (po: PurchaseOrder) => {
    setPoForReceipt(po);
    setReceiptModalOpen(true);
  };
  
  const handleReceive = (po: PurchaseOrder) => {
    setPoToReceive(po);
    setReceiveModalOpen(true);
  };

  const handleSave = async (poData: any) => {
    if ('id' in poData) {
        await updatePurchaseOrder(poData as PurchaseOrder);
    } else {
        await addPurchaseOrder(poData);
    }
  };

  const handleDelete = (poId: string) => {
    setPOToDelete(poId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (poToDelete) {
        await deletePurchaseOrder(poToDelete);
        setConfirmOpen(false);
        setPOToDelete(null);
    }
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => 
        po.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [purchaseOrders, searchQuery]);

  const handleGeneratePDF = async () => {
    if (filteredPOs.length === 0) {
      alert("There are no purchase orders to download in the current view.");
      return;
    }

    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;

    const tableColumns = ["PO Number", "Supplier", "Order Date", "Status", "Total Cost (Ksh)"];
    const tableRows = filteredPOs.map(po => [
        po.id,
        po.supplierName,
        po.orderDate.toLocaleDateString(),
        po.status,
        po.totalCost.toFixed(2)
    ]);
    
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text("Purchase Order Report", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    
    const reportDate = new Date().toLocaleString();
    const searchQueryText = searchQuery ? `Search Query: "${searchQuery}"` : "Showing all purchase orders";
    doc.text(reportDate, 14, 36);
    doc.text(searchQueryText, 14, 42);

    autoTable(doc, {
        startY: 48,
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

    doc.save(`jobiflow_purchase-orders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold">Purchase Orders</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PO# or Supplier..."
            className="w-full sm:w-64"
          />
          <Button onClick={handleAddNew} icon={<FaPlus />} className="w-full sm:w-auto">Create PO</Button>
          <Button onClick={handleGeneratePDF} variant="secondary" icon={<FaFilePdf />} className="w-full sm:w-auto">Generate PDF</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left dark:text-gray-200">
          <thead className="border-b dark:border-dark-mode-blue-700 dark:text-gray-400">
            <tr>
              <th className="p-3">PO Number</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Order Date</th>
              <th className="p-3">Total Cost</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map(po => (
              <tr key={po.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                <td className="p-3 font-medium text-primary-orange-600 dark:text-primary-orange-400">{po.id}</td>
                <td className="p-3">{po.supplierName}</td>
                <td className="p-3">{new Date(po.orderDate).toLocaleDateString()}</td>
                <td className="p-3">Ksh {po.totalCost.toFixed(2)}</td>
                <td className="p-3">
                  <div className="flex flex-col items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                    {po.receivedBy && ['Received', 'Partially Received'].includes(po.status) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">by {po.receivedBy}</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                    <div className="flex space-x-2">
                      {['Pending', 'Partially Received'].includes(po.status) && (
                        <Button variant="primary" className="!p-2" title="Receive Stock" onClick={() => handleReceive(po)}><FaBoxes /></Button>
                      )}
                      <Button variant="secondary" className="!p-2" title="Print PO" onClick={() => handlePrint(po)}><FaPrint /></Button>
                      <Button variant="secondary" className="!p-2" title="Edit PO" onClick={() => handleEdit(po)} disabled={po.status === 'Received'}><FaEdit /></Button>
                      <Button variant="danger" className="!p-2" title="Delete PO" onClick={() => handleDelete(po.id)}><FaTrash /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPOs.length === 0 && (
            <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">No purchase orders found.</p>
            </div>
        )}
      </div>
    </Card>

     <POFormModal
        isOpen={isPoFormModalOpen}
        onClose={() => setPoFormModalOpen(false)}
        po={editingPO}
        onSave={handleSave}
        suppliers={suppliers}
        products={products}
      />
    
    {poToReceive && (
        <ReceivePOModal 
            isOpen={isReceiveModalOpen}
            onClose={() => setReceiveModalOpen(false)}
            po={poToReceive}
            onConfirm={async (poId, items) => await receivePurchaseOrderItems(poId, items, currentUser.name)}
        />
    )}

    <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Purchase Order"
        message="Are you sure you want to delete this PO? This action cannot be undone."
      />
    
      {poForReceipt && (
        <PurchaseOrderReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            po={poForReceipt}
            supplier={suppliers.find(s => s.id === poForReceipt.supplierId)}
            settings={storeSettings}
        />
      )}
    </>
  );
};

export default PurchaseOrders;