import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaBoxOpen, FaTruck, FaReceipt, FaTimes, FaUsers, FaShoppingCart, FaBeer, FaCompass } from 'react-icons/fa';
import { useData } from '../../context/DataContext';

interface SearchResult {
    id: string;
    name: string;
    path: string;
    description?: string;
}

interface SearchResultGroup {
    title: string;
    icon: React.ReactNode;
    items: SearchResult[];
}

const GlobalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const { products, suppliers, purchaseOrders, users, sales, kegInstances } = useData();
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const navigationActions: SearchResult[] = [
        { id: 'nav-dashboard', name: 'Dashboard', path: '/' },
        { id: 'nav-order', name: 'Create Order', path: '/order' },
        { id: 'nav-inventory', name: 'Inventory', path: '/inventory' },
        { id: 'nav-kegs', name: 'Keg Management', path: '/keg-management' },
        { id: 'nav-reports', name: 'Reports', path: '/reports' },
        { id: 'nav-shifts', name: 'Shift Summary', path: '/shift-summary' },
        { id: 'nav-activity', name: 'Activity Log', path: '/activity-log' },
        { id: 'nav-pos', name: 'Purchase Orders', path: '/purchase-orders' },
        { id: 'nav-suppliers', name: 'Suppliers', path: '/suppliers' },
        { id: 'nav-users', name: 'Users', path: '/users' },
        { id: 'nav-ai', name: 'Growth Insights', path: '/ai-suggestions' },
        { id: 'nav-settings', name: 'Settings', path: '/settings' },
    ];

    const searchResults = useMemo((): SearchResultGroup[] => {
        if (query.length < 2) return [];

        const lowerCaseQuery = query.toLowerCase();

        const productResults: SearchResult[] = products
            .filter(p => p.name.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                name: p.name,
                path: '/inventory',
                description: `Category: ${p.category}`
            }));

        const supplierResults: SearchResult[] = suppliers
            .filter(s =>
                s.name.toLowerCase().includes(lowerCaseQuery) ||
                (s.contactPerson && s.contactPerson.toLowerCase().includes(lowerCaseQuery))
            )
            .slice(0, 5)
            .map(s => ({
                id: s.id,
                name: s.name,
                path: '/suppliers',
                description: s.contactPerson ? `Contact: ${s.contactPerson}` : undefined
            }));

        const poResults: SearchResult[] = purchaseOrders
            .filter(po => po.id.toLowerCase().includes(lowerCaseQuery) || po.supplierName.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5)
            .map(po => ({
                id: po.id,
                name: `PO: ${po.id}`,
                path: '/purchase-orders',
                description: `Supplier: ${po.supplierName}`
            }));

        const userResults: SearchResult[] = users
            .filter(u => u.name.toLowerCase().includes(lowerCaseQuery) || u.email.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 3)
            .map(u => ({
                id: u.id,
                name: u.name,
                path: '/users',
                description: u.email
            }));

        const saleResults: SearchResult[] = sales
            .filter(s =>
                s.id.toLowerCase().includes(lowerCaseQuery) ||
                s.servedBy.toLowerCase().includes(lowerCaseQuery) ||
                s.customerType.toLowerCase().includes(lowerCaseQuery)
            )
            .slice(0, 5)
            .map(s => ({
                id: s.id,
                name: `Sale: ${s.id}`,
                path: '/reports',
                description: `By ${s.servedBy} - Ksh ${s.total.toFixed(2)}`
            }));
            
        const kegResults: SearchResult[] = kegInstances
            .filter(k =>
                k.productName.toLowerCase().includes(lowerCaseQuery) ||
                k.id.toLowerCase().includes(lowerCaseQuery)
            )
            .slice(0, 3)
            .map(k => ({
                id: k.id,
                name: k.productName,
                path: '/keg-management',
                description: `ID: ${k.id.split('-').pop()} - Status: ${k.status}`
            }));
            
        const navigationResults: SearchResult[] = navigationActions
            .filter(a => a.name.toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5);

        return [
            { title: 'Pages & Actions', icon: <FaCompass />, items: navigationResults },
            { title: 'Sales', icon: <FaShoppingCart />, items: saleResults },
            { title: 'Products', icon: <FaBoxOpen />, items: productResults },
            { title: 'Users', icon: <FaUsers />, items: userResults },
            { title: 'Suppliers', icon: <FaTruck />, items: supplierResults },
            { title: 'Purchase Orders', icon: <FaReceipt />, items: poResults },
            { title: 'Kegs', icon: <FaBeer />, items: kegResults },
        ].filter(group => group.items.length > 0);

    }, [query, products, suppliers, purchaseOrders, users, sales, kegInstances]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const handleReset = () => {
        setQuery('');
        setIsFocused(false);
    };

    const getLinkState = (item: SearchResult, groupTitle: string) => {
        switch (groupTitle) {
            case 'Purchase Orders':
            case 'Sales':
                return { searchQuery: item.id };
            case 'Products':
            case 'Suppliers':
            case 'Users':
            case 'Kegs':
                return { searchQuery: item.name };
            default:
                return undefined;
        }
    };

    return (
        <div className="relative w-full max-w-xs" ref={searchContainerRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Search anything..."
                    className="block w-full pl-10 pr-10 py-2 rounded-md border border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
                />
                {query && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button onClick={handleReset} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none">
                            <FaTimes />
                        </button>
                    </div>
                )}
            </div>

            {isFocused && query.length > 1 && (
                <div className="absolute mt-1 w-full md:w-96 bg-white dark:bg-dark-mode-blue-900 rounded-lg shadow-lg z-20 border dark:border-dark-mode-blue-700 max-h-[70vh] overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div className="p-2">
                            {searchResults.map(group => (
                                <div key={group.title} className="mb-2 last:mb-0">
                                    <h3 className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-mode-blue-800 rounded-t-md">
                                        {group.icon}
                                        {group.title}
                                    </h3>
                                    <ul className="divide-y divide-gray-100 dark:divide-dark-mode-blue-800">
                                        {group.items.map(item => (
                                            <li key={item.id}>
                                                <Link
                                                    to={item.path}
                                                    state={getLinkState(item, group.title)}
                                                    onClick={() => {
                                                        setIsFocused(false);
                                                        setQuery('');
                                                    }}
                                                    className="block p-3 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800/50"
                                                >
                                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                                                    {item.description && <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No results found for "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
