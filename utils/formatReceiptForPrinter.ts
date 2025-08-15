
import { Sale, StoreSettings, PurchaseOrder, Supplier } from '../types';

const PRINTER_WIDTH = 32;

const textCenter = (text: string): string => {
    const padding = Math.max(0, Math.floor((PRINTER_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
};

const line = (char: string = '-'): string => {
    return char.repeat(PRINTER_WIDTH);
};

const twoCols = (left: string, right: string): string => {
    const space = PRINTER_WIDTH - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
};

export const formatReceiptForPrinter = (sale: Sale, settings: StoreSettings): string => {
    let output = '';

    // Header
    if (settings.storeName) output += textCenter(settings.storeName) + '\n';
    if (settings.address) output += textCenter(settings.address) + '\n';
    if (settings.phone) output += textCenter(settings.phone) + '\n';
    if (settings.receiptHeader) output += '\n' + textCenter(settings.receiptHeader) + '\n';
    
    output += line() + '\n';

    // Info
    output += twoCols(`Receipt: ${sale.id}`, `Date: ${new Date(sale.date).toLocaleDateString()}`) + '\n';
    output += `Served By: ${sale.servedBy}\n`;
    output += line() + '\n';

    // Items
    sale.items.forEach(item => {
        const itemLine = `${item.quantity}x ${item.name}`;
        const total = (item.price * item.quantity).toFixed(2);
        output += twoCols(itemLine.substring(0, PRINTER_WIDTH - total.length - 1), total) + '\n';
    });

    // Totals
    output += line() + '\n';
    output += twoCols('Subtotal:', sale.subtotal.toFixed(2)) + '\n';
    output += twoCols('Tax:', sale.tax.toFixed(2)) + '\n';
    if (sale.discountApplied && sale.discountApplied.amount > 0) {
        output += twoCols(`Discount (${sale.discountApplied.name}):`, `-${sale.discountApplied.amount.toFixed(2)}`) + '\n';
    }
    output += twoCols('TOTAL:', sale.total.toFixed(2)) + '\n\n';
    
    // Payment
    output += twoCols('Payment:', sale.paymentMethod.toUpperCase()) + '\n\n';
    
    // Custom payment methods shown on receipt
    const paymentMethodsToShow = settings.paymentMethods?.filter(pm => pm.showOnReceipt);
    if (paymentMethodsToShow && paymentMethodsToShow.length > 0) {
        output += line('=') + '\n';
        output += textCenter('PAYMENT OPTIONS') + '\n\n';
        paymentMethodsToShow.forEach(pm => {
            output += `${pm.name}:\n`;
            output += `${pm.details}\n\n`;
        });
    }

    // Footer
    output += line() + '\n';
    if (settings.receiptFooter) output += textCenter(settings.receiptFooter) + '\n';
    
    // ESC/POS command to cut paper and feed a few lines
    output += '\n\n\n\x1D\x56\x41\x03';

    return output;
};

export const formatTestPrint = (printerName: string): string => {
    let output = '';
    output += textCenter('Printer Test') + '\n';
    output += line() + '\n\n';
    output += `Successfully connected to:\n`;
    output += textCenter(printerName) + '\n\n';
    output += `Time: ${new Date().toLocaleString()}\n`;
    output += '\n\n\n\x1D\x56\x41\x03'; // Cut paper
    return output;
}

export const formatPurchaseOrderForPrinter = (po: PurchaseOrder, supplier: Supplier | undefined, settings: StoreSettings): string => {
    let output = '';

    // Header
    output += textCenter('PURCHASE ORDER') + '\n\n';
    output += textCenter(settings.storeName) + '\n';
    output += textCenter(settings.address) + '\n';
    output += line() + '\n';

    // Supplier Info
    output += 'SUPPLIER:\n';
    if (supplier) {
        output += `${supplier.name}\n`;
        output += `${supplier.contactPerson} | ${supplier.phone}\n`;
    } else {
        output += `${po.supplierName}\n`;
    }
    output += line() + '\n';

    // PO Info
    output += twoCols(`PO #: ${po.id}`, `Date: ${po.orderDate.toLocaleDateString()}`) + '\n';
    output += `Status: ${po.status}\n`;
    output += line() + '\n';

    // Items
    po.items.forEach(item => {
        output += `${item.name}\n`;
        const details = `  ${item.quantityOrdered} x ${item.cost.toFixed(2)}`;
        const total = (item.cost * item.quantityOrdered).toFixed(2);
        output += twoCols(details, total) + '\n';
    });
    
    // Total Cost
    output += line() + '\n';
    output += twoCols('TOTAL COST:', `Ksh ${po.totalCost.toFixed(2)}`) + '\n';
    
    // Footer
    output += '\n\n\n\x1D\x56\x41\x03'; // Cut paper
    return output;
};
