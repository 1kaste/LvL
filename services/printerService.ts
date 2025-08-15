import { Printer, PrinterStatus } from '../types';

type StatusUpdateCallback = (printerId: string, status: PrinterStatus, message?: string) => void;

class PrinterService {
    private connections: Map<string, WebSocket> = new Map();
    private onStatusUpdate: StatusUpdateCallback | null = null;

    public setStatusUpdateCallback(callback: StatusUpdateCallback) {
        this.onStatusUpdate = callback;
    }

    private updateStatus(printerId: string, status: PrinterStatus, message?: string) {
        this.onStatusUpdate?.(printerId, status, message);
    }

    public connect(printer: Printer): void {
        if (printer.type !== 'IP' || !printer.address) {
            return;
        }

        // Prevent re-connecting if already connected or connecting
        const existingConnection = this.connections.get(printer.id);
        if (existingConnection && (existingConnection.readyState === WebSocket.OPEN || existingConnection.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Prevent insecure WebSocket connections from secure (HTTPS) contexts
        if (window.location.protocol === 'https:') {
            this.updateStatus(printer.id, 'error', 'Direct IP printing is blocked by the browser on secure (https://) sites.');
            return;
        }

        this.updateStatus(printer.id, 'connecting');
        const wsUrl = `ws://${printer.address}`; 
        
        try {
            const ws = new WebSocket(wsUrl);
            this.connections.set(printer.id, ws);

            ws.onopen = () => {
                this.updateStatus(printer.id, 'connected');
            };

            ws.onclose = () => {
                // Only update status if the connection in the map is the one that closed.
                // This prevents race conditions if a new connection is established quickly.
                if (this.connections.get(printer.id) === ws) {
                    this.updateStatus(printer.id, 'disconnected');
                    this.connections.delete(printer.id);
                }
            };

            ws.onerror = (event) => {
                console.error(`WebSocket error for printer ${printer.id}:`, event);
                this.updateStatus(printer.id, 'error', 'Connection failed');
                if (this.connections.get(printer.id) === ws) {
                    this.connections.delete(printer.id);
                }
            };
            
            ws.onmessage = (event) => {
                console.log(`Message from printer ${printer.id}:`, event.data);
                // Can be used to handle status updates from the printer, e.g., 'OUT_OF_PAPER'
            };

        } catch (error) {
            console.error(`Failed to create WebSocket for printer ${printer.id}:`, error);
            this.updateStatus(printer.id, 'error', 'Invalid address');
        }
    }

    public disconnect(printerId: string): void {
        const ws = this.connections.get(printerId);
        if (ws) {
            ws.close();
            // onclose handler will update status and delete from map
        }
    }

    public send(printerId: string, data: string): boolean {
        const ws = this.connections.get(printerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
            return true;
        }
        console.warn(`Printer ${printerId} is not connected or ready.`);
        return false;
    }
}

// Export a singleton instance of the service
export const printerService = new PrinterService();