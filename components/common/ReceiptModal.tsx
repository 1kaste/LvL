import React, { useState } from 'react';
import { Sale, StoreSettings } from '../../types';
import Modal from './Modal';
import Button from './Button';
import Toast from './Toast';
import { FaPrint } from 'react-icons/fa';
import Receipt from './Receipt';
import { useData } from '../../context/DataContext';
import { usePrinters } from '../../context/PrinterContext';
import { formatReceiptForPrinter } from '../../utils/formatReceiptForPrinter';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale;
    settings: StoreSettings;
    onPrintSuccess: () => void;
    isPreview?: boolean;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, settings, onPrintSuccess, isPreview = false }) => {
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
                const receiptText = formatReceiptForPrinter(sale, settings);
                const success = sendPrintData(selectedPrinter.id, receiptText);
                if (success) {
                    showToast(`Print job sent to ${selectedPrinter.name}.`);
                    onPrintSuccess();
                    onClose();
                } else {
                    showToast(`Failed to send to ${selectedPrinter.name}.`);
                }
                return;
            }
        }
    
        // Fallback to browser print for non-IP printers or if disconnected
        window.print();
        onPrintSuccess();
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isPreview ? "Bill Preview" : "Receipt Preview"} size="sm">
                <div className="receipt-print-area" id="receipt-content">
                    <Receipt sale={sale} settings={settings} isPreview={isPreview} />
                </div>
                <div className="flex justify-end space-x-3 mt-6 print-hide">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} icon={<FaPrint />}>Print {isPreview ? 'Bill' : 'Receipt'}</Button>
                </div>
            </Modal>
            <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: ''})} />
        </>
    );
};

export default ReceiptModal;