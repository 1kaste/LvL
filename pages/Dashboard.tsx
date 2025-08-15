import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import { FaDollarSign, FaShoppingCart, FaBoxOpen, FaPlus, FaExclamationTriangle, FaPrint } from 'react-icons/fa';
import { Sale } from '../types';
import ReceiptModal from '../components/common/ReceiptModal';
import Toast from '../components/common/Toast';

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <Card className={`flex items-center p-4 text-white ${color}`}>
        <div className="p-3 rounded-full bg-white bg-opacity-20">{icon}</div>
        <div className="ml-4">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);

const Dashboard: React.FC = () => {
    const { sales, products, timeLogs, currentUser, storeSettings } = useData();
    const [lowStockSearch, setLowStockSearch] = useState('');
    const [mySalesSearch, setMySalesSearch] = useState('');
    const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);
    const [toastInfo, setToastInfo] = useState({ show: false, message: '' });

    const todayStats = useMemo(() => {
        if (!currentUser) return { revenue: 0, salesCount: 0 };
        const today = new Date().toDateString();
        const allTodaySales = sales.filter(s => new Date(s.date).toDateString() === today);
        
        const userTodaySales = (currentUser.role === 'Admin' || currentUser.role === 'Manager')
            ? allTodaySales
            : allTodaySales.filter(s => s.servedById === currentUser.id);

        const revenue = userTodaySales.reduce((sum, sale) => sum + sale.total, 0);
        return {
            revenue,
            salesCount: userTodaySales.length,
        };
    }, [sales, currentUser]);

    const salesByLast7Days = useMemo(() => {
        if (!currentUser) return [];

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        });

        const data = last7Days.map(date => ({ 
            name: date.toLocaleDateString('en-US', { weekday: 'short' }), 
            revenue: 0,
            fullDate: date.toDateString()
        })).reverse();
        
        const dateMap = new Map(data.map(d => [d.fullDate, d]));

        const userSales = (currentUser.role === 'Admin' || currentUser.role === 'Manager')
            ? sales
            : sales.filter(s => s.servedById === currentUser.id);

        userSales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const diffDays = Math.floor((new Date().setHours(0,0,0,0) - saleDate.setHours(0,0,0,0)) / (1000 * 3600 * 24));
            
            if (diffDays < 7 && diffDays >= 0) {
                const dayData = dateMap.get(saleDate.toDateString());
                if (dayData) {
                    dayData.revenue += sale.total;
                }
            }
        });

        return data;
    }, [sales, currentUser]);

    const lowStockItems = useMemo(() => {
        return products
            .filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold)
            .sort((a, b) => a.stock - b.stock);
    }, [products]);
    
    const filteredLowStockItems = useMemo(() => {
        return lowStockItems.filter(item => 
            item.name.toLowerCase().includes(lowStockSearch.toLowerCase())
        );
    }, [lowStockItems, lowStockSearch]);
    
    const lastShiftSummary = useMemo(() => {
        if (!currentUser) return null;
        const userCompletedLogs = timeLogs
            .filter(log => log.userId === currentUser.id && log.status === 'Completed' && log.clockOutTime)
            .sort((a, b) => new Date(b.clockOutTime!).getTime() - new Date(a.clockOutTime!).getTime());

        if (userCompletedLogs.length > 0) {
            return userCompletedLogs[0];
        }
        return null;
    }, [timeLogs, currentUser]);

    const mySales = useMemo(() => {
        if (!currentUser) return [];
        return sales
            .filter(s => s.servedById === currentUser.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, currentUser]);

    const filteredMySales = useMemo(() => {
        if (!mySalesSearch) return mySales;
        const lowercasedQuery = mySalesSearch.toLowerCase();
        return mySales.filter(sale => 
            sale.id.toLowerCase().includes(lowercasedQuery) ||
            sale.items.some(item => item.name.toLowerCase().includes(lowercasedQuery)) ||
            sale.total.toFixed(2).includes(lowercasedQuery)
        );
    }, [mySales, mySalesSearch]);

    return (
        <>
            <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard icon={<FaDollarSign />} title="Today's Revenue" value={`Ksh ${todayStats.revenue.toFixed(2)}`} color="bg-gradient-to-br from-primary-cyan-500 to-primary-cyan-700" />
                    <StatCard icon={<FaShoppingCart />} title="Today's Sales" value={todayStats.salesCount.toString()} color="bg-gradient-to-br from-primary-orange-500 to-primary-orange-700" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sales Chart */}
                    <Card className="lg:col-span-2">
                        <h3 className="font-bold text-lg mb-4">Sales - Last 7 Days</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={salesByLast7Days}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                <XAxis dataKey="name" stroke="rgb(156 163 175)" />
                                <YAxis stroke="rgb(156 163 175)" />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', borderColor: 'rgb(51 65 85)', color: 'white', borderRadius: '0.5rem' }}/>
                                <Line type="monotone" dataKey="revenue" stroke="#fc6621" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                    
                    {/* Quick Actions & Shift Summary */}
                    <div className="space-y-6">
                        <Card>
                            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <NavLink to="/order">
                                    <Button variant="primary" className="w-full" icon={<FaPlus />}>Create New Order</Button>
                                </NavLink>
                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                                    <NavLink to="/inventory">
                                        <Button variant="secondary" className="w-full" icon={<FaBoxOpen />}>Manage Inventory</Button>
                                    </NavLink>
                                )}
                            </div>
                        </Card>
                        {lastShiftSummary && typeof lastShiftSummary.difference === 'number' && (
                            <Card>
                                <h3 className="font-bold text-lg mb-2">My Last Shift Summary</h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400">Cash Difference</span>
                                    <span className={`font-bold text-xl ${
                                        lastShiftSummary.difference < 0 ? 'text-red-500' :
                                        lastShiftSummary.difference > 0 ? 'text-green-500' :
                                        'text-gray-500 dark:text-gray-400'
                                    }`}>
                                        Ksh {lastShiftSummary.difference.toFixed(2)}
                                    </span>
                                </div>
                                 <p className="text-xs text-gray-500 mt-1">
                                    From shift ending {new Date(lastShiftSummary.clockOutTime!).toLocaleString()}
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
                
                 {/* Low Stock Items */}
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <FaExclamationTriangle className="text-yellow-500" />
                          <h3 className="font-bold text-lg">Low Stock Items</h3>
                        </div>
                        <SearchInput 
                            value={lowStockSearch}
                            onChange={(e) => setLowStockSearch(e.target.value)}
                            placeholder="Search low stock items..."
                            className="w-full sm:w-64"
                        />
                    </div>

                    {filteredLowStockItems.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left dark:text-gray-200">
                                <thead>
                                    <tr className="border-b dark:border-dark-mode-blue-700"><th className="p-2">Product</th><th className="p-2">Stock Left</th></tr>
                                </thead>
                                <tbody>
                                    {filteredLowStockItems.slice(0, 5).map(item => (
                                        <tr key={item.id} className="border-b dark:border-dark-mode-blue-800 text-sm">
                                            <td className="p-2">{item.name}</td>
                                            <td className="p-2 font-bold text-red-500">{item.stock}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                            {lowStockSearch ? 'No matching items found.' : 'No items are currently low on stock. Great job!'}
                        </p>
                    )}
                </Card>

                {/* My Recent Sales Log */}
                {(currentUser?.role === 'Cashier' || currentUser?.role === 'Server/bartender') && (
                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <h3 className="font-bold text-lg">My Recent Sales</h3>
                            <SearchInput
                                value={mySalesSearch}
                                onChange={(e) => setMySalesSearch(e.target.value)}
                                placeholder="Search my sales..."
                                className="w-full sm:w-64"
                            />
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left text-sm dark:text-gray-200">
                                <thead className="border-b dark:border-dark-mode-blue-700 sticky top-0 bg-white dark:bg-dark-mode-blue-900">
                                    <tr>
                                        <th className="p-2">Sale ID</th>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Items</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMySales.map(sale => (
                                        <tr key={sale.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                                            <td className="p-2 font-mono text-xs">{sale.id}</td>
                                            <td className="p-2">{new Date(sale.date).toLocaleString()}</td>
                                            <td className="p-2 max-w-xs truncate">{sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                                            <td className="p-2 text-right font-semibold">Ksh {sale.total.toFixed(2)}</td>
                                            <td className="p-2 text-center">
                                                <Button variant="secondary" className="!p-2" onClick={() => setReceiptModalSale(sale)} title="Print Receipt">
                                                    <FaPrint />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredMySales.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">
                                    {mySalesSearch ? 'No sales found matching your search.' : 'You have not made any sales yet.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {receiptModalSale && (
                <ReceiptModal
                    isOpen={!!receiptModalSale}
                    onClose={() => setReceiptModalSale(null)}
                    sale={receiptModalSale}
                    settings={storeSettings}
                    onPrintSuccess={() => setToastInfo({ show: true, message: 'Print command sent!' })}
                />
            )}
            <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: ''})} />
        </>
    );
};

export default Dashboard;