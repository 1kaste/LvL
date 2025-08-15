import React, { useState } from 'react';
import { PurchaseOrder, StoreSettings, Supplier } from '../../types';
import Modal from './Modal';
import Button from './Button';
import Toast from './Toast';
import { FaPrint } from 'react-icons/fa';
import { useData } from '../../context/DataContext';
import { usePrinters } from '../../context/PrinterContext';
import { formatPurchaseOrderForPrinter } from '../../utils/formatReceiptForPrinter';

interface PurchaseOrderReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    po: PurchaseOrder;
    supplier: Supplier | undefined;
    settings: StoreSettings;
}

const PurchaseOrderReceiptModal: React.FC<PurchaseOrderReceiptModalProps> = ({ isOpen, onClose, po, supplier, settings }) => {
    const { printerSettings } = useData();
    const { printerStatuses, sendPrintData } = usePrinters();
    const [toastInfo, setToastInfo] = useState({ show: false, message: '' });

    if (!isOpen) return null;
    
    const showToast = (message: string) => {
        setToastInfo({ show: true, message });
    };

    const handlePrint = () => {
        const selectedPrinter = printerSettings.printers.find(p => p.id === printerSettings.selectedPrinterId);
        
        if (selectedPrinter && selectedPrinter.type === 'IP') {
            const status = printerStatuses.get(selectedPrinter.id);
            if (status?.status === 'connected') {
                const poText = formatPurchaseOrderForPrinter(po, supplier, settings);
                const success = sendPrintData(selectedPrinter.id, poText);
                if (success) {
                    showToast(`PO print job sent to ${selectedPrinter.name}.`);
                    onClose();
                } else {
                    showToast(`Failed to send PO to ${selectedPrinter.name}.`);
                }
                return;
            }
        }

        // Fallback to browser print
        window.print();
        onClose();
    };

    const ReceiptContent = () => (
        <div className="font-mono text-xs text-black bg-white p-2 w-72 mx-auto">
            <div className="text-center font-bold text-lg mb-2">PURCHASE ORDER</div>
            {settings.showLogoOnReceipt && settings.logoUrl && (
                <img src={settings.logoUrl} alt="Store Logo" className="w-20 h-20 mx-auto my-2 object-contain" />
            )}
            <div className="text-center">
                <h2 className="text-sm font-bold">{settings.storeName}</h2>
                <p>{settings.address}</p>
                <p>{settings.phone}</p>
                <p className="mb-2">{settings.email}</p>
            </div>

            <hr className="my-2 border-dashed border-black" />

            <div className="text-left">
                <p className="font-bold">SUPPLIER:</p>
                {supplier ? (
                    <>
                        <p className="font-semibold">{supplier.name}</p>
                        <p>{supplier.contactPerson}</p>
                        <p>{supplier.phone}</p>
                        <p>{supplier.email}</p>
                    </>
                ) : <p>{po.supplierName}</p>}
            </div>

            <hr className="my-2 border-dashed border-black" />
            
            <div className="text-left">
                <p>PO #: <span className="font-bold">{po.id}</span></p>
                <p>Invoice #: <span className="font-bold">{po.invoiceNo || 'N/A'}</span></p>
                <p>Order Date: {po.orderDate.toLocaleDateString()}</p>
                <p>Status: {po.status}</p>
            </div>
            
            <div className="w-full my-2">
                <table className="w-full text-left text-[11px] leading-tight">
                    <thead className="border-t border-b border-dashed border-black">
                        <tr>
                            <th className="py-1 font-semibold">ITEM</th>
                            <th className="py-1 font-semibold text-right">QTY</th>
                            <th className="py-1 font-semibold text-right">COST</th>
                            <th className="py-1 font-semibold text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.items.map((item, index) => (
                            <tr key={`${item.productId}-${index}`}>
                                <td className="py-0.5">{item.name}</td>
                                <td className="py-0.5 text-right">{item.quantityOrdered}</td>
                                <td className="py-0.5 text-right">{item.cost.toFixed(2)}</td>
                                <td className="py-0.5 text-right">{(item.cost * item.quantityOrdered).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {po.items.length === 0 && <p className="text-center my-2 text-gray-500">(No items listed)</p>}
            
            <div className="text-left border-t border-dashed border-black pt-1">
                 <p className="font-bold text-base">TOTAL COST: Ksh {po.totalCost.toFixed(2)}</p>
            </div>
            
            <hr className="my-2 border-dashed border-black" />

            <div className="text-center mt-2">
                <p>{settings.receiptFooter}</p>
            </div>
        </div>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Purchase Order Preview" size="sm">
                <div className="receipt-print-area" id="po-receipt-content">
                    <ReceiptContent />
                </div>
                <div className="flex justify-end space-x-3 mt-6 print-hide">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} icon={<FaPrint />}>Print PO</Button>
                </div>
            </Modal>
            <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: ''})} />
        </>
    );
};

export default PurchaseOrderReceiptModal;