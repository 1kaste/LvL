import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, OrderItem, Sale, Category, KegInstance, MeasureUnit, Discount, OrderTab, User } from '../types';
import { useData } from '../context/DataContext';
import SearchInput from '../components/common/SearchInput';
import ReceiptModal from '../components/common/ReceiptModal';
import AuthorizationModal from '../components/common/AuthorizationModal';
import SplitBillModal from '../components/common/SplitBillModal';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Toast from '../components/common/Toast';
import { FaMinus, FaPlus, FaBars, FaKeyboard, FaMoneyBillWave, FaCreditCard, FaBalanceScale, FaTimes, FaPercentage, FaTag, FaSignOutAlt } from 'react-icons/fa';
import MpesaIcon from '../components/common/MpesaIcon';
import Receipt from '../components/common/Receipt';
import { usePrinters } from '../context/PrinterContext';
import { formatReceiptForPrinter } from '../utils/formatReceiptForPrinter';


// Simplified Button for this specific page layout
const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
    <button className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props}>
        {children}
    </button>
);

const normalizeUnit = (value: number, unit: MeasureUnit): number => {
    if (unit === 'L' || unit === 'kg') {
        return value * 1000;
    }
    return value; // ml or g
}

const useLongPress = (callback: () => void, { delay = 400, initialSpeed = 150, fastSpeed = 50 } = {}) => {
    const timeoutRef = useRef<number | undefined>(undefined);
    const intervalRef = useRef<number | undefined>(undefined);
    const speedTimeoutRef = useRef<number | undefined>(undefined);

    const start = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        callback(); 

        timeoutRef.current = window.setTimeout(() => {
            intervalRef.current = window.setInterval(callback, initialSpeed);
            
            speedTimeoutRef.current = window.setTimeout(() => {
                 if (intervalRef.current) {
                    window.clearInterval(intervalRef.current);
                    intervalRef.current = window.setInterval(callback, fastSpeed);
                 }
            }, 1000);

        }, delay);
    }, [callback, delay, initialSpeed, fastSpeed]);

    const stop = useCallback(() => {
        window.clearTimeout(timeoutRef.current);
        window.clearInterval(intervalRef.current);
        window.clearTimeout(speedTimeoutRef.current);
    }, []);
    
    useEffect(() => {
      return stop;
    }, [stop]);

    return {
        onMouseDown: (e: React.MouseEvent) => start(e),
        onTouchStart: (e: React.TouchEvent) => start(e),
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchEnd: stop,
        onTouchCancel: stop,
    };
};

const QuantityControl: React.FC<{
    itemId: string;
    quantity: number;
    onUpdate: (itemId: string, change: number) => void;
}> = ({ itemId, quantity, onUpdate }) => {
    
    const increaseProps = useLongPress(() => onUpdate(itemId, 1));
    const decreaseProps = useLongPress(() => onUpdate(itemId, -1));

    return (
        <div className="flex items-center justify-center gap-4">
            <button {...decreaseProps} className="p-2 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 active:bg-gray-400 dark:active:bg-slate-500 transition-colors select-none">
                <FaMinus size={12}/>
            </button>
            <span className="w-8 text-center font-semibold select-none">{quantity}</span>
            <button {...increaseProps} className="p-2 rounded-md bg-green-600 hover:bg-green-500 text-white active:bg-green-700 transition-colors select-none">
                <FaPlus size={12}/>
            </button>
        </div>
    );
};


interface ProductBrowserProps {
    categories: Category[];
    products: Product[];
    kegInstances: KegInstance[];
    activeCategory: string;
    setActiveCategory: (name: string) => void;
    onAddToOrder: (product: Product) => void;
    storeName: string;
    toggleSidebar: () => void;
    toggleKeyboard: () => void;
}

// Left Panel: Product Browser
const ProductBrowser: React.FC<ProductBrowserProps> = ({ categories, products, kegInstances, activeCategory, setActiveCategory, onAddToOrder, storeName, toggleSidebar, toggleKeyboard }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const displayCategories = useMemo(() => [{ id: 'all', name: 'All Items' }, ...categories], [categories]);
    
    const productsWithKegInfo = useMemo(() => {
        return products.map(p => {
            let stock = p.stock;
            let stockLabel: string;

            if (p.productType === 'Service' && p.linkedKegProductId) {
                if (!p.servingSize || !p.servingSizeUnit) {
                    stock = 0;
                    stockLabel = 'Config Error';
                } else {
                    const tappedKeg = kegInstances.find(k => k.productId === p.linkedKegProductId && k.status === 'Tapped');
                    if (tappedKeg) {
                        const normalizedServingSize = normalizeUnit(p.servingSize, p.servingSizeUnit);
                        stock = normalizedServingSize > 0 ? Math.floor(tappedKeg.currentVolume / normalizedServingSize) : Infinity;
                        stockLabel = 'Servings';
                    } else {
                        stock = 0;
                        stockLabel = 'No Keg Tapped';
                    }
                }
            } else if (p.productType === 'Stocked') {
                stockLabel = 'Stock';
            } else if (p.productType === 'Keg') {
                stockLabel = 'Kegs';
            } else {
                stockLabel = 'Service'; // Plain service
                stock = Infinity;
            }
            
            return { ...p, stock, stockLabel };
        });
    }, [products, kegInstances]);


    const productsForActiveCat = useMemo(() => {
        // We filter out only the non-sellable Keg container products.
        // Service products linked to kegs will be shown even if no keg is tapped,
        // but they will be disabled and show "No Keg Tapped" as their stock,
        // which provides better feedback to the user.
        const availableProducts = productsWithKegInfo.filter(p => p.productType !== 'Keg');

        const filteredByName = availableProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (activeCategory === 'All Items') {
            return filteredByName;
        }
        return filteredByName.filter(p => p.category === activeCategory);
    }, [productsWithKegInfo, activeCategory, searchQuery]);


    return (
        <div className="w-[420px] bg-gray-50 dark:bg-dark-mode-blue-900 p-4 flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-dark-mode-blue-800">
            <header className="flex items-center gap-3 mb-4 flex-shrink-0">
                <button onClick={toggleSidebar} className="p-2 rounded-full text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-dark-mode-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-dark-mode-blue-900 focus:ring-primary-orange-500">
                    <FaBars className="text-xl" />
                </button>
                <h1 className="font-bold text-xl text-gray-900 dark:text-white">{storeName}</h1>
                <div className="flex-grow"></div>
                <button onClick={toggleKeyboard} className="p-2 rounded-full text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-dark-mode-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-dark-mode-blue-900 focus:ring-primary-orange-500" title="Toggle Virtual Keyboard">
                    <FaKeyboard className="text-xl"/>
                </button>
            </header>
            <div className="mb-4 flex-shrink-0">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                />
            </div>
            
            <h2 className="text-sm text-gray-500 dark:text-slate-400 mb-2 flex-shrink-0">Available Products</h2>
            <div className="flex-grow flex flex-row min-h-0">
                {/* Category Sidebar */}
                <aside className="w-32 border-r border-gray-200/50 dark:border-dark-mode-blue-800/50 pr-2 space-y-1 overflow-y-auto flex-shrink-0">
                    {displayCategories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.name)}
                            className={`w-full text-left p-3 text-sm rounded-lg font-medium transition-colors ${activeCategory === c.name ? 'bg-primary-orange-600 text-white' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-700/50'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </aside>
                {/* Product Grid */}
                <section className="flex-1 overflow-y-auto pl-2">
                    <div className="grid grid-cols-2 gap-2">
                        {productsForActiveCat.map(p => (
                            <button
                                key={p.id}
                                onClick={() => onAddToOrder(p)}
                                disabled={p.stock <= 0 && isFinite(p.stock)}
                                className="text-left p-3 rounded-lg bg-white dark:bg-dark-mode-blue-800 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-gray-100 dark:enabled:hover:bg-dark-mode-blue-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-orange-500"
                            >
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-200">{p.name}</p>
                                <div className="flex justify-between items-baseline text-sm mt-1">
                                    <span className="text-gray-500 dark:text-slate-400">
                                        {p.stockLabel}: {isFinite(p.stock) ? p.stock : ''}
                                    </span>
                                    <span className="text-green-600 dark:text-green-400 font-bold">Ksh{p.price.toFixed(2)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};


interface OrderProps {
  toggleSidebar: () => void;
  toggleKeyboard: () => void;
  onLogout: () => void;
  onSaleLock: () => void;
}

const ApplyDiscountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  discounts: Discount[];
  onApply: (discountId: string | null) => void;
  currentDiscountId: string | null;
}> = ({ isOpen, onClose, discounts, onApply, currentDiscountId }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Apply a Discount">
            <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a discount to apply to this order. This will override any active global discounts for this order only.</p>
                {discounts.map(d => (
                     <button
                        key={d.id}
                        onClick={() => onApply(d.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${currentDiscountId === d.id ? 'border-primary-orange-500 bg-primary-orange-50 dark:bg-primary-orange-900/30' : 'border-transparent bg-gray-100 dark:bg-dark-mode-blue-800 hover:border-primary-orange-300'}`}
                     >
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">{d.name}</span>
                            <span className={`font-bold text-sm ${d.type === 'percentage' ? 'text-blue-500' : 'text-green-500'}`}>
                                {d.type === 'percentage' ? `${d.value}% OFF` : `Ksh ${d.value.toFixed(2)} OFF`}
                            </span>
                        </div>
                     </button>
                ))}
                {currentDiscountId && (
                    <Button variant="secondary" onClick={() => onApply(null)} className="w-full mt-4">
                        Remove Manual Discount
                    </Button>
                )}
            </div>
        </Modal>
    );
};

// Main Order Page Component
const Order: React.FC<OrderProps> = ({ toggleSidebar, toggleKeyboard, onLogout, onSaleLock }) => {
    const { 
        products, categories, kegInstances, processSale, storeSettings, currentUser, discounts,
        openOrders, setOpenOrders, printerSettings
    } = useData();
    const { printerStatuses, sendPrintData } = usePrinters();
    const [activeCategory, setActiveCategory] = useState('All Items');
    
    // Local state to manage which of the user's tabs is active
    const [activeTabId, setActiveTabId] = useState<number | null>(null);

    // Get the current user's tabs from the global state
    const userTabs = useMemo(() => openOrders.filter(t => t.userId === currentUser?.id), [openOrders, currentUser?.id]);
    
    // Ensure the current user always has at least one tab and set the active tab
    useEffect(() => {
        if (!currentUser) return;

        const userHasTabs = openOrders.some(t => t.userId === currentUser.id);
        if (!userHasTabs) {
            const newTabId = Date.now();
            const newTab: OrderTab = {
                id: newTabId,
                name: 'Order 1',
                items: [],
                userId: currentUser.id,
                manualDiscountId: null,
            };
            setOpenOrders(prev => [...prev, newTab]);
            setActiveTabId(newTabId);
        } else {
            // If activeTabId is not set or not in userTabs, set it to the first one
            if (!activeTabId || !userTabs.some(t => t.id === activeTabId)) {
                setActiveTabId(userTabs[0]?.id || null);
            }
        }
    }, [openOrders, currentUser, setOpenOrders, activeTabId, userTabs]);

    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [isSplitBillModalOpen, setSplitBillModalOpen] = useState(false);
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Sale['paymentMethod'] | null>(null);
    const [stayUnlocked, setStayUnlocked] = useState(false);
    const [toastInfo, setToastInfo] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
    const [isPrinting, setIsPrinting] = useState(false);
    const saleToPrint = useRef<Sale | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToastInfo({ show: true, message, type });
    }, []);
    
    const activeOrder = useMemo(() => openOrders.find(t => t.id === activeTabId), [openOrders, activeTabId]);
    const activeOrderItems = useMemo(() => activeOrder?.items || [], [activeOrder]);

    useEffect(() => {
      // Set a default category if the initial one doesn't exist
      if (!categories.some(c => c.name === activeCategory) && activeCategory !== 'All Items') {
        setActiveCategory('All Items');
      }
    }, [categories, activeCategory]);

    if (!currentUser) {
        return null; // Should not happen if route is protected
    }
    
    const findProductById = (id: string) => products.find(p => p.id === id);

    const checkAvailability = (product: Product, quantity: number): boolean => {
      if (product.productType === 'Service' && product.linkedKegProductId) {
        if (!product.servingSize || !product.servingSizeUnit) {
            alert(`Product "${product.name}" is linked to a keg but is missing a serving size configuration. Please fix this in the Inventory settings.`);
            return false;
        }

        const hasAnyKegInstance = kegInstances.some(k => k.productId === product.linkedKegProductId);
        if (!hasAnyKegInstance) {
            alert(`Keg for ${product.name} not found in inventory. Please add it via Keg Management.`);
            return false;
        }
        
        const tappedKeg = kegInstances.find(k => k.productId === product.linkedKegProductId && k.status === 'Tapped');
        if (!tappedKeg) {
          alert(`No active keg for ${product.name}. Please tap a keg first.`);
          return false;
        }
        const normalizedServingSize = normalizeUnit(product.servingSize, product.servingSizeUnit);
        const servingsAvailable = Math.floor(tappedKeg.currentVolume / normalizedServingSize);
        if (quantity > servingsAvailable) {
          alert(`Only ${servingsAvailable} servings of ${product.name} available.`);
          return false;
        }
      } else if (product.productType === 'Stocked') {
        if (quantity > product.stock) {
          alert(`Maximum stock for ${product.name} reached (${product.stock}).`);
          return false;
        }
      }
      return true;
    };

    const addToOrder = (product: Product) => {
        if (!activeTabId) return;
        
        const originalProduct = findProductById(product.id);
        if (!originalProduct) return;

        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id !== activeTabId) return tab;

            const existingItem = tab.items.find(item => item.id === product.id);

            if (!checkAvailability(originalProduct, existingItem ? existingItem.quantity + 1 : 1)) {
                return tab; // return original tab if not available
            }
            
            let newItems;
            if (existingItem) {
                newItems = tab.items.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                newItems = [...tab.items, { ...originalProduct, quantity: 1 }];
            }
            
            return { ...tab, items: newItems };
        }));
    };

    const updateQuantity = (productId: string, change: number) => {
        if (!activeTabId) return;
        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id !== activeTabId) return tab;

            const itemToUpdate = tab.items.find(item => item.id === productId);
            if (!itemToUpdate) return tab;

            const newQuantity = itemToUpdate.quantity + change;
            if (newQuantity <= 0) {
                const newItems = tab.items.filter(item => item.id !== productId);
                return { ...tab, items: newItems };
            }
            
            const originalProduct = findProductById(productId);
            if (!originalProduct) return tab;
            
            if (!checkAvailability(originalProduct, newQuantity)) {
              return tab;
            }

            const newItems = tab.items.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
            return { ...tab, items: newItems };
        }));
    };
    
    const handleVoidActiveOrder = () => {
        if(activeOrderItems.length > 0) {
            setAuthModalOpen(true);
        } else {
            showToast("Order is already empty.", 'error')
        }
    };
    
    const handleAuthorizationSuccess = (authorizingUser: User) => {
        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id === activeTabId) {
                return { ...tab, items: [], manualDiscountId: null };
            }
            return tab;
        }));
        setSelectedPaymentMethod(null);
        setAuthModalOpen(false);
        showToast(`Order voided. Authorized by ${authorizingUser.name}.`, 'success');
    };

    const taxRate = 0.16; // 16% VAT

    const grossTotalBeforeDiscount = useMemo(() => activeOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [activeOrderItems]);
    
    const discountsBreakdown = useMemo(() => {
        // If a manual discount is applied, it overrides everything.
        const manualDiscountId = activeOrder?.manualDiscountId;
        if (manualDiscountId) {
            const manualDiscount = discounts.find(d => d.id === manualDiscountId);
            if (manualDiscount) {
                let amount = 0;
                if (manualDiscount.type === 'fixed') {
                    amount = Math.min(manualDiscount.value, grossTotalBeforeDiscount);
                } else {
                    amount = grossTotalBeforeDiscount * (manualDiscount.value / 100);
                }
                return {
                    totalAmount: amount,
                    appliedDiscounts: [{ ...manualDiscount, amount }]
                };
            }
        }
    
        // Automatic discounts logic
        const activeDiscounts = discounts.filter(d => d.isActive);
        if (activeDiscounts.length === 0) {
            return { totalAmount: 0, appliedDiscounts: [] };
        }
    
        let totalDiscountAmount = 0;
        const appliedDiscountsList: (Discount & { amount: number })[] = [];
        let remainingItems = [...activeOrderItems];
    
        // 1. Process product-specific discounts
        const productDiscounts = activeDiscounts.filter(d => d.productIds && d.productIds.length > 0);
        
        for (const discount of productDiscounts) {
            let discountableSubtotal = 0;
            const itemsForThisDiscount = remainingItems.filter(item => discount.productIds?.includes(item.id));
            
            if (itemsForThisDiscount.length > 0) {
                itemsForThisDiscount.forEach(item => {
                    discountableSubtotal += item.price * item.quantity;
                });
    
                let currentDiscountAmount = 0;
                if (discount.type === 'fixed') {
                    currentDiscountAmount = Math.min(discount.value, discountableSubtotal);
                } else {
                    currentDiscountAmount = discountableSubtotal * (discount.value / 100);
                }
                
                if (currentDiscountAmount > 0) {
                    totalDiscountAmount += currentDiscountAmount;
                    appliedDiscountsList.push({ ...discount, amount: currentDiscountAmount });
                    
                    // Remove these items so they aren't considered for global discounts
                    remainingItems = remainingItems.filter(item => !discount.productIds?.includes(item.id));
                }
            }
        }
        
        // 2. Process global discounts
        const globalDiscounts = activeDiscounts.filter(d => !d.productIds || d.productIds.length === 0);
        
        if (globalDiscounts.length > 0 && remainingItems.length > 0) {
            const remainingSubtotal = remainingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
            // Find the best global discount
            let bestGlobalDiscount: (Discount & { amount: number }) | null = null;
            for (const discount of globalDiscounts) {
                let amount = 0;
                if (discount.type === 'fixed') {
                    amount = Math.min(discount.value, remainingSubtotal);
                } else {
                    amount = remainingSubtotal * (discount.value / 100);
                }
                if (!bestGlobalDiscount || amount > bestGlobalDiscount.amount) {
                    bestGlobalDiscount = { ...discount, amount };
                }
            }
    
            if (bestGlobalDiscount && bestGlobalDiscount.amount > 0) {
                totalDiscountAmount += bestGlobalDiscount.amount;
                appliedDiscountsList.push(bestGlobalDiscount);
            }
        }
    
        return {
            totalAmount: totalDiscountAmount,
            appliedDiscounts: appliedDiscountsList
        };
    
    }, [activeOrderItems, discounts, activeOrder?.manualDiscountId, grossTotalBeforeDiscount]);
    
    const discountAmount = discountsBreakdown.totalAmount;
    const total = grossTotalBeforeDiscount - discountAmount;
    const subtotal = useMemo(() => total / (1 + taxRate), [total]);
    const tax = useMemo(() => total - subtotal, [total, subtotal]);
    
    const triggerSaleLock = useCallback(() => {
        if (storeSettings.autoLockOnPrint && !stayUnlocked) {
            onSaleLock();
        }
        // Always reset for the next order
        setStayUnlocked(false);
    }, [storeSettings.autoLockOnPrint, stayUnlocked, onSaleLock]);

    const finalizeOrder = useCallback(() => {
        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id === activeTabId) {
                return { ...tab, items: [], manualDiscountId: null };
            }
            return tab;
        }));
        
        setSelectedPaymentMethod(null);
        saleToPrint.current = null;
        setIsPrinting(false);
        
        triggerSaleLock();
    }, [activeTabId, setOpenOrders, triggerSaleLock]);

    useEffect(() => {
        // This effect should only run when a sale is successful AND there are printers configured.
        if (!isPrinting || !saleToPrint.current || printerSettings.printers.length === 0) return;

        const printLogic = () => {
            const selectedPrinter = printerSettings.printers.find(p => p.id === printerSettings.selectedPrinterId);
            
            if (selectedPrinter && selectedPrinter.type === 'IP') {
                const status = printerStatuses.get(selectedPrinter.id);
                if (status?.status === 'connected') {
                    const receiptText = formatReceiptForPrinter(saleToPrint.current!, storeSettings);
                    const success = sendPrintData(selectedPrinter.id, receiptText);
                    if (success) {
                        showToast(`Print job sent to ${selectedPrinter.name}.`);
                        finalizeOrder();
                        return;
                    } else {
                        showToast(`Failed to send to ${selectedPrinter.name}. Retrying with browser print.`, 'error');
                    }
                } else {
                    showToast(`Printer "${selectedPrinter.name}" is not connected. Falling back to browser print.`, 'error');
                }
            }

            // Fallback for non-IP printers, disconnected IP printers, or if no default is selected
            window.print();
            finalizeOrder();
        };

        const timer = setTimeout(printLogic, 200);
        return () => clearTimeout(timer);
    }, [isPrinting, printerSettings, printerStatuses, sendPrintData, storeSettings, finalizeOrder, showToast]);

    const handleFinalizePayment = async () => {
        if (activeOrderItems.length === 0 || !activeOrder || !selectedPaymentMethod) return;
        if (currentUser.timeClockStatus !== 'Clocked In') {
            showToast("You must be clocked in to process sales.", 'error');
            return;
        }
        setIsPrinting(true); // Set loading state immediately

        const discountDetails = discountsBreakdown.totalAmount > 0
            ? {
                name: discountsBreakdown.appliedDiscounts.map(d => d.name).join(', '),
                amount: discountsBreakdown.totalAmount
            }
            : undefined;
        const newSale = await processSale(activeOrderItems, selectedPaymentMethod, currentUser.name, activeOrder.name, discountDetails);

        if (newSale) {
          saleToPrint.current = newSale;
          // If no printers are configured, show a message and finalize without triggering the print effect.
          if (printerSettings.printers.length === 0) {
              showToast("Sale completed. No printer configured, skipping print.", 'error');
              setTimeout(finalizeOrder, 500); // Use timeout to let user see toast
          }
          // If printers ARE configured, the useEffect for 'isPrinting' will handle the rest.
        } else {
          showToast('Failed to process sale. Please try again.', 'error');
          setIsPrinting(false); // Revert loading state on failure
        }
    };
    
    const formatCurrency = (amount: number) => `Ksh ${amount.toFixed(2)}`;
    
    const handleSplitBillComplete = () => {
        setSplitBillModalOpen(false);
        // Clear the items from the paid tab
        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id === activeTabId) {
                return { ...tab, items: [], manualDiscountId: null };
            }
            return tab;
        }));
        triggerSaleLock();
    };

    const handleAddTab = () => {
        if (userTabs.length >= 5) {
            alert("You can only have a maximum of 5 open orders.");
            return;
        }
        
        const existingOrderNumbers = new Set(userTabs.map(t => {
            const match = t.name.match(/^Order (\d+)$/);
            return match ? parseInt(match[1]) : 0;
        }));
        let newOrderNumber = 1;
        while (existingOrderNumbers.has(newOrderNumber)) {
            newOrderNumber++;
        }

        const newTabId = Date.now();
        const newTab: OrderTab = {
            id: newTabId,
            name: `Order ${newOrderNumber}`,
            items: [],
            userId: currentUser.id,
            manualDiscountId: null,
        };
        setOpenOrders(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
        setSelectedPaymentMethod(null);
    };

    const handleCloseTab = (tabIdToClose: number) => {
        const tabToClose = openOrders.find(t => t.id === tabIdToClose);
        if (!tabToClose) return;

        if (tabToClose.items.length > 0) {
            alert("Please void the order before closing the tab.");
            return;
        }

        if (userTabs.length <= 1) {
            alert("You cannot close the last order tab.");
            return;
        }

        setOpenOrders(prevOrders => prevOrders.filter(tab => tab.id !== tabIdToClose));
        // Active tab will be reset by the useEffect hook
    };
    
    const handleSetActiveTab = (tabId: number) => {
        setActiveTabId(tabId);
        setSelectedPaymentMethod(null);
    }

    const handleApplyDiscount = (discountId: string | null) => {
        if (!activeTabId) return;
        setOpenOrders(currentOrders => currentOrders.map(tab => {
            if (tab.id === activeTabId) {
                return { ...tab, manualDiscountId: discountId };
            }
            return tab;
        }));
        setDiscountModalOpen(false);
    }

    return (
        <div className="flex h-full font-sans text-gray-900 dark:text-gray-200 bg-gray-200 dark:bg-dark-mode-blue-950">
            <ProductBrowser
                categories={categories}
                products={products}
                kegInstances={kegInstances}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                onAddToOrder={addToOrder}
                storeName={storeSettings.storeName}
                toggleSidebar={toggleSidebar}
                toggleKeyboard={toggleKeyboard}
            />

            <main className="flex-1 flex flex-col p-4 bg-white dark:bg-dark-mode-blue-900">
                <header className="flex justify-end items-center mb-2 flex-shrink-0">
                    <div className="text-right">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{currentUser.name}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{currentUser.role}</p>
                    </div>
                     <img src={`https://i.pravatar.cc/40?u=${currentUser.id}`} alt={currentUser.name} className="w-10 h-10 rounded-full ml-3" />
                </header>

                {/* Tab Manager */}
                <div className="flex items-center border-b-2 border-gray-200 dark:border-dark-mode-blue-700 mb-2 flex-shrink-0">
                    {userTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleSetActiveTab(tab.id)}
                            className={`relative px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTabId === tab.id ? 'border-primary-orange-600 text-primary-orange-600' : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800'}`}
                        >
                            {tab.name}
                            {tab.items.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-primary-cyan-500 rounded-full"></span>}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                                className="p-1 rounded-full text-gray-400 hover:bg-red-200 dark:hover:bg-red-800/50 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                disabled={tab.items.length > 0 || userTabs.length <= 1}
                                title={tab.items.length > 0 ? "Void order to close" : "Close tab"}
                            >
                                <FaTimes size={10} />
                            </button>
                        </button>
                    ))}
                    {userTabs.length < 5 && (
                        <button onClick={handleAddTab} className="p-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800 transition-colors" title="Add new order">
                            <FaPlus />
                        </button>
                    )}
                </div>
                
                {/* Order Items Table */}
                <div className="flex-grow bg-gray-50 dark:bg-dark-mode-blue-800/50 rounded-lg overflow-y-auto min-h-0">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-dark-mode-blue-800 z-10 text-gray-600 dark:text-gray-300">
                            <tr className="border-b-2 border-gray-300 dark:border-slate-700">
                                <th className="p-4 font-semibold w-2/5">Item</th>
                                <th className="p-4 font-semibold text-center">Unit</th>
                                <th className="p-4 font-semibold text-center w-1/4">Qty</th>
                                <th className="p-4 font-semibold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                        {activeOrderItems.length > 0 ? (
                            activeOrderItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-200 dark:border-dark-mode-blue-700 text-lg dark:text-gray-200">
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 text-center font-mono">{item.price.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <QuantityControl
                                            itemId={item.id}
                                            quantity={item.quantity}
                                            onUpdate={updateQuantity}
                                        />
                                    </td>
                                    <td className="p-4 text-right font-semibold font-mono">{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center p-16 text-gray-400 dark:text-slate-500">
                                    Select products to start an order.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Footer section */}
                <footer className="pt-4 flex-shrink-0 flex items-end gap-4">
                    <div className="flex-grow space-y-2">
                        <ActionButton onClick={() => setDiscountModalOpen(true)} className="w-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600" disabled={activeOrderItems.length === 0}>
                           {activeOrder?.manualDiscountId ? <FaTag className="text-primary-orange-500"/> : <FaPercentage/>}
                           {activeOrder?.manualDiscountId ? 'Manual Discount Applied' : 'Apply Discount'}
                        </ActionButton>
                        <ActionButton onClick={handleVoidActiveOrder} className="w-full bg-red-700 text-white hover:bg-red-800">Void Order</ActionButton>
                        <ActionButton onClick={onLogout} className="w-full bg-gray-600 text-white hover:bg-gray-700">
                            <FaSignOutAlt /> Log Out
                        </ActionButton>
                    </div>
                    <div className="w-1/3 bg-gray-50 dark:bg-dark-mode-blue-800/50 rounded-lg p-4">
                         <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                            <p>Subtotal</p>
                            <p className="font-mono">{formatCurrency(subtotal)}</p>
                        </div>
                         <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                            <p>Tax ({(taxRate * 100).toFixed(0)}%)</p>
                            <p className="font-mono">{formatCurrency(tax)}</p>
                        </div>
                        {discountAmount > 0 && (
                            <div className="text-red-500">
                                {discountsBreakdown.appliedDiscounts.map(d => (
                                    <div key={d.id} className="flex justify-between items-center text-sm">
                                        <p>{d.name}</p>
                                        <p className="font-mono">-{formatCurrency(d.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <hr className="my-2 border-gray-200 dark:border-slate-700"/>
                        <div className="flex justify-between items-center text-gray-900 dark:text-white text-xl font-bold mt-2">
                            <p>TOTAL</p>
                            <p className="font-mono">{formatCurrency(total)}</p>
                        </div>
                    </div>
                     <div className="w-1/3 flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <ActionButton onClick={() => setSelectedPaymentMethod('cash')} disabled={activeOrderItems.length === 0} className={`h-full ${selectedPaymentMethod === 'cash' ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-offset-dark-mode-blue-900 bg-green-700' : 'bg-green-600'} text-white hover:bg-green-500`}>
                                <FaMoneyBillWave /> Cash
                            </ActionButton>
                            <ActionButton onClick={() => setSelectedPaymentMethod('card')} disabled={activeOrderItems.length === 0} className={`h-full ${selectedPaymentMethod === 'card' ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-dark-mode-blue-900 bg-blue-700' : 'bg-blue-600'} text-white hover:bg-blue-500`}>
                                <FaCreditCard /> Card
                            </ActionButton>
                             <ActionButton onClick={() => setSelectedPaymentMethod('mpesa')} disabled={activeOrderItems.length === 0} className={`h-full ${selectedPaymentMethod === 'mpesa' ? 'ring-2 ring-offset-2 ring-green-600 dark:ring-offset-dark-mode-blue-900 bg-green-900' : 'bg-green-800'} text-white hover:bg-green-700`}>
                                <MpesaIcon /> M-Pesa
                            </ActionButton>
                            <ActionButton onClick={() => setSplitBillModalOpen(true)} disabled={activeOrderItems.length === 0} className="bg-primary-orange-600 text-white hover:bg-primary-orange-500 h-full">
                                <FaBalanceScale /> Split Bill
                            </ActionButton>
                        </div>
                        {storeSettings.autoLockOnPrint && (
                            <div className="flex items-center justify-center -mt-1 mb-1">
                                <input 
                                    id="stayUnlocked" 
                                    type="checkbox" 
                                    checked={stayUnlocked}
                                    onChange={(e) => setStayUnlocked(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-400 text-primary-orange-600 focus:ring-primary-orange-500 bg-transparent"
                                />
                                <label htmlFor="stayUnlocked" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 select-none">
                                    Stay unlocked for next order
                                </label>
                            </div>
                        )}
                        <Button 
                            onClick={handleFinalizePayment} 
                            disabled={!selectedPaymentMethod || activeOrderItems.length === 0 || isPrinting} 
                            className="w-full text-lg" 
                            variant="primary">
                            {isPrinting ? 'Processing...' : 'Print Receipt & Finalize'}
                        </Button>
                    </div>
                </footer>
            </main>

            <AuthorizationModal
                isOpen={isAuthModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onAuthorize={handleAuthorizationSuccess}
                title="Manager Authorization Required"
                message={`To void items in ${activeOrder?.name}, a manager must authorize the action.`}
            />
            {isSplitBillModalOpen && (
                <SplitBillModal
                    isOpen={isSplitBillModalOpen}
                    onClose={() => setSplitBillModalOpen(false)}
                    onComplete={handleSplitBillComplete}
                    initialOrderItems={activeOrderItems}
                    taxRate={taxRate}
                    currentUser={currentUser}
                    processSale={processSale}
                    storeSettings={storeSettings}
                />
            )}
            {isDiscountModalOpen && activeOrder && (
                <ApplyDiscountModal
                    isOpen={isDiscountModalOpen}
                    onClose={() => setDiscountModalOpen(false)}
                    discounts={discounts}
                    onApply={handleApplyDiscount}
                    currentDiscountId={activeOrder.manualDiscountId}
                />
            )}
             <Toast 
                message={toastInfo.message} 
                show={toastInfo.show} 
                onClose={() => setToastInfo({ ...toastInfo, show: false })}
                type={toastInfo.type}
            />

            <div className="hidden">
                <div className="receipt-print-area">
                    {isPrinting && saleToPrint.current && (
                        <Receipt sale={saleToPrint.current} settings={storeSettings} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Order;