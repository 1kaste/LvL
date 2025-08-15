import React, { createContext, useContext, useState, useEffect, useCallback, FC, ReactNode } from 'react';
import { printerService } from '../services/printerService';
import { useData } from './DataContext';
import { Printer, PrinterStatus } from '../types';

interface PrinterContextType {
    printerStatuses: Map<string, { status: PrinterStatus; message?: string }>;
    connectToPrinter: (printer: Printer) => void;
    disconnectFromPrinter: (printerId: string) => void;
    sendPrintData: (printerId: string, data: string) => boolean;
}

const PrinterContext = createContext<PrinterContextType | null>(null);

export const PrinterProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { printerSettings } = useData();
    const [printerStatuses, setPrinterStatuses] = useState<Map<string, { status: PrinterStatus; message?: string }>>(new Map());

    const handleStatusUpdate = useCallback((printerId: string, status: PrinterStatus, message?: string) => {
        setPrinterStatuses(prev => new Map(prev).set(printerId, { status, message }));
    }, []);

    useEffect(() => {
        printerService.setStatusUpdateCallback(handleStatusUpdate);
        
        // Attempt to auto-connect to the default printer on load if it's an IP printer
        const selectedPrinter = printerSettings.printers.find(p => p.id === printerSettings.selectedPrinterId);
        if (selectedPrinter && selectedPrinter.type === 'IP') {
            printerService.connect(selectedPrinter);
        }

        // Cleanup on unmount
        return () => {
            printerSettings.printers.forEach(p => {
                if (p.type === 'IP') {
                    printerService.disconnect(p.id);
                }
            });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printerSettings.selectedPrinterId]); // Re-run if default printer changes

    const connectToPrinter = (printer: Printer) => {
        printerService.connect(printer);
    };

    const disconnectFromPrinter = (printerId: string) => {
        printerService.disconnect(printerId);
    };

    const sendPrintData = (printerId: string, data: string): boolean => {
        return printerService.send(printerId, data);
    };

    const value = {
        printerStatuses,
        connectToPrinter,
        disconnectFromPrinter,
        sendPrintData,
    };

    return (
        <PrinterContext.Provider value={value}>
            {children}
        </PrinterContext.Provider>
    );
};

export const usePrinters = (): PrinterContextType => {
    const context = useContext(PrinterContext);
    if (!context) {
        throw new Error('usePrinters must be used within a PrinterProvider');
    }
    return context;
};
