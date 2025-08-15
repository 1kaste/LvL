



import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, TimeLog, Sale, StoreSettings } from '../types';
import { convertImageToDataUrl } from './imageConverter';

const addHeaderFooter = (doc: jsPDF, storeSettings: StoreSettings, logoDataUrl: string | null, footerLogoDataUrl: string | null) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        
        // Header
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(storeSettings?.storeName || 'Jobiflow Store', 14, 10);
        doc.text(`${storeSettings?.address || 'N/A'} | ${storeSettings?.phone || 'N/A'}`, 14, 14);
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, pageWidth - 24, 8, 10, 10);
            } catch (e) { console.error("Error adding store logo to PDF", e); }
        }
        
        // Footer
        if (storeSettings?.showPdfFooter) {
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
                const footerTextLines = storeSettings.pdfFooterText.split('\n');
                doc.text(footerTextLines, textX, pageHeight - 13);
            }
        }
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }
};


export const generateShiftReportPDF = async (
    user: User,
    timeLog: TimeLog,
    salesForShift: Sale[],
    storeSettings: StoreSettings
): Promise<File> => {
    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings?.logoUrl);
    const footerLogoDataUrl = (storeSettings?.showPdfFooter && storeSettings?.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;

    // Page 1: Summary
    doc.setFontSize(18);
    doc.text(`Shift Report for ${user?.name || 'Unknown User'}`, 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 36);

    // Shift Details table
    autoTable(doc, {
        startY: 42,
        head: [['Shift Details', '']],
        body: [
            ['Employee ID', user?.id || 'N/A'],
            ['Role', user?.role || 'N/A'],
            ['Clock In', timeLog?.clockInTime ? new Date(timeLog.clockInTime).toLocaleString() : 'N/A'],
            ['Clock Out', timeLog?.clockOutTime ? new Date(timeLog.clockOutTime).toLocaleString() : 'N/A'],
            ['Duration', `${timeLog?.durationHours?.toFixed(2) || 'N/A'} hours`],
        ],
        headStyles: { fillColor: '#00848d' }
    });

    const totalRevenue = salesForShift.reduce((sum, sale) => sum + sale.total, 0);
    const salesByPayment = salesForShift.reduce((acc, sale) => {
        const payment = sale.paymentMethod;
        acc[payment] = (acc[payment] || 0) + sale.total;
        return acc;
    }, {} as Record<string, number>);

    // Sales Summary table
    autoTable(doc, {
        head: [['Sales Summary', '']],
        body: [
            ['Total Transactions', salesForShift.length.toString()],
            ['Total Revenue', `Ksh ${totalRevenue.toFixed(2)}`],
            ...Object.entries(salesByPayment).map(([method, amount]) => [
                `${method.charAt(0).toUpperCase() + method.slice(1)} Sales`,
                `Ksh ${(amount ?? 0).toFixed(2)}`
            ])
        ],
        headStyles: { fillColor: '#00848d' }
    });
    
    // Cash Reconciliation table
    autoTable(doc, {
        head: [['Cash Reconciliation', '']],
        body: [
            ['Expected Cash', `Ksh ${(timeLog?.expectedSales?.cash ?? 0).toFixed(2)}`],
            ['Declared Cash', `Ksh ${(timeLog?.declaredAmount ?? 0).toFixed(2)}`],
            ['Difference', `Ksh ${(timeLog?.difference ?? 0).toFixed(2)}`],
        ],
        headStyles: { fillColor: '#ea5314' }
    });

    // Page 2: Detailed Sales Log
    if (salesForShift.length > 0) {
        doc.addPage();
        doc.setFontSize(18);
        doc.text("Detailed Sales Log", 14, 28);
        autoTable(doc, {
            startY: 35,
            head: [['Time', 'ID', 'Items', 'Payment', 'Total']],
            body: salesForShift.map(sale => [
                new Date(sale.date).toLocaleTimeString(),
                sale.id,
                sale.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
                sale.paymentMethod,
                `Ksh ${sale.total.toFixed(2)}`,
            ]),
            margin: { top: 35 }
        });
    }

    addHeaderFooter(doc, storeSettings, logoDataUrl, footerLogoDataUrl);

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `ShiftReport_${user?.name?.replace(/\s/g, '_') || 'user'}_${new Date().toISOString().split('T')[0]}.pdf`, { type: 'application/pdf' });

    return pdfFile;
}