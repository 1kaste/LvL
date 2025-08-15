export type Theme = 'light' | 'dark';

export type Role = 'Admin' | 'Manager' | 'Cashier' | 'Server/bartender';

export type WeightUnit = 'g' | 'kg' | 'ml' | 'L';

export type TimeClockStatus = 'Clocked In' | 'Clocked Out' | 'Awaiting Clearance';

export type ShiftStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Late' | 'Missed';

export type MeasureUnit = 'ml' | 'L' | 'g' | 'kg';

export type PrinterStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'unmanaged';

export interface Deduction {
  id: string;
  userId: string;
  reason: string;
  amount: number;
  date: Date;
}

export interface User {
  id:string;
  name: string;
  email: string;
  role: Role;
  timeClockStatus: TimeClockStatus;
  clockInTime?: Date;
  password?: string;
  pin?: string;
  overridePin?: string;
  salaryAmount?: number;
  deductions?: Deduction[];
}

export interface Product {
  id: string;
  name:string;
  category: string;
  price: number;
  productType: 'Stocked' | 'Service' | 'Keg';
  stock: number; // For 'Stocked'/'Keg', this is # of units. For 'Service', Infinity.
  lowStockThreshold: number;
  // For 'Keg' type products
  kegCapacity?: number; // In user-defined units
  kegCapacityUnit?: MeasureUnit;
  // For 'Service' products sold from kegs
  linkedKegProductId?: string;
  servingSize?: number; // In user-defined units
  servingSizeUnit?: MeasureUnit;
}

export interface Category {
  id: string;
  name: string;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface OrderTab {
  id: number;
  name: string;
  items: OrderItem[];
  userId: string;
  manualDiscountId: string | null;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // The percentage (e.g., 10 for 10%) or the fixed amount.
  isActive: boolean;
  productIds?: string[]; // List of product IDs. If empty/undefined, it applies to the whole order.
}

export interface Sale {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: Date;
  paymentMethod: 'cash' | 'card' | 'mpesa';
  servedById: string;
  servedBy: string;
  customerType: string;
  discountApplied?: {
    name: string;
    amount: number;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  mpesaPaybill?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  items: { productId: string; name: string; quantityOrdered: number; quantityReceived: number; cost: number }[];
  totalCost: number;
  status: 'Pending' | 'Partially Received' | 'Received' | 'Cancelled';
  orderDate: Date;
  receivedDate?: Date;
  receivedBy?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
  showOnReceipt: boolean;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  receiptHeader: string;
  receiptFooter: string;
  showLogoOnReceipt: boolean;
  pdfFooterText: string;
  pdfFooterLogoUrl: string;
  showPdfFooter: boolean;
  paymentMethods: PaymentMethod[];
  systemLockPin: string;
  autoLockOnPrint: boolean;
}

export interface Printer {
  id: string;
  name: string;
  type: 'IP' | 'USB' | 'Bluetooth';
  address?: string; // For IP printers
}

export interface PrinterSettings {
  printers: Printer[];
  selectedPrinterId: string | null;
}

export interface ScheduledShift {
  id:string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface TimeLog {
  id: string;
  userId: string;
  userName?: string;
  clockInTime: Date;
  clockOutTime?: Date;
  durationHours?: number;
  status: 'Ongoing' | 'Completed' | 'Pending Approval' | 'Rejected';
  declaredAmount?: number; // Cashier's declaration
  countedAmount?: number; // Manager's final count
  expectedSales?: {
    cash: number;
    card: number;
    mpesa: number;
  };
  difference?: number;
  rejectionReason?: string;
  approvedBy?: string;
}

export interface KegSale {
  userId: string;
  userName: string;
  volumeSold: number; // in ml/g (normalized)
  revenue: number;
  saleDate: string;
}

export interface KegInstance {
  id: string;
  productId: string;
  productName: string;
  capacity: number; // in ml/g (normalized)
  currentVolume: number; // in ml/g (normalized)
  status: 'Full' | 'Tapped' | 'Empty';
  tappedDate?: Date;
  tappedBy?: string; // userName
  closedDate?: Date;
  closedBy?: string; // userName
  sales: KegSale[];
}

export type ActivityType = 'Sale' | 'Inventory' | 'User' | 'System' | 'PO' | 'Shift' | 'Keg' | 'Login';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string; // Name of user who performed the action
  userId: string | null;
  type: ActivityType;
  description: string;
  details?: string;
}


export interface DataContext {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  // State
  isStoreSettingsLoading: boolean;
  isLoading: {
    suppliers: boolean;
    purchaseOrders: boolean;
    scheduledShifts: boolean;
    discounts: boolean;
    activityLogs: boolean;
  };
  // Auth & User
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  addUser: (user: Omit<User, 'id' | 'timeClockStatus' | 'clockInTime' | 'deductions'> & { password?: string }) => Promise<void>;
  updateUser: (user: Partial<User> & { id: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addUserDeduction: (userId: string, deductionData: { reason: string, amount: number }) => Promise<void>;
  removeUserDeduction: (userId: string, deductionId: string) => Promise<void>;
  
  // Time Clock & Shifts
  dayStarted: boolean;
  setDayStarted: (started: boolean) => void;
  clockIn: (userId: string) => Promise<void>;
  requestShiftClearance: (userId: string, cashUpDetails: { declaredAmount: number; expectedSales: { cash: number, card: number, mpesa: number } }) => Promise<void>;
  adminClockOut: (userId: string) => Promise<TimeLog | null>;
  approveShift: (timeLogId: string, approverName: string, countedAmount: number) => Promise<void>;
  rejectShift: (timeLogId: string, reason: string) => Promise<void>;
  scheduledShifts: ScheduledShift[];
  timeLogs: TimeLog[];
  addScheduledShift: (shiftData: Omit<ScheduledShift, 'id' | 'userName'>) => Promise<void>;
  updateScheduledShift: (shift: ScheduledShift) => Promise<void>;
  deleteScheduledShift: (shiftId: string) => Promise<void>;

  // Printer Settings
  printerSettings: PrinterSettings;
  updatePrinterSettings: (settings: PrinterSettings) => void;

  // Store Settings
  storeSettings: StoreSettings;
  updateStoreSettings: (settings: StoreSettings) => Promise<void>;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  
  // Categories
  categories: Category[];
  addCategory: (categoryName: string) => Promise<void>;
  updateCategory: (categoryId: string, newName: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  // Sales
  sales: Sale[];
  processSale: (
    order: OrderItem[],
    paymentMethod: Sale['paymentMethod'],
    servedBy: string,
    customerType: string,
    discount?: { name: string; amount: number; }
  ) => Promise<Sale | null>;

  // Open Orders State
  openOrders: OrderTab[];
  setOpenOrders: React.Dispatch<React.SetStateAction<OrderTab[]>>;
  
  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'supplierName' | 'totalCost'>) => Promise<void>;
  updatePurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  receivePurchaseOrderItems: (poId: string, receivedItems: { productId: string; quantityReceived: number }[], receiverName: string) => Promise<void>;

  // Kegs
  kegInstances: KegInstance[];
  addKegInstances: (productId: string, count: number) => Promise<void>;
  tapKeg: (kegInstanceId: string, userName: string) => Promise<void>;
  closeKeg: (kegInstanceId: string, userName: string) => Promise<void>;

  // Discounts
  discounts: Discount[];
  addDiscount: (discountData: Omit<Discount, 'id' | 'isActive'>) => Promise<void>;
  updateDiscount: (discount: Discount) => Promise<void>;
  deleteDiscount: (discountId: string) => Promise<void>;

  // System Security
  isSystemLocked: boolean;
  setSystemLocked: (locked: boolean) => void;
  verifyUnlockPin: (pin: string) => boolean;
  verifyUserPin: (userId: string, pin: string) => boolean;
  verifyOverridePin: (pin: string) => User | null;
  resetSystemData: () => Promise<void>;
  healStuckUser: (userId: string) => Promise<boolean>;
  
  // Activity Log
  activityLogs: ActivityLog[];

  // On-demand Fetching
  fetchSuppliers: () => Promise<void>;
  fetchPurchaseOrders: () => Promise<void>;
  fetchScheduledShifts: () => Promise<void>;
  fetchDiscounts: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
}
