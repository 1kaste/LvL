import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { DataContext as IDataContext, User, Product, Category, Sale, OrderItem, Supplier, PurchaseOrder, StoreSettings, PrinterSettings, ScheduledShift, TimeLog, KegInstance, Theme, PaymentMethod, Discount, OrderTab, ActivityLog, ActivityType, MeasureUnit, Deduction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Database, Json } from '../database.types';

const DataContext = createContext<IDataContext | null>(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

const normalizeUnit = (value: number, unit: MeasureUnit): number => {
    if (unit === 'L' || unit === 'kg') return value * 1000;
    return value; // ml or g
};

export const DataProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    // Type Aliases for Supabase Payloads
    type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
    type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
    type DeductionInsert = Database['public']['Tables']['deductions']['Insert'];
    type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert'];
    type TimeLogUpdate = Database['public']['Tables']['time_logs']['Update'];
    type SaleInsert = Database['public']['Tables']['sales']['Insert'];
    type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];
    type ProductUpdate = Database['public']['Tables']['products']['Update'];
    type KegInstanceInsert = Database['public']['Tables']['keg_instances']['Insert'];
    type KegInstanceUpdate = Database['public']['Tables']['keg_instances']['Update'];
    type ScheduledShiftInsert = Database['public']['Tables']['scheduled_shifts']['Insert'];
    type ScheduledShiftUpdate = Database['public']['Tables']['scheduled_shifts']['Update'];
    type ProductInsert = Database['public']['Tables']['products']['Insert'];
    type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
    type CategoryUpdate = Database['public']['Tables']['categories']['Update'];
    type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
    type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];
    type DiscountInsert = Database['public']['Tables']['discounts']['Insert'];
    type DiscountUpdate = Database['public']['Tables']['discounts']['Update'];
    type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
    type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];
    type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];


    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    const [dayStarted, setDayStarted] = useState(false);
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({ printers: [], selectedPrinterId: null });
    const [openOrders, setOpenOrders] = useState<OrderTab[]>([]);
    const [isSystemLocked, setSystemLocked] = useState<boolean>(false);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [kegInstances, setKegInstances] = useState<KegInstance[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [storeSettings, setStoreSettings] = useState<StoreSettings>({} as StoreSettings);
    const [isStoreSettingsLoading, setIsStoreSettingsLoading] = useState(true);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const fetchPublicData = useCallback(async () => {
        setIsStoreSettingsLoading(true);
        try {
            // Fetch only critical data that is required for the login screen to render.
            // These tables have permissive RLS policies and should not hang.
            const { data: settingsData, error: settingsError } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (settingsError) throw settingsError;

            const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, name, email, role, pin');
            if (usersError) throw usersError;
    
            // Set state with critical data immediately.
            if (settingsData) {
                const mappedSettings: StoreSettings = {
                    storeName: settingsData.store_name,
                    address: settingsData.address,
                    phone: settingsData.phone,
                    email: settingsData.email,
                    logoUrl: settingsData.logo_url,
                    receiptHeader: settingsData.receipt_header,
                    receiptFooter: settingsData.receipt_footer,
                    showLogoOnReceipt: settingsData.show_logo_on_receipt,
                    pdfFooterText: settingsData.pdf_footer_text,
                    pdfFooterLogoUrl: settingsData.pdf_footer_logo_url,
                    showPdfFooter: settingsData.show_pdf_footer,
                    systemLockPin: settingsData.system_lock_pin,
                    autoLockOnPrint: settingsData.auto_lock_on_print,
                    paymentMethods: [], // Not needed for login screen
                };
                setStoreSettings(mappedSettings);
            }
    
            const fetchedUsers: User[] = (usersData || []).map((u) => ({
                id: u.id, name: u.name, email: u.email!, role: u.role, pin: u.pin ?? undefined,
                timeClockStatus: 'Clocked Out', deductions: [],
            }));
            setUsers(fetchedUsers);
    
        } catch (error) {
            console.error("Error fetching critical public data:", error);
            // Set default settings to prevent the app from crashing if the fetch fails.
            setStoreSettings({ storeName: 'Jobiflow', email: '', phone: '', address: '', logoUrl: '', receiptHeader: '', receiptFooter: '', showLogoOnReceipt: false, pdfFooterText: '', pdfFooterLogoUrl: '', showPdfFooter: false, systemLockPin: '0000', autoLockOnPrint: false, paymentMethods: [] });
        } finally {
            // This is crucial: ensure the loading state is always turned off.
            setIsStoreSettingsLoading(false);
        }
    }, []);

    const addActivityLog = async (type: ActivityType, description: string, details?: string, userForLog?: User | null) => {
        const logUser = userForLog || currentUser;
        if (!logUser) {
            console.warn("Attempted to log activity without a user context.");
            return;
        }
        const logData: ActivityLogInsert = { type, description, details: details || undefined, user_id: logUser.id, user_name: logUser.name };
        const { data: newLog, error } = await supabase.from('activity_logs').insert([logData]).select().single();
        if (error) {
            console.error("Error logging activity:", error);
        } else if (newLog) {
            setActivityLogs(prev => [{
                id: newLog.id,
                timestamp: new Date(newLog.timestamp),
                user: newLog.user_name,
                userId: newLog.user_id,
                type: newLog.type as ActivityType,
                description: newLog.description,
                details: newLog.details ?? undefined
            }, ...prev].slice(0, 200));
        }
    };
    
    const fetchData = useCallback(async () => {
        setIsStoreSettingsLoading(true);
        try {
            const usersRes = await supabase.from('profiles').select('*');
            if(usersRes.error) throw usersRes.error;
            const deductionsRes = await supabase.from('deductions').select('*');
            if(deductionsRes.error) throw deductionsRes.error;
            const productsRes = await supabase.from('products').select('*');
            if(productsRes.error) throw productsRes.error;
            const categoriesRes = await supabase.from('categories').select('*');
            if(categoriesRes.error) throw categoriesRes.error;
            const salesRes = await supabase.from('sales').select('*, sale_items(*)');
            if(salesRes.error) throw salesRes.error;
            const suppliersRes = await supabase.from('suppliers').select('*');
            if(suppliersRes.error) throw suppliersRes.error;
            const poRes = await supabase.from('purchase_orders').select('*, purchase_order_items(*)');
            if(poRes.error) throw poRes.error;
            const shiftsRes = await supabase.from('scheduled_shifts').select('*');
            if(shiftsRes.error) throw shiftsRes.error;
            const logsRes = await supabase.from('time_logs').select('*');
            if(logsRes.error) throw logsRes.error;
            const kegsRes = await supabase.from('keg_instances').select('*, tapped_by_user:profiles!keg_instances_tapped_by_id_fkey(name), closed_by_user:profiles!keg_instances_closed_by_id_fkey(name)');
            if(kegsRes.error) throw kegsRes.error;
            const discountsRes = await supabase.from('discounts').select('*').order('name');
            if(discountsRes.error) throw discountsRes.error;
            const activityRes = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(200);
            if(activityRes.error) throw activityRes.error;
            const settingsRes = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if(settingsRes.error) throw settingsRes.error;
            const paymentMethodsRes = await supabase.from('payment_methods').select('*');
            if(paymentMethodsRes.error) throw paymentMethodsRes.error;

            const fetchedDeductions: Deduction[] = (deductionsRes.data || []).map((d) => ({ 
                id: d.id, 
                userId: d.user_id,
                reason: d.reason,
                amount: d.amount,
                date: new Date(d.date) 
            }));
            const deductionsByUserId = new Map<string, Deduction[]>();
            for (const deduction of fetchedDeductions) {
                if (!deductionsByUserId.has(deduction.userId)) {
                    deductionsByUserId.set(deduction.userId, []);
                }
                deductionsByUserId.get(deduction.userId)!.push(deduction);
            }

            const fetchedUsers: User[] = (usersRes.data || []).map((u) => ({
                id: u.id, name: u.name, email: u.email!, role: u.role, pin: u.pin ?? undefined, overridePin: u.override_pin ?? undefined, salaryAmount: u.salary_amount ?? undefined,
                deductions: deductionsByUserId.get(u.id) || [],
                timeClockStatus: u.time_clock_status, clockInTime: u.clock_in_time ? new Date(u.clock_in_time) : undefined,
            }));
            setUsers(fetchedUsers);
            
            const nameMap = new Map<string, string>();
            (usersRes.data || []).forEach((u) => nameMap.set(u.id, u.name));
            (salesRes.data || []).forEach((s) => { if (s.served_by_id && !nameMap.has(s.served_by_id)) nameMap.set(s.served_by_id, s.served_by_name); });
            (activityRes.data || []).forEach((l) => { if (l.user_id && !nameMap.has(l.user_id)) nameMap.set(l.user_id, l.user_name); });


            const fetchedCategories: Category[] = (categoriesRes.data || []) as unknown as Category[];
            setCategories(fetchedCategories);
            const categoryMap = new Map(fetchedCategories.map(c => [c.id, c.name]));
            
            const fetchedProducts: Product[] = (productsRes.data || []).map((p) => ({
                id: p.id,
                name: p.name,
                category: categoryMap.get(p.category_id!) || 'Uncategorized',
                price: p.price,
                productType: p.product_type,
                stock: p.stock,
                lowStockThreshold: p.low_stock_threshold,
                kegCapacity: p.keg_capacity ?? undefined,
                kegCapacityUnit: p.keg_capacity_unit as MeasureUnit,
                linkedKegProductId: p.linked_keg_product_id ?? undefined,
                servingSize: p.serving_size ?? undefined,
                servingSizeUnit: p.serving_size_unit as MeasureUnit,
            }));
            setProducts(fetchedProducts);
            const productMap = new Map(fetchedProducts.map(p => [p.id, p]));
            
            const fetchedSuppliers: Supplier[] = (suppliersRes.data || []).map(s => ({...s, id: s.id!, contactPerson: s.contact_person, bankAccountNumber: s.bank_account_number ?? undefined, bankBranch: s.bank_branch ?? undefined, bankName: s.bank_name ?? undefined, paymentTerms: s.payment_terms ?? undefined, mpesaPaybill: s.mpesa_paybill ?? undefined, notes: s.notes ?? undefined}));
            setSuppliers(fetchedSuppliers);
            const supplierMap = new Map(fetchedSuppliers.map(s => [s.id, s.name]));

            setDiscounts((discountsRes.data || []).map((d) => ({id: d.id, name: d.name, type: d.type, value: d.value, isActive: d.is_active, productIds: d.product_ids || [] })));
            setActivityLogs((activityRes.data || []).map((l): ActivityLog => ({
                id: l.id,
                timestamp: new Date(l.timestamp),
                user: l.user_name,
                userId: l.user_id,
                type: l.type as ActivityType,
                description: l.description,
                details: l.details ?? undefined,
            })));
            
            if (settingsRes.data) {
                const settingsData = settingsRes.data;
                const paymentMethodsData = paymentMethodsRes.data || [];
                setStoreSettings({
                    storeName: settingsData.store_name,
                    address: settingsData.address,
                    phone: settingsData.phone,
                    email: settingsData.email,
                    logoUrl: settingsData.logo_url,
                    receiptHeader: settingsData.receipt_header,
                    receiptFooter: settingsData.receipt_footer,
                    showLogoOnReceipt: settingsData.show_logo_on_receipt,
                    pdfFooterText: settingsData.pdf_footer_text,
                    pdfFooterLogoUrl: settingsData.pdf_footer_logo_url,
                    showPdfFooter: settingsData.show_pdf_footer,
                    systemLockPin: settingsData.system_lock_pin,
                    autoLockOnPrint: settingsData.auto_lock_on_print,
                    paymentMethods: (paymentMethodsData).map((p) => ({id: p.id, name: p.name, details: p.details, showOnReceipt: p.show_on_receipt})),
                });
            }

            setSales((salesRes.data || []).map((s) => ({
                id: s.id, date: new Date(s.date), servedBy: s.served_by_name, servedById: s.served_by_id, paymentMethod: s.payment_method,
                customerType: s.customer_type, total: s.total, subtotal: s.subtotal, tax: s.tax,
                items: (s.sale_items as any[] || []).map((si) => ({ ...productMap.get(si.product_id)!, price: si.price_at_sale, name: si.product_name, quantity: si.quantity })),
                discountApplied: s.discount_name ? { name: s.discount_name, amount: s.discount_amount! } : undefined
            } as Sale)));
            
            setPurchaseOrders((poRes.data || []).map((po) => ({
                id: po.id, supplierId: po.supplier_id, orderDate: new Date(po.order_date), receivedDate: po.received_date ? new Date(po.received_date) : undefined,
                supplierName: supplierMap.get(po.supplier_id) || 'N/A', invoiceNo: po.invoice_no!, totalCost: po.total_cost, status: po.status,
                items: (po.purchase_order_items as any[] || []).map((poi) => ({productId: poi.product_id, name: productMap.get(poi.product_id)?.name || 'N/A', quantityOrdered: poi.quantity_ordered, quantityReceived: poi.quantity_received, cost: poi.cost})),
                receivedBy: nameMap.get(po.received_by_id!)
            } as PurchaseOrder)));

            setScheduledShifts((shiftsRes.data || []).map((s) => ({id: s.id, userId: s.user_id, date: s.date, userName: nameMap.get(s.user_id) || 'Unknown User', startTime: s.start_time, endTime: s.end_time})));
            
            const mappedTimeLogs: TimeLog[] = (logsRes.data || []).map((l) => ({
                id: l.id, 
                userName: nameMap.get(l.user_id) || 'Unknown User',
                userId: l.user_id,
                clockInTime: new Date(l.clock_in_time), 
                clockOutTime: l.clock_out_time ? new Date(l.clock_out_time) : undefined,
                approvedBy: nameMap.get(l.approved_by_id!), 
                durationHours: l.duration_hours ?? undefined, 
                declaredAmount: l.declared_amount ?? undefined, 
                countedAmount: l.counted_amount ?? undefined,
                expectedSales: l.expected_sales as any, 
                rejectionReason: l.rejection_reason ?? undefined,
                difference: l.difference ?? undefined,
                status: l.status,
            }));
            setTimeLogs(mappedTimeLogs);

            const hasOngoingShifts = mappedTimeLogs.some(log => log.status === 'Ongoing');
            setDayStarted(hasOngoingShifts);

            setKegInstances((kegsRes.data || []).map((k): KegInstance => ({
                id: k.id,
                productId: k.product_id,
                productName: productMap.get(k.product_id)?.name || 'N/A',
                capacity: k.capacity,
                currentVolume: k.current_volume,
                status: k.status,
                tappedDate: k.tapped_date ? new Date(k.tapped_date) : undefined,
                tappedBy: (k.tapped_by_user as any)?.name ?? nameMap.get(k.tapped_by_id!),
                closedDate: k.closed_date ? new Date(k.closed_date) : undefined,
                closedBy: (k.closed_by_user as any)?.name ?? nameMap.get(k.closed_by_id!),
                sales: (k.sales as any[]) || []
            })));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsStoreSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        const clearSessionData = () => {
            setProducts([]); setCategories([]); setSales([]); setSuppliers([]);
            setPurchaseOrders([]); setScheduledShifts([]); setTimeLogs([]);
            setKegInstances([]); setDiscounts([]); setActivityLogs([]); setOpenOrders([]);
        };
        
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!session?.user) {
                // On logout, clear session data, set user to null, and fetch public data.
                // The data fetch is NOT awaited to prevent blocking the UI transition.
                // The loading state inside fetchPublicData will handle the spinner.
                clearSessionData();
                setCurrentUser(null);
                fetchPublicData();
                return;
            }
    
            let { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profileError) {
                console.error("Error fetching user profile:", profileError);
                setCurrentUser(null);
                await supabase.auth.signOut();
                clearSessionData();
                return;
            }
            
            if (profileData && profileData.role === 'Admin' && profileData.time_clock_status === 'Awaiting Clearance') {
                console.log("Admin user is stuck in 'Awaiting Clearance'. Attempting to auto-resolve.");
                
                const { data: pendingLogData, error: pendingLogError } = await supabase
                    .from('time_logs')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('status', 'Pending Approval')
                    .limit(1)
                    .single();

                if (pendingLogData) {
                    const countedAmount = pendingLogData.declared_amount ?? (pendingLogData.expected_sales as any)?.cash ?? 0;
                    const finalDifference = countedAmount - ((pendingLogData.expected_sales as any)?.cash ?? 0);

                    const { error: logUpdateError } = await supabase.from('time_logs').update({
                        status: 'Completed',
                        counted_amount: countedAmount,
                        difference: finalDifference,
                        approved_by_id: session.user.id
                    }).eq('id', pendingLogData.id);

                    if (!logUpdateError) {
                        const { error: profileUpdateError } = await supabase.from('profiles').update({ 
                            time_clock_status: 'Clocked Out' 
                        }).eq('id', pendingLogData.user_id);

                        if (!profileUpdateError) {
                            console.log("Admin state successfully auto-resolved.");
                            const { data: finalProfileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                            if(finalProfileData) profileData = finalProfileData;
                        } else {
                            console.error("Auto-resolve failed to update profile:", profileUpdateError);
                        }
                    } else {
                         console.error("Auto-resolve failed to update time log:", logUpdateError);
                    }
                }
            }
            
            if (profileData) {
                const { data: deductions, error: deductionsError } = await supabase.from('deductions').select('*').eq('user_id', session.user.id);

                const userProfile: User = {
                    id: profileData.id, name: profileData.name, email: profileData.email!, role: profileData.role,
                    pin: profileData.pin ?? undefined, overridePin: profileData.override_pin ?? undefined,
                    salaryAmount: profileData.salary_amount ?? undefined,
                    deductions: (deductions || []).map(d => ({...d, userId: d.user_id, date: new Date(d.date)})),
                    timeClockStatus: profileData.time_clock_status,
                    clockInTime: profileData.clock_in_time ? new Date(profileData.clock_in_time) : undefined
                };
                setCurrentUser(userProfile);

                if (!(profileData.role === 'Admin' && profileData.time_clock_status === 'Awaiting Clearance')) {
                    await fetchData();
                }

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    const description = event === 'SIGNED_IN' ? 'User logged in.' : 'User session restored.';
                    await addActivityLog('Login', description, `Role: ${userProfile.role}`, userProfile);
                }
            } else {
                setCurrentUser(null);
                await supabase.auth.signOut();
                clearSessionData();
            }
        });
    
        return () => { authListener.subscription.unsubscribe(); };
    }, [fetchData, fetchPublicData]);   

    const login = async (email: string, password?: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
        return !error;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error logging out:", error);
        }
    };
    
    // --- USER MANAGEMENT ---
    const addUser = async (userData: Omit<User, 'id' | 'timeClockStatus' | 'clockInTime' | 'deductions'> & { password?: string }) => {
        if (!currentUser || currentUser.role !== 'Admin') {
            throw new Error("Only Admins can add new users.");
        }

        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession) {
            throw new Error("Admin session not found. Please log in again.");
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password || 'password123',
        });

        const restoreSession = async () => {
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        };

        if (signUpError) {
            await restoreSession();
            throw signUpError;
        }

        if (!signUpData.user) {
            await restoreSession();
            throw new Error("User creation failed, but no error was reported.");
        }

        const updatePayload: ProfileUpdate = {
            name: userData.name,
            role: userData.role,
            salary_amount: userData.salaryAmount,
            pin: userData.pin,
            override_pin: userData.overridePin,
        };

        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', signUpData.user.id)
            .select('*')
            .single();
        
        await restoreSession();

        if (profileError || !updatedProfile) {
            console.error("Failed to update profile for new user:", profileError);
            throw profileError || new Error("Failed to update the new user's profile. The user was created but needs to be configured manually.");
        }

        const newUserForState: User = {
            id: updatedProfile.id,
            name: updatedProfile.name,
            email: updatedProfile.email!,
            role: updatedProfile.role,
            pin: updatedProfile.pin ?? undefined,
            overridePin: updatedProfile.override_pin ?? undefined,
            salaryAmount: updatedProfile.salary_amount ?? undefined,
            deductions: [],
            timeClockStatus: updatedProfile.time_clock_status,
            clockInTime: undefined,
        };
        setUsers(prev => [...prev, newUserForState]);
        await addActivityLog('User', `Created new user: ${userData.name}`);
    };

    const updateUser = async (userUpdate: Partial<User> & { id: string }) => {
        const updatePayload: ProfileUpdate = {
            name: userUpdate.name, 
            email: userUpdate.email, 
            role: userUpdate.role,
            salary_amount: userUpdate.salaryAmount, 
            pin: userUpdate.pin, 
            override_pin: userUpdate.overridePin
        };
        Object.keys(updatePayload).forEach(key => (updatePayload as any)[key] === undefined && delete (updatePayload as any)[key]);
        const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userUpdate.id);
        if (error) throw error;

        setUsers(prev => prev.map(u => u.id === userUpdate.id ? { ...u, ...userUpdate } : u));
        await addActivityLog('User', `Updated profile for ${userUpdate.name || 'user'}`);
    };

    const deleteUser = async (userId: string) => {
        if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
            throw new Error("Unauthorized: Only Admins or Managers can delete users.");
        }
    
        if (currentUser.id === userId) {
            throw new Error("Action not allowed: Users cannot delete their own account.");
        }
    
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) {
            throw new Error("User to be deleted not found.");
        }
    
        if (currentUser.role === 'Manager' && userToDelete.role === 'Admin') {
            throw new Error("Unauthorized: Managers cannot delete Admin accounts.");
        }
        
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
    
        if (error) {
            if (error.message.includes('permission denied')) {
                throw new Error("Database permission denied. You may not have the rights to delete this user.");
            }
            throw error;
        }
        
        setUsers(prev => prev.filter(u => u.id !== userId));
        await addActivityLog('User', `Deleted user: ${userToDelete.name}`);
    };

    const addUserDeduction = async (userId: string, deductionData: { reason: string, amount: number }) => {
        const insertPayload: DeductionInsert = { user_id: userId, reason: deductionData.reason, amount: deductionData.amount };
        const { data, error } = await supabase.from('deductions').insert([insertPayload]).select().single();
        if (error) throw error;
        if (!data) throw new Error("Failed to add deduction");
        const newDeduction: Deduction = { id: data.id, userId: data.user_id, reason: data.reason, amount: data.amount, date: new Date(data.date) };
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, deductions: [...(u.deductions || []), newDeduction] } : u));
    };

    const removeUserDeduction = async (userId: string, deductionId: string) => {
        const { error } = await supabase.from('deductions').delete().eq('id', deductionId);
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, deductions: u.deductions?.filter(d => d.id !== deductionId) } : u));
    };

    const clockIn = async (userId: string) => {
        // Force a check against the database to prevent race conditions
        const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('time_clock_status, name')
            .eq('id', userId)
            .single();
    
        if (userProfileError || !userProfile) {
            console.error("User not found for clock-in", userProfileError);
            alert("Could not verify user status. Please try again.");
            return;
        }
    
        if (userProfile.time_clock_status !== 'Clocked Out') {
            console.warn(`User ${userProfile.name} is not clocked out. Current status: ${userProfile.time_clock_status}`);
            alert(`Cannot clock in. ${userProfile.name} is currently ${userProfile.time_clock_status}. Please ensure any pending shifts are cleared.`);
            // Refresh local state to match DB, which might solve other UI inconsistencies
            await fetchData();
            return;
        }

        const now = new Date();
        const timeLogId = uuidv4();

        const insertPayload: TimeLogInsert = {
            id: timeLogId,
            user_id: userId,
            clock_in_time: now.toISOString(),
            status: 'Ongoing'
        };
        const { data: newTimeLog, error: newTimeLogError } = await supabase
            .from('time_logs')
            .insert([insertPayload])
            .select()
            .single();

        if (newTimeLogError || !newTimeLog) {
            console.error("Error creating time log:", newTimeLogError);
            throw newTimeLogError || new Error("Failed to create time log entry.");
        }

        const updatePayload: ProfileUpdate = {
            time_clock_status: 'Clocked In',
            clock_in_time: now.toISOString()
        };
        const { error: profileError } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);
        
        if (profileError) {
            console.error("Error updating user profile for clock-in:", profileError);
            await supabase.from('time_logs').delete().eq('id', timeLogId); // Rollback
            throw profileError;
        }
        
        const newTimeLogForState: TimeLog = {
            id: newTimeLog.id,
            userId: newTimeLog.user_id,
            userName: userProfile.name,
            clockInTime: new Date(newTimeLog.clock_in_time),
            status: 'Ongoing',
        };
        setTimeLogs(prev => [newTimeLogForState, ...prev]);

        const updatedUsers = users.map(u => 
            u.id === userId ? { ...u, timeClockStatus: 'Clocked In' as const, clockInTime: now } : u
        );
        setUsers(updatedUsers);
        
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, timeClockStatus: 'Clocked In' as const, clockInTime: now } : null);
        }
        
        await addActivityLog('Shift', `User ${userProfile.name} clocked in.`);
    };

    const requestShiftClearance = async (userId: string, cashUpDetails: { declaredAmount: number; expectedSales: { cash: number, card: number, mpesa: number } }) => {
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");
    
        const ongoingLog = timeLogs.find(l => l.userId === userId && l.status === 'Ongoing');
        if (!ongoingLog) throw new Error("Could not find ongoing time log to request clearance.");
    
        const clockOutTime = new Date();
        const clockInTime = new Date(ongoingLog.clockInTime);
        const durationMs = clockOutTime.getTime() - clockInTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const difference = cashUpDetails.declaredAmount - cashUpDetails.expectedSales.cash;
    
        const updatePayload: TimeLogUpdate = {
            clock_out_time: clockOutTime.toISOString(),
            status: 'Pending Approval',
            declared_amount: cashUpDetails.declaredAmount,
            expected_sales: cashUpDetails.expectedSales as Json,
            difference: difference,
            duration_hours: durationHours
        };
        const { error: logError } = await supabase
            .from('time_logs')
            .update(updatePayload)
            .eq('id', ongoingLog.id);
    
        if (logError) throw logError;
    
        const profileUpdatePayload: ProfileUpdate = {
            time_clock_status: 'Awaiting Clearance',
            clock_in_time: null
        };
        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdatePayload)
            .eq('id', userId);
            
        if (profileError) throw profileError;
    
        setTimeLogs(prev => prev.map(l => l.id === ongoingLog.id ? {
            ...l,
            clockOutTime,
            status: 'Pending Approval',
            declaredAmount: cashUpDetails.declaredAmount,
            expectedSales: cashUpDetails.expectedSales,
            difference,
            durationHours
        } : l));
    
        const updatedUsers = users.map(u => 
            u.id === userId ? { ...u, timeClockStatus: 'Awaiting Clearance' as const, clockInTime: undefined } : u
        );
        setUsers(updatedUsers);
    
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, timeClockStatus: 'Awaiting Clearance' as const, clockInTime: undefined } : null);
        }
        
        await addActivityLog('Shift', `User ${user.name} clocked out and requested shift clearance.`);
    };
    
    const approveShift = async (timeLogId: string, approverName: string, countedAmount: number) => {
        const logToApprove = timeLogs.find(l => l.id === timeLogId);
        if (!logToApprove) {
            console.error("Time log not found for approval:", timeLogId);
            alert("Error: The selected time log could not be found.");
            return;
        }
    
        const user = users.find(u => u.id === logToApprove.userId);
        const userNameForLog = user?.name || logToApprove.userName || 'Deleted User';
        
        const approver = users.find(u => u.name === approverName);
        if (!approver) {
            console.error("Approver user not found:", approverName);
            alert("Error: The approving manager's profile could not be found. Please log in again.");
            return;
        }
        
        const finalDifference = countedAmount - (logToApprove.expectedSales?.cash ?? 0);
    
        const logUpdatePayload: TimeLogUpdate = {
            status: 'Completed',
            counted_amount: countedAmount,
            difference: finalDifference,
            approved_by_id: approver.id
        };
        const { error: logError } = await supabase.from('time_logs').update(logUpdatePayload).eq('id', timeLogId);
        if (logError) throw logError;
        
        if (user) {
            const profileUpdatePayload: ProfileUpdate = { time_clock_status: 'Clocked Out' };
            const { error: profileError } = await supabase.from('profiles').update(profileUpdatePayload).eq('id', logToApprove.userId);
            if (profileError) {
                console.error(`Shift approved, but failed to update profile for ${user.name}:`, profileError);
                alert(`Warning: Shift approved for ${user.name}, but their status could not be updated.`);
            }
        } else {
            console.log(`Shift approved for a deleted user (ID: ${logToApprove.userId}). Skipping profile update.`);
        }
    
        setTimeLogs(prev => prev.map(l => l.id === timeLogId ? { 
            ...l, 
            status: 'Completed', 
            countedAmount: countedAmount, 
            difference: finalDifference, 
            approvedBy: approverName 
        } : l));
        
        if (user) {
            const updatedUsers = users.map(u => 
                u.id === logToApprove.userId ? { ...u, timeClockStatus: 'Clocked Out' as const } : u
            );
            setUsers(updatedUsers);
        
            if (currentUser?.id === logToApprove.userId) {
                setCurrentUser(prev => prev ? { ...prev, timeClockStatus: 'Clocked Out' as const } : null);
            }
        }
        
        await addActivityLog('Shift', `Approved shift for ${userNameForLog}.`, `Final difference: Ksh ${finalDifference.toFixed(2)}`);
    };
    
    const rejectShift = async (timeLogId: string, reason: string) => {
        const logToReject = timeLogs.find(l => l.id === timeLogId);
        if (!logToReject) {
            console.error("Time log not found for rejection:", timeLogId);
            return;
        }
        
        const user = users.find(u => u.id === logToReject.userId);
        const userNameForLog = user?.name || logToReject.userName || 'Deleted User';
    
        const logUpdatePayload: TimeLogUpdate = { status: 'Rejected', rejection_reason: reason };
        const { error: logError } = await supabase.from('time_logs').update(logUpdatePayload).eq('id', timeLogId);
        if (logError) throw logError;
    
        if (user) {
            const profileUpdatePayload: ProfileUpdate = { time_clock_status: 'Awaiting Clearance' };
            const { error: profileError } = await supabase.from('profiles').update(profileUpdatePayload).eq('id', logToReject.userId);
            if (profileError) {
                console.error(`Shift rejected, but failed to update profile for ${user.name}:`, profileError);
            }
        } else {
            console.log(`Shift rejected for a deleted user (ID: ${logToReject.userId}). Skipping profile update.`);
        }
    
        setTimeLogs(prev => prev.map(l => l.id === timeLogId ? { ...l, status: 'Rejected', rejectionReason: reason } : l));
        
        await addActivityLog('Shift', `Rejected shift for ${userNameForLog}.`, `Reason: ${reason}`);
    };

    const adminClockOut = async (userId: string): Promise<TimeLog | null> => {
        const user = users.find(u => u.id === userId);
        if (!user || user.role !== 'Admin') {
            console.error("Attempted to run admin clock out for non-admin or non-existent user.");
            return null;
        }
    
        const { data: ongoingLogData, error: ongoingLogError } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'Ongoing')
            .single();
    
        if (ongoingLogError || !ongoingLogData) {
            if (ongoingLogError && ongoingLogError.code !== 'PGRST116') { // PGRST116 means "No rows found"
                console.error("Error finding ongoing time log for admin:", ongoingLogError);
            } else {
                console.error("Could not find ongoing time log for admin to clock out.");
            }
            
            const { data: profileData, error: profileError } = await supabase.from('profiles').select('time_clock_status, name').eq('id', userId).single();
    
            if (profileData && profileData.time_clock_status === 'Clocked In') {
                console.warn(`Admin ${profileData.name} has status 'Clocked In' but no 'Ongoing' log in DB. Forcing clock out to fix state.`);
                const { error: profileUpdateError } = await supabase.from('profiles').update({ time_clock_status: 'Clocked Out', clock_in_time: null }).eq('id', userId);
                
                if (!profileUpdateError) {
                    const updatedUsers = users.map(u => u.id === userId ? { ...u, timeClockStatus: 'Clocked Out' as const, clockInTime: undefined } : u);
                    setUsers(updatedUsers);
                    if (currentUser?.id === userId) {
                        setCurrentUser(prev => prev ? { ...prev, timeClockStatus: 'Clocked Out' as const, clockInTime: undefined } : null);
                    }
                } else {
                     console.error("Failed to heal stuck admin state:", profileUpdateError);
                }
            }
            return null;
        }
    
        const ongoingLog: TimeLog = {
            ...ongoingLogData,
            userId: ongoingLogData.user_id,
            userName: user.name,
            clockInTime: new Date(ongoingLogData.clock_in_time),
        };
    
        const clockOutTime = new Date();
        const clockInTime = new Date(ongoingLog.clockInTime);
        const durationMs = clockOutTime.getTime() - clockInTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
    
        const shiftSales = sales.filter(s => s.servedById === user.id && new Date(s.date) >= clockInTime);
        const expectedSales = shiftSales.reduce((acc, sale) => {
            acc[sale.paymentMethod as 'cash' | 'card' | 'mpesa'] += sale.total;
            return acc;
        }, { cash: 0, card: 0, mpesa: 0 });
        
        const declaredAmount = expectedSales.cash;
        const difference = 0;
    
        const updatePayload: TimeLogUpdate = {
            clock_out_time: clockOutTime.toISOString(),
            status: 'Completed',
            declared_amount: declaredAmount,
            counted_amount: declaredAmount,
            expected_sales: expectedSales as Json,
            difference: difference,
            duration_hours: durationHours,
            approved_by_id: userId
        };
        const { error: logError } = await supabase.from('time_logs').update(updatePayload).eq('id', ongoingLog.id);
        if (logError) {
            console.error("Failed to update time log during admin clock out:", logError);
            return null;
        }
    
        const profileUpdatePayload: ProfileUpdate = { time_clock_status: 'Clocked Out', clock_in_time: null };
        const { error: profileError } = await supabase.from('profiles').update(profileUpdatePayload).eq('id', userId);
        
        if (profileError) {
            console.error("Failed to update profile for clock-out. Rolling back time log state.", profileError);
            const rollbackPayload: TimeLogUpdate = {
                clock_out_time: null,
                status: 'Ongoing',
                declared_amount: null,
                counted_amount: null,
                expected_sales: null,
                difference: null,
                duration_hours: null,
                approved_by_id: null
            };
            await supabase.from('time_logs').update(rollbackPayload).eq('id', ongoingLog.id);
            return null;
        }
    
        const completedLog: TimeLog = {
            ...ongoingLog,
            clockOutTime,
            status: 'Completed',
            declaredAmount,
            countedAmount: declaredAmount,
            expectedSales,
            difference,
            durationHours,
            approvedBy: user.name,
        };
        setTimeLogs(prev => prev.map(l => l.id === ongoingLog.id ? completedLog : l));
    
        const updatedUsers = users.map(u => u.id === userId ? { ...u, timeClockStatus: 'Clocked Out' as const, clockInTime: undefined } : u);
        setUsers(updatedUsers);
    
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, timeClockStatus: 'Clocked Out' as const, clockInTime: undefined } : null);
        }
        
        await addActivityLog('Shift', `Admin ${user.name} clocked out.`);
        return completedLog;
    };

    const processSale = async (
        order: OrderItem[],
        paymentMethod: Sale['paymentMethod'],
        servedBy: string,
        customerType: string,
        discount?: { name: string; amount: number; }
    ): Promise<Sale | null> => {
        if (!currentUser) return null;

        // Definitive pre-flight check for all items before any DB operations.
        for (const item of order) {
            const product = products.find(p => p.id === item.id);
            if (!product) {
                const message = `Error: Product "${item.name}" not found in inventory. Sale aborted.`;
                alert(message);
                console.error(`Sale aborted: Product with ID ${item.id} (${item.name}) not found.`);
                return null;
            }

            if (product.productType === 'Stocked') {
                if (item.quantity > product.stock) {
                    const message = `Error: Insufficient stock for "${product.name}". Only ${product.stock} available. Sale aborted.`;
                    alert(message);
                    console.error(`Sale aborted: Insufficient stock for ${product.name}. Required: ${item.quantity}, Available: ${product.stock}.`);
                    return null;
                }
            } else if (product.productType === 'Service' && product.linkedKegProductId) {
                // This is a critical check to prevent selling from an untapped keg.
                const tappedKeg = kegInstances.find(k => k.productId === product.linkedKegProductId && k.status === 'Tapped');
                if (!tappedKeg) {
                    const message = `Error: No keg is currently tapped for "${product.name}". The sale cannot be completed.`;
                    alert(message);
                    console.error(`Sale aborted: No tapped keg found for product ${product.name} (linked to keg product ID ${product.linkedKegProductId}).`);
                    return null;
                }
                
                if (!product.servingSize || !product.servingSizeUnit) {
                    const message = `Error: Product "${product.name}" is not configured correctly for keg service (missing serving size). Sale aborted.`;
                    alert(message);
                    console.error(`Sale aborted: Product ${product.name} is missing serving size configuration.`);
                    return null;
                }

                const volumeRequired = normalizeUnit(product.servingSize, product.servingSizeUnit) * item.quantity;
                if (volumeRequired > tappedKeg.currentVolume) {
                    const servingsAvailable = Math.floor(tappedKeg.currentVolume / normalizeUnit(product.servingSize, product.servingSizeUnit));
                    const message = `Error: Insufficient volume in the keg for "${product.name}". Only ${servingsAvailable} servings left. Sale aborted.`;
                    alert(message);
                    console.error(`Sale aborted: Insufficient keg volume for ${product.name}. Required: ${volumeRequired}, Available: ${tappedKeg.currentVolume}.`);
                    return null;
                }
            }
        }
    
        const grossTotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalAfterDiscount = grossTotal - (discount?.amount || 0);
        const subtotal = totalAfterDiscount / 1.16;
        const tax = totalAfterDiscount - subtotal;
    
        const saleId = `SALE-${Date.now()}`;
    
        const saleInsertPayload: SaleInsert = {
            id: saleId,
            subtotal: subtotal,
            tax: tax,
            total: totalAfterDiscount,
            date: new Date().toISOString(),
            payment_method: paymentMethod,
            served_by_id: currentUser.id,
            served_by_name: servedBy,
            customer_type: customerType,
            discount_name: discount?.name,
            discount_amount: discount?.amount
        };
        const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert([saleInsertPayload])
            .select()
            .single();
        
        if (saleError || !saleData) {
            console.error("Error creating sale:", saleError);
            return null;
        }
    
        const saleItemsData: SaleItemInsert[] = order.map(item => ({
            sale_id: saleId,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price_at_sale: item.price
        }));
    
        const { error: saleItemsError } = await supabase.from('sale_items').insert(saleItemsData);
    
        if (saleItemsError) {
            console.error("Error creating sale items, rolling back sale:", saleItemsError);
            await supabase.from('sales').delete().eq('id', saleId);
            return null;
        }
    
        const stockUpdates = order.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return null;
    
            if (product.productType === 'Stocked') {
                return { id: item.id, newStock: product.stock - item.quantity };
            }
            
            if (product.productType === 'Service' && product.linkedKegProductId) {
                 const tappedKeg = kegInstances.find(k => k.productId === product.linkedKegProductId && k.status === 'Tapped');
                 if (tappedKeg && product.servingSize && product.servingSizeUnit) {
                     const volumeSold = normalizeUnit(product.servingSize, product.servingSizeUnit) * item.quantity;
                     
                     const newKegSale = {
                         userId: currentUser.id,
                         userName: currentUser.name,
                         volumeSold: volumeSold,
                         revenue: item.price * item.quantity,
                         saleDate: new Date().toISOString()
                     };
    
                     return {
                         kegId: tappedKeg.id,
                         newVolume: tappedKeg.currentVolume - volumeSold,
                         newSales: [...(tappedKeg.sales || [] as any), newKegSale]
                     };
                 }
            }
            return null;
        }).filter(Boolean);
    
        for (const update of stockUpdates) {
            if (update && 'id' in update && update.id) {
                const productUpdatePayload: ProductUpdate = { stock: update.newStock };
                await supabase.from('products').update(productUpdatePayload).eq('id', update.id);
            } else if (update && 'kegId' in update && update.kegId) {
                const kegUpdatePayload: KegInstanceUpdate = { current_volume: update.newVolume, sales: update.newSales as unknown as Json };
                await supabase.from('keg_instances').update(kegUpdatePayload).eq('id', update.kegId);
            }
        }
        
        const updatedProducts = products.map(p => {
            const update = stockUpdates.find(u => u && 'id' in u && u.id === p.id) as { id: string, newStock: number } | undefined;
            return update ? { ...p, stock: update.newStock } : p;
        });
        setProducts(updatedProducts);
    
        const updatedKegs = kegInstances.map(k => {
            const update = stockUpdates.find(u => u && 'kegId' in u && u.kegId === k.id) as { kegId: string, newVolume: number, newSales: any[] } | undefined;
            return update ? { ...k, currentVolume: update.newVolume, sales: update.newSales } : k;
        });
        setKegInstances(updatedKegs);
        
        const newSaleForState: Sale = {
            id: saleData.id,
            items: order,
            subtotal: saleData.subtotal,
            tax: saleData.tax,
            total: saleData.total,
            date: new Date(saleData.date),
            paymentMethod: saleData.payment_method,
            servedById: saleData.served_by_id,
            servedBy: saleData.served_by_name,
            customerType: saleData.customer_type,
            discountApplied: saleData.discount_name ? { name: saleData.discount_name, amount: saleData.discount_amount as number } : undefined
        };
    
        setSales(prev => [newSaleForState, ...prev]);
        await addActivityLog('Sale', `Created sale #${saleData.id}`, `Total: Ksh ${saleData.total.toFixed(2)}`);
    
        return newSaleForState;
    };

    const healStuckUser = async (userId: string): Promise<boolean> => {
        const user = users.find(u => u.id === userId);
        if (!user) return false;
    
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('time_clock_status, name').eq('id', userId).single();
        if (profileError || !profileData) {
            console.error(`Heal failed: Could not fetch profile for ${user.name}`, profileError);
            return false;
        }
    
        if (profileData.time_clock_status !== 'Clocked In') {
            console.log(`Heal check: Profile for ${user.name} is already ${profileData.time_clock_status}. No action needed.`);
            return false; 
        }
    
        const { data: logData, error: logError } = await supabase.from('time_logs').select('id').eq('user_id', userId).eq('status', 'Ongoing').limit(1).maybeSingle();
        
        if (logError) {
            console.error(`Heal failed: Could not query time logs for ${user.name}`, logError);
            return false;
        }
    
        if (logData) {
            console.log(`Heal check: Found ongoing log for ${user.name} in DB. No action needed.`);
            return false;
        }
        
        console.warn(`Inconsistent state confirmed for ${profileData.name}. Forcing clock out.`);
        const { error: updateError } = await supabase.from('profiles').update({ time_clock_status: 'Clocked Out', clock_in_time: null }).eq('id', userId);
        
        if (updateError) {
            console.error(`Heal failed: Could not update profile for ${user.name}`, updateError);
            return false;
        }
    
        const healedUser = { ...user, timeClockStatus: 'Clocked Out' as const, clockInTime: undefined };
        setUsers(prev => prev.map(u => u.id === userId ? healedUser : u));
        if (currentUser?.id === userId) {
            setCurrentUser(healedUser);
        }
        await addActivityLog('System', `Healed inconsistent clock-in state for ${user.name}.`);
        console.log(`Healed state for ${user.name} successfully.`);
        return true;
    };
    
    const updateStoreSettings = async (settings: StoreSettings) => {
        setStoreSettings(settings); // Update local state immediately for responsiveness
    
        const { data: existingMethods, error: fetchError } = await supabase.from('payment_methods').select('id');
        if (fetchError) {
            console.error("Failed to fetch existing payment methods:", fetchError);
            return; 
        }

        const existingIds = existingMethods.map(m => m.id);
        const newIds = settings.paymentMethods.map(m => m.id);
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));
        
        if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase.from('payment_methods').delete().in('id', idsToDelete);
            if (deleteError) console.error("Error deleting old payment methods:", deleteError);
        }

        const methodsToUpsert = settings.paymentMethods.map(m => ({
            id: m.id,
            name: m.name,
            details: m.details,
            show_on_receipt: m.showOnReceipt
        }));

        if (methodsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('payment_methods').upsert(methodsToUpsert);
            if (upsertError) console.error("Error upserting payment methods:", upsertError);
        }

        const updatePayload = {
            store_name: settings.storeName,
            address: settings.address,
            phone: settings.phone,
            email: settings.email,
            logo_url: settings.logoUrl,
            receipt_header: settings.receiptHeader,
            receipt_footer: settings.receiptFooter,
            show_logo_on_receipt: settings.showLogoOnReceipt,
            pdf_footer_text: settings.pdfFooterText,
            pdf_footer_logo_url: settings.pdfFooterLogoUrl,
            show_pdf_footer: settings.showPdfFooter,
            system_lock_pin: settings.systemLockPin,
            auto_lock_on_print: settings.autoLockOnPrint,
        };

        const { error: settingsError } = await supabase.from('store_settings').update(updatePayload).eq('id', 1);
        if (settingsError) {
            console.error("Failed to save store settings to the database:", settingsError);
        }
    };
    
    const resetSystemData = async () => {
        if (!currentUser || currentUser.role !== 'Admin') {
            alert("Error: Only Admins can perform this action.");
            return;
        }

        try {
            console.log("Starting system data reset...");

            const { error: salesError } = await supabase.from('sales').delete().neq('id', uuidv4());
            if (salesError) throw salesError;
            console.log("Deleted sales and sale items.");

            const { error: poError } = await supabase.from('purchase_orders').delete().neq('id', uuidv4());
            if (poError) throw poError;
            console.log("Deleted purchase orders and items.");
            
            const { error: kegError } = await supabase.from('keg_instances').delete().neq('id', uuidv4());
            if (kegError) throw kegError;
            console.log("Deleted keg instances.");

            const { error: timeLogError } = await supabase.from('time_logs').delete().neq('id', uuidv4());
            if (timeLogError) throw timeLogError;
            console.log("Deleted time logs.");
            
            const { error: shiftError } = await supabase.from('scheduled_shifts').delete().neq('id', uuidv4());
            if (shiftError) throw shiftError;
            console.log("Deleted scheduled shifts.");

            const { error: deductionError } = await supabase.from('deductions').delete().neq('id', uuidv4());
            if (deductionError) throw deductionError;
            console.log("Deleted deductions.");
            
            const { error: activityError } = await supabase.from('activity_logs').delete().neq('id', uuidv4());
            if (activityError) throw activityError;
            console.log("Deleted activity logs.");

            const { error: profileError } = await supabase.from('profiles').update({
                time_clock_status: 'Clocked Out',
                clock_in_time: null
            });
            if (profileError) throw profileError;
            console.log("Reset all user clock-in statuses.");

            await fetchData();

            console.log("System data reset complete.");
            await addActivityLog('System', 'Reset all transactional data.');

        } catch (error) {
            console.error("Error resetting system data:", error);
            const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
            alert(`An error occurred while resetting data: ${errorMessage}\nPlease check the console and try again.`);
        }
    };

    const addPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'supplierName' | 'totalCost'>) => {
        if (!currentUser) throw new Error("User must be logged in to create a purchase order.");

        const supplier = suppliers.find(s => s.id === po.supplierId);
        if (!supplier) throw new Error("Supplier not found");
        const supplierName = supplier.name;

        const totalCost = po.items.reduce((sum, item) => sum + (item.cost * item.quantityOrdered), 0);
        const newPOId = `PO-${Date.now()}`;

        const poInsertPayload: PurchaseOrderInsert = {
            id: newPOId,
            supplier_id: po.supplierId,
            invoice_no: po.invoiceNo,
            total_cost: totalCost,
            status: 'Pending',
            order_date: po.orderDate.toISOString().split('T')[0],
        };

        const { data: insertedPO, error: poError } = await supabase
            .from('purchase_orders')
            .insert([poInsertPayload])
            .select()
            .single();

        if (poError || !insertedPO) {
            console.error("Error creating purchase order:", poError);
            throw poError || new Error("Failed to create purchase order.");
        }

        const poItemsInsertPayload: PurchaseOrderItemInsert[] = po.items.map(item => ({
            po_id: newPOId,
            product_id: item.productId,
            quantity_ordered: item.quantityOrdered,
            cost: item.cost,
            quantity_received: 0,
        }));

        if (poItemsInsertPayload.length > 0) {
            const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItemsInsertPayload);

            if (itemsError) {
                console.error("Error adding PO items, rolling back PO creation:", itemsError);
                await supabase.from('purchase_orders').delete().eq('id', newPOId);
                throw itemsError;
            }
        }
        
        const newPOForState: PurchaseOrder = {
            id: newPOId,
            supplierId: po.supplierId,
            supplierName: supplierName,
            invoiceNo: po.invoiceNo,
            items: po.items.map(item => ({...item, quantityReceived: 0})),
            totalCost: totalCost,
            status: 'Pending',
            orderDate: po.orderDate,
        };

        setPurchaseOrders(prev => [newPOForState, ...prev].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
        await addActivityLog('PO', `Created Purchase Order #${newPOId} for ${supplierName}.`);
    };

    const updatePurchaseOrder = async (po: PurchaseOrder) => {
        const supplier = suppliers.find(s => s.id === po.supplierId);
        if (!supplier) throw new Error("Supplier not found");

        const totalCost = po.items.reduce((sum, item) => sum + (item.cost * item.quantityOrdered), 0);

        const poUpdatePayload: PurchaseOrderUpdate = {
            supplier_id: po.supplierId,
            invoice_no: po.invoiceNo,
            total_cost: totalCost,
            status: po.status,
            order_date: new Date(po.orderDate).toISOString().split('T')[0],
            received_date: po.receivedDate ? new Date(po.receivedDate).toISOString().split('T')[0] : null,
        };

        const { error: poError } = await supabase
            .from('purchase_orders')
            .update(poUpdatePayload)
            .eq('id', po.id);
        
        if (poError) {
            console.error("Error updating purchase order:", poError);
            throw poError;
        }

        const { error: deleteError } = await supabase.from('purchase_order_items').delete().eq('po_id', po.id);
        if (deleteError) {
            console.error("Error clearing old PO items:", deleteError);
        }

        const poItemsInsertPayload: PurchaseOrderItemInsert[] = po.items.map(item => ({
            po_id: po.id,
            product_id: item.productId,
            quantity_ordered: item.quantityOrdered,
            quantity_received: item.quantityReceived || 0,
            cost: item.cost,
        }));

        if (poItemsInsertPayload.length > 0) {
            const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItemsInsertPayload);
            if (itemsError) {
                console.error("Error re-inserting PO items:", itemsError);
                throw itemsError;
            }
        }
        
        const updatedPOForState: PurchaseOrder = {
            ...po,
            totalCost,
            supplierName: supplier.name
        };
        
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? updatedPOForState : p));
        await addActivityLog('PO', `Updated Purchase Order #${po.id}.`);
    };
    
    const receivePurchaseOrderItems = async (poId: string, receivedItems: { productId: string; quantityReceived: number }[], receiverName: string) => {
        if (!currentUser) throw new Error("User must be logged in to receive items.");
        
        const poToUpdate = purchaseOrders.find(p => p.id === poId);
        if (!poToUpdate) throw new Error("Purchase Order not found.");

        let updatedItems = [...poToUpdate.items];
        let hasErrors = false;

        for (const receivedItem of receivedItems) {
            const poItem = updatedItems.find(i => i.productId === receivedItem.productId);
            if (!poItem) continue;

            const newTotalReceived = (poItem.quantityReceived || 0) + receivedItem.quantityReceived;

            const { error: poItemError } = await supabase.from('purchase_order_items').update({ quantity_received: newTotalReceived }).eq('po_id', poId).eq('product_id', receivedItem.productId);
            if (poItemError) {
                console.error(`Error updating PO item ${receivedItem.productId}:`, poItemError);
                hasErrors = true;
                continue;
            }

            const product = products.find(p => p.id === receivedItem.productId);
            if (product) {
                const newStock = product.stock + receivedItem.quantityReceived;
                const { error: productError } = await supabase.from('products').update({ stock: newStock }).eq('id', receivedItem.productId);
                
                if (productError) {
                    console.error(`Error updating stock for ${product.name}:`, productError);
                    hasErrors = true;
                    await supabase.from('purchase_order_items').update({ quantity_received: poItem.quantityReceived }).eq('po_id', poId).eq('product_id', receivedItem.productId);
                } else {
                    updatedItems = updatedItems.map(item => item.productId === receivedItem.productId ? { ...item, quantityReceived: newTotalReceived } : item);
                }
            }
        }
        
        if (hasErrors) {
            throw new Error("One or more items failed to update. Please check the logs and try again.");
        }

        const isFullyReceived = updatedItems.every(item => item.quantityReceived >= item.quantityOrdered);
        const newStatus = isFullyReceived ? 'Received' : 'Partially Received';
        const receivedDate = newStatus === 'Received' ? new Date() : poToUpdate.receivedDate;

        const poUpdatePayload: PurchaseOrderUpdate = {
            status: newStatus,
            received_date: receivedDate ? receivedDate.toISOString().split('T')[0] : null,
            received_by_id: currentUser.id
        };
        const { error: poStatusError } = await supabase.from('purchase_orders').update(poUpdatePayload).eq('id', poId);
            
        if (poStatusError) {
            console.error("Error updating PO status:", poStatusError);
        }

        const updatedPO: PurchaseOrder = {
            ...poToUpdate,
            items: updatedItems,
            status: newStatus,
            receivedDate: receivedDate,
            receivedBy: receiverName,
        };
        setPurchaseOrders(prev => prev.map(p => p.id === poId ? updatedPO : p));
        
        const updatedProducts = products.map(p => {
            const received = receivedItems.find(ri => ri.productId === p.id);
            if (received) {
                return { ...p, stock: p.stock + received.quantityReceived };
            }
            return p;
        });
        setProducts(updatedProducts);
        
        await addActivityLog('PO', `Received stock for PO #${poId}.`, `${receivedItems.length} item type(s) updated.`);
    };

    const contextValue: IDataContext = {
        theme, toggleTheme, isStoreSettingsLoading, login, logout, currentUser, setCurrentUser, users, addUser, updateUser, deleteUser,
        addUserDeduction, removeUserDeduction, dayStarted, setDayStarted,
        products, categories, sales, suppliers, purchaseOrders, scheduledShifts, timeLogs, kegInstances, discounts, activityLogs, storeSettings,
        printerSettings, updatePrinterSettings: (s) => setPrinterSettings(s), updateStoreSettings,
        openOrders, setOpenOrders, isSystemLocked, setSystemLocked,
        clockIn, requestShiftClearance, approveShift, rejectShift, adminClockOut,
        processSale, healStuckUser,
        addScheduledShift: async (shiftData) => { 
            const userName = users.find(u => u.id === shiftData.userId)?.name || 'N/A';
            const id = uuidv4();
            const { userId, startTime, endTime, date } = shiftData;
            const insertPayload: ScheduledShiftInsert = { user_id: userId, start_time: startTime, end_time: endTime, date, id };
            await supabase.from('scheduled_shifts').insert([insertPayload]);
            setScheduledShifts(prev => [...prev, {...shiftData, id, userName}]);
        },
        updateScheduledShift: async (shift) => { 
            const userName = users.find(u => u.id === shift.userId)?.name || 'N/A';
            const updatePayload: ScheduledShiftUpdate = { date: shift.date, start_time: shift.startTime, end_time: shift.endTime, user_id: shift.userId };
            await supabase.from('scheduled_shifts').update(updatePayload).eq('id', shift.id);
            setScheduledShifts(prev => prev.map(s => s.id === shift.id ? {...shift, userName} : s));
        },
        deleteScheduledShift: async (shiftId) => { 
            await supabase.from('scheduled_shifts').delete().eq('id', shiftId);
            setScheduledShifts(prev => prev.filter(s => s.id !== shiftId));
        },
        addProduct: async (p) => { 
            const category = categories.find(c => c.name === p.category);
            const insertPayload: ProductInsert = {
                name: p.name,
                price: p.price,
                product_type: p.productType,
                stock: p.stock,
                low_stock_threshold: p.lowStockThreshold,
                category_id: category?.id,
                keg_capacity: p.kegCapacity,
                keg_capacity_unit: p.kegCapacityUnit,
                linked_keg_product_id: p.linkedKegProductId,
                serving_size: p.servingSize,
                serving_size_unit: p.servingSizeUnit,
            };
            const { data, error } = await supabase.from('products').insert([insertPayload]).select().single();
            if (error) {
                console.error("Error adding product:", error);
                throw error;
            }
            if (!data) {
                const err = new Error("Failed to add product, no data returned.");
                console.error(err);
                throw err;
            }
            setProducts(prev => [...prev, { ...p, id: data.id, category: category?.name || 'Uncategorized' }]);
        },
        updateProduct: async (p) => { 
            const category = categories.find(c => c.name === p.category);
            const updatePayload: ProductUpdate = {
                name: p.name,
                price: p.price,
                product_type: p.productType,
                stock: p.stock,
                low_stock_threshold: p.lowStockThreshold,
                category_id: category?.id,
                keg_capacity: p.kegCapacity,
                keg_capacity_unit: p.kegCapacityUnit,
                linked_keg_product_id: p.linkedKegProductId,
                serving_size: p.servingSize,
                serving_size_unit: p.servingSizeUnit,
            };
            await supabase.from('products').update(updatePayload).eq('id', p.id);
            setProducts(prev => prev.map(prod => prod.id === p.id ? { ...p, category: category?.name || 'Uncategorized' } : prod));
        },
        deleteProduct: async (id) => { 
            await supabase.from('products').delete().eq('id', id);
            setProducts(prev => prev.filter(p => p.id !== id));
        },
        addCategory: async (name) => { 
            const insertPayload: CategoryInsert = { name };
            const { data, error } = await supabase.from('categories').insert([insertPayload]).select().single();
            if (error) {
                console.error("Error adding category:", error);
                throw error;
            }
            if (!data) {
                const err = new Error("Failed to add category, no data returned.");
                console.error(err);
                throw err;
            }
            setCategories(prev => [...prev, { id: data.id, name }]);
        },
        updateCategory: async (id, name) => { 
            const updatePayload: CategoryUpdate = { name };
            await supabase.from('categories').update(updatePayload).eq('id', id);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
        },
        deleteCategory: async (id) => { 
            await supabase.from('categories').delete().eq('id', id);
            setCategories(prev => prev.filter(c => c.id !== id));
        },
        addSupplier: async (s) => { 
            const id = uuidv4();
            const insertPayload: SupplierInsert = {
                id,
                name: s.name,
                contact_person: s.contactPerson,
                phone: s.phone,
                email: s.email,
                payment_terms: s.paymentTerms,
                bank_name: s.bankName,
                bank_account_number: s.bankAccountNumber,
                bank_branch: s.bankBranch,
                mpesa_paybill: s.mpesaPaybill,
                notes: s.notes
            };
            await supabase.from('suppliers').insert([insertPayload]);
            setSuppliers(prev => [...prev, {...s, id}]);
        },
        updateSupplier: async (s) => { 
            const updatePayload: SupplierUpdate = {
                name: s.name,
                contact_person: s.contactPerson,
                phone: s.phone,
                email: s.email,
                payment_terms: s.paymentTerms,
                bank_name: s.bankName,
                bank_account_number: s.bankAccountNumber,
                bank_branch: s.bankBranch,
                mpesa_paybill: s.mpesaPaybill,
                notes: s.notes
            };
            await supabase.from('suppliers').update(updatePayload).eq('id', s.id);
            setSuppliers(prev => prev.map(sup => sup.id === s.id ? s : sup));
        },
        deleteSupplier: async (id) => { 
            await supabase.from('suppliers').delete().eq('id', id);
            setSuppliers(prev => prev.filter(s => s.id !== id));
        },
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder: async (id) => { 
             await supabase.from('purchase_orders').delete().eq('id', id);
             setPurchaseOrders(prev => prev.filter(p => p.id !== id));
        },
        receivePurchaseOrderItems,
        addKegInstances: async (productId, count) => {
            const product = products.find(p => p.id === productId);
            if (!product || product.productType !== 'Keg' || !product.kegCapacity || !product.kegCapacityUnit) {
                console.error("Invalid product for adding keg instances.");
                return;
            }
            const capacity = normalizeUnit(product.kegCapacity, product.kegCapacityUnit);
            const newKegs: KegInstanceInsert[] = Array.from({ length: count }, () => ({
                id: uuidv4(),
                product_id: productId,
                capacity: capacity,
                current_volume: capacity,
                status: 'Full',
                sales: [],
            }));
            const { data, error } = await supabase.from('keg_instances').insert(newKegs).select();
            if (error) throw error;
        
            const { error: productError } = await supabase.from('products').update({ stock: product.stock + count }).eq('id', productId);
            if (productError) {
                console.error("Failed to update product stock for new kegs:", productError);
            }
        
            const newKegsForState: KegInstance[] = data!.map((k) => ({
                id: k.id, productId: k.product_id, capacity: k.capacity, currentVolume: k.current_volume, status: k.status, sales: k.sales as any[],
                productName: product.name,
            }));
            setKegInstances(prev => [...prev, ...newKegsForState]);
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + count } : p));
            await addActivityLog('Inventory', `Added ${count} new keg(s) of ${product.name}.`);
        },
        tapKeg: async (kegId, userName) => {
            if (!currentUser) return;
            const updatePayload: KegInstanceUpdate = { status: 'Tapped', tapped_by_id: currentUser.id, tapped_date: new Date().toISOString() };
            const { error } = await supabase.from('keg_instances').update(updatePayload).eq('id', kegId);
            if (error) throw error;
            const keg = kegInstances.find(k => k.id === kegId);
            setKegInstances(prev => prev.map(k => k.id === kegId ? { ...k, status: 'Tapped', tappedBy: userName, tappedDate: new Date() } : k));
            await addActivityLog('Keg', `Tapped keg of ${keg?.productName}.`);
        },
        closeKeg: async (kegId, userName) => {
            if (!currentUser) return;
            const updatePayload: KegInstanceUpdate = { status: 'Empty', closed_by_id: currentUser.id, closed_date: new Date().toISOString() };
            const { error } = await supabase.from('keg_instances').update(updatePayload).eq('id', kegId);
            if (error) throw error;
            const keg = kegInstances.find(k => k.id === kegId);
            setKegInstances(prev => prev.map(k => k.id === kegId ? { ...k, status: 'Empty', closedBy: userName, closedDate: new Date() } : k));
            await addActivityLog('Keg', `Closed keg of ${keg?.productName}.`);
        },
        addDiscount: async (d) => {
             const insertPayload: DiscountInsert = {
                 name: d.name,
                 type: d.type,
                 value: d.value,
                 product_ids: d.productIds || null,
             };
             const { data, error } = await supabase.from('discounts').insert([insertPayload]).select().single();
             if (error) {
                console.error("Error adding discount:", error);
                throw error;
             }
             if (!data) {
                const err = new Error("Failed to add discount, no data returned.");
                console.error(err);
                throw err;
             }
             setDiscounts(prev => [...prev, { ...d, id: data.id, isActive: data.is_active, productIds: data.product_ids || [] }]);
        },
        updateDiscount: async (d) => {
            const updatePayload: DiscountUpdate = { 
                name: d.name, 
                type: d.type, 
                value: d.value, 
                is_active: d.isActive,
                product_ids: d.productIds || null,
            };
            await supabase.from('discounts').update(updatePayload).eq('id', d.id);
            setDiscounts(prev => prev.map(disc => disc.id === d.id ? d : disc));
        },
        deleteDiscount: async (id) => {
            await supabase.from('discounts').delete().eq('id', id);
            setDiscounts(prev => prev.filter(d => d.id !== id));
        },
        verifyUnlockPin: (pin) => storeSettings.systemLockPin === pin,
        verifyUserPin: (userId, pin) => {
            const user = users.find(u => u.id === userId);
            return !!user && user.pin === pin;
        },
        verifyOverridePin: (pin) => users.find(u => (u.role === 'Admin' || u.role === 'Manager') && u.overridePin === pin) || null,
        resetSystemData
    };

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};