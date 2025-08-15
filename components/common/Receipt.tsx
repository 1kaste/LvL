
import React from 'react';
import { Sale, StoreSettings } from '../../types';

interface ReceiptProps {
    sale: Sale;
    settings: StoreSettings;
    isPreview?: boolean;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, settings, isPreview = false }) => {
    return (
        <div className="font-mono text-xs text-black bg-white p-2 w-72 mx-auto">
            <div className="text-center font-bold text-lg mb-2">{isPreview ? 'BILL' : 'RECEIPT'}</div>
            {settings.showLogoOnReceipt && settings.logoUrl && (
                <img src={settings.logoUrl} alt="Store Logo" className="w-20 h-20 mx-auto my-2 object-contain" />
            )}
            <div className="text-center">
                <h2 className="text-sm font-bold">{settings.storeName}</h2>
                <p>{settings.address}</p>
                <p>{settings.phone}</p>
                <p className="mb-2">{settings.email}</p>
                {settings.receiptHeader && <p className="font-semibold">{settings.receiptHeader}</p>}
            </div>

            <hr className="my-2 border-dashed border-black" />
            
            <div className="text-left">
                <p>{isPreview ? 'Bill #:' : 'Receipt:'} {sale.id.replace('BILL-', '')}</p>
                <p>Date: {new Date(sale.date).toLocaleString()}</p>
                <p>Served By: {sale.servedBy}</p>
                <p>Customer: {sale.customerType}</p>
            </div>
            
            <div className="w-full my-2">
                <table className="w-full text-left text-[11px] leading-tight">
                    <thead className="border-t border-b border-dashed border-black">
                        <tr>
                            <th className="py-1 font-semibold">ITEM</th>
                            <th className="py-1 font-semibold text-right">QTY</th>
                            <th className="py-1 font-semibold text-right">PRICE</th>
                            <th className="py-1 font-semibold text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map(item => (
                            <tr key={item.id}>
                                <td className="py-0.5">{item.name}</td>
                                <td className="py-0.5 text-right">{item.quantity}</td>
                                <td className="py-0.5 text-right">{item.price.toFixed(2)}</td>
                                <td className="py-0.5 text-right">{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="text-left space-y-1">
                <p>Subtotal: Ksh {sale.subtotal.toFixed(2)}</p>
                <p>Tax: Ksh {sale.tax.toFixed(2)}</p>
                {sale.discountApplied && sale.discountApplied.amount > 0 && (
                     <p>Discount ({sale.discountApplied.name}): -Ksh {sale.discountApplied.amount.toFixed(2)}</p>
                )}
                <p className="font-bold text-base border-t border-dashed border-black mt-1 pt-1">TOTAL: Ksh {sale.total.toFixed(2)}</p>
                {!isPreview && (
                    <p>Payment Method: <span className="capitalize">{sale.paymentMethod}</span></p>
                )}
            </div>
            
            {(settings.paymentMethods?.filter(pm => pm.showOnReceipt) || []).length > 0 && (
                <>
                    <hr className="my-2 border-dashed border-black" />
                    <div className="text-left">
                        <p className="font-bold">PAYMENT OPTIONS:</p>
                        {settings.paymentMethods.filter(pm => pm.showOnReceipt).map(pm => (
                            <div key={pm.id} className="mt-1">
                                <p className="font-semibold">{pm.name}</p>
                                <div className="whitespace-pre-wrap">{pm.details}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <hr className="my-2 border-dashed border-black" />

            <div className="text-center mt-2">
                <p>{settings.receiptFooter}</p>
            </div>
        </div>
    );
};

export default Receipt;
