import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { Product, Category, MeasureUnit, KegInstance } from '../types';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SearchInput from '../components/common/SearchInput';
import Toast from '../components/common/Toast';
import { FaPlus, FaEdit, FaTrash, FaFilePdf, FaTags, FaPencilAlt, FaCheck, FaTimes, FaLink, FaFileImport, FaFileDownload } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter';

const ProductForm: React.FC<{
  product?: Product | null;
  allProducts: Product[];
  onSave: (product: Product | Omit<Product, 'id'>) => Promise<void>;
  onClose: () => void;
  categories: Category[];
}> = ({ product, allProducts, onSave, onClose, categories }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || categories[0]?.name || '',
    price: product?.price || 0,
    productType: product?.productType || 'Stocked',
    stock: product?.stock || 0,
    lowStockThreshold: product?.lowStockThreshold || 10,
    kegCapacity: product?.kegCapacity || 0,
    kegCapacityUnit: product?.kegCapacityUnit || 'L',
    linkedKegProductId: product?.linkedKegProductId || '',
    servingSize: product?.servingSize || 0,
    servingSizeUnit: product?.servingSizeUnit || 'ml',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['price', 'stock', 'lowStockThreshold', 'kegCapacity', 'servingSize'];
    const parsedValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalFormData: any = { ...formData };
    
    if (finalFormData.productType === 'Service') {
        finalFormData.stock = 0; // Service items don't have stock, use 0
        finalFormData.lowStockThreshold = 0;
        delete finalFormData.kegCapacity;
        delete finalFormData.kegCapacityUnit;
        if (!finalFormData.linkedKegProductId) {
          delete finalFormData.servingSize;
          delete finalFormData.servingSizeUnit;
        }
    } else if (finalFormData.productType === 'Keg') {
        delete finalFormData.linkedKegProductId;
        delete finalFormData.servingSize;
        delete finalFormData.servingSizeUnit;
    } else { // Stocked
        delete finalFormData.kegCapacity;
        delete finalFormData.kegCapacityUnit;
        delete finalFormData.linkedKegProductId;
        delete finalFormData.servingSize;
        delete finalFormData.servingSizeUnit;
    }
    
    // Remove transient form state properties before saving
    const productData = (({ id, ...rest }) => rest)(finalFormData);

    if (product) {
      await onSave({ ...product, ...productData });
    } else {
      await onSave(productData);
    }
    onClose();
  };

  const kegProducts = useMemo(() => allProducts.filter(p => p.productType === 'Keg'), [allProducts]);
  const measureUnits: MeasureUnit[] = ['ml', 'L', 'g', 'kg'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
      </div>
       <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Type</label>
            <select name="productType" value={formData.productType} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
                <option value="Stocked">Stocked Good</option>
                <option value="Service">Service</option>
                <option value="Keg">Keg (Container)</option>
            </select>
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price (Ksh)</label>
          <input type="number" name="price" step="0.01" value={formData.price} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
        </div>
        
        {formData.productType === 'Stocked' && (
            <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label>
                  <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                </div>
            </>
        )}
        
        {formData.productType === 'Keg' && (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock (No. of Kegs)</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
                    <div className="flex gap-2">
                        <input type="number" name="kegCapacity" value={formData.kegCapacity} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required placeholder="e.g. 50" />
                        <select name="kegCapacityUnit" value={formData.kegCapacityUnit} onChange={handleChange} className="mt-1 block w-24 rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200">
                           {measureUnits.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
            </>
        )}
      </div>
      
      {formData.productType === 'Service' && (
        <div className="md:col-span-2 space-y-3 p-3 rounded-md bg-gray-100 dark:bg-dark-mode-blue-900/50 border border-gray-200 dark:border-dark-mode-blue-800">
          <h4 className="font-semibold flex items-center gap-2"><FaLink /> Link to Keg (Optional)</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Keg Product</label>
            <select name="linkedKegProductId" value={formData.linkedKegProductId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200">
                <option value="">None</option>
                {kegProducts.map(keg => (
                    <option key={keg.id} value={keg.id}>{keg.name}</option>
                ))}
            </select>
          </div>
          {formData.linkedKegProductId && (
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serving Size</label>
                <div className="flex gap-2">
                    <input type="number" name="servingSize" value={formData.servingSize} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required placeholder="e.g. 500" />
                    <select name="servingSizeUnit" value={formData.servingSizeUnit} onChange={handleChange} className="mt-1 block w-24 rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200">
                        {measureUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
             </div>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{product ? 'Save Changes' : 'Add Product'}</Button>
      </div>
    </form>
  );
};

const CategoryManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, newName: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}> = ({ isOpen, onClose, categories, products, addCategory, updateCategory, deleteCategory }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const handleAddCategory = async () => {
    if (newCategoryName.trim() !== '') {
      await addCategory(newCategoryName);
      setNewCategoryName('');
    }
  };
  
  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSaveEdit = async () => {
    if (editingCategoryId && editingCategoryName.trim()) {
      await updateCategory(editingCategoryId, editingCategoryName);
      handleCancelEdit();
    }
  };

  const handleDeleteClick = (category: Category) => {
    const isCategoryInUse = products.some(p => p.category === category.name);
    if (isCategoryInUse) {
      alert(`Cannot delete "${category.name}" as it is being used by one or more products.`);
      return;
    }
    setCategoryToDelete(category);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Add New Category</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="New category name..."
                className="flex-grow block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>Add</Button>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Existing Categories</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {categories.map(category => (
                <li key={category.id} className="flex justify-between items-center p-2 rounded-md bg-gray-100 dark:bg-dark-mode-blue-800">
                  {editingCategoryId === category.id ? (
                     <>
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-grow block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-900 dark:text-gray-200"
                        autoFocus
                      />
                      <div className="flex items-center space-x-1 ml-2">
                        <Button variant="primary" className="!p-1.5" onClick={handleSaveEdit}><FaCheck /></Button>
                        <Button variant="secondary" className="!p-1.5" onClick={handleCancelEdit}><FaTimes /></Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>{category.name}</span>
                      <div className="flex items-center space-x-1">
                        <Button variant="secondary" className="!p-1.5" onClick={() => handleStartEdit(category)}><FaPencilAlt /></Button>
                        <Button variant="danger" className="!p-1.5" onClick={() => handleDeleteClick(category)}><FaTrash /></Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {categories.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-4">No categories found.</p>}
          </div>
        </div>
        <div className="flex justify-end pt-6 mt-4 border-t dark:border-dark-mode-blue-800">
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
      />
    </>
  );
};

const normalizeUnit = (value: number, unit: MeasureUnit): number => {
    if (unit === 'L' || unit === 'kg') {
        return value * 1000;
    }
    return value; // ml or g
};

const Inventory: React.FC = () => {
  const location = useLocation();
  const { products, addProduct, updateProduct, deleteProduct, categories, addCategory, updateCategory, deleteCategory, storeSettings, kegInstances } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastInfo, setToastInfo] = useState({ show: false, message: '' });

  const showToast = (message: string) => {
    setToastInfo({ show: true, message });
  };


  useEffect(() => {
    if (location.state?.searchQuery) {
        setSearchQuery(location.state.searchQuery);
        // Clear the state from history so it doesn't reappear on refresh
        window.history.replaceState({}, document.title)
    }
  }, [location.state]);
  
  const productsWithDerivedInfo = useMemo(() => {
    return products.map(p => {
      let derivedStock: number | string = p.stock;
      let stockLabel: string;

      if (p.productType === 'Service') {
        if (p.linkedKegProductId && p.servingSize && p.servingSizeUnit) {
          const tappedKeg = kegInstances.find(k => k.productId === p.linkedKegProductId && k.status === 'Tapped');
          if (tappedKeg) {
            const normalizedServingSize = normalizeUnit(p.servingSize, p.servingSizeUnit);
            derivedStock = normalizedServingSize > 0 ? Math.floor(tappedKeg.currentVolume / normalizedServingSize) : Infinity;
            stockLabel = 'servings';
          } else {
            derivedStock = 0;
            stockLabel = 'No Keg Tapped';
          }
        } else {
          derivedStock = 'N/A';
          stockLabel = 'Service';
        }
      } else if (p.productType === 'Keg') {
        stockLabel = 'kegs';
      } else {
        stockLabel = 'units';
      }
      return { ...p, derivedStock, stockLabel };
    });
  }, [products, kegInstances]);

  const handleAddNew = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };
  
  const handleSave = async (productData: Product | Omit<Product, 'id'>) => {
    if ('id' in productData) {
        await updateProduct(productData as Product);
    } else {
        await addProduct(productData);
    }
  };

  const handleDelete = (productId: string) => {
    setProductToDelete(productId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
        await deleteProduct(productToDelete);
        setConfirmOpen(false);
        setProductToDelete(null);
    }
  };

  const filteredProducts = useMemo(() => {
      return productsWithDerivedInfo.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [productsWithDerivedInfo, searchQuery]);

  const handleGeneratePDF = async () => {
    if (filteredProducts.length === 0) {
      alert("There are no products to download in the current view.");
      return;
    }

    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;

    const tableColumns = ["Name", "Category", "Type", "Price (Ksh)", "Stock", "Threshold"];
    const tableRows = filteredProducts.map(p => {
        let stockDisplay = '';
        if (typeof p.derivedStock === 'number') {
            stockDisplay = `${isFinite(p.derivedStock) ? p.derivedStock : '∞'} ${p.stockLabel}`;
        } else {
            stockDisplay = p.stockLabel === 'Service' ? 'N/A' : p.stockLabel;
        }

        return [
            p.name,
            p.category,
            p.productType,
            p.price.toFixed(2),
            stockDisplay,
            p.productType === 'Service' ? 'N/A' : p.lowStockThreshold,
        ];
    });
    
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    // Header text is drawn before the table
    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    
    const reportDate = new Date().toLocaleString();
    const searchQueryText = searchQuery ? `Search Query: "${searchQuery}"` : "Showing all products";
    doc.text(reportDate, 14, 36);
    doc.text(searchQueryText, 14, 42);

    autoTable(doc, {
        startY: 48,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: '#ea5314' },
        margin: { top: 40 },
        didDrawPage: (data) => {
            // Header graphics are drawn on every page
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(storeSettings.storeName || '', 14, 10);
            doc.text(`${storeSettings.address || ''} | ${storeSettings.phone || ''}`, 14, 14);

            if (logoDataUrl) {
                try {
                    doc.addImage(logoDataUrl, pageWidth - 24, 8, 10, 10);
                } catch (e) {
                    console.error("Error adding store logo to PDF", e);
                }
            }
            
            // Footer
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            
            if (storeSettings.showPdfFooter) {
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
                    const footerTextLines = (storeSettings.pdfFooterText || '').split('\n');
                    doc.text(footerTextLines, textX, pageHeight - 13);
                }
            }
            
            doc.setFontSize(8); // Reset font for page number
            doc.setTextColor(150);
            doc.text(`Page ${data.pageNumber}`, pageWidth - 20, pageHeight - 10);
        }
    });

    doc.save(`jobiflow_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const getTypeBadge = (type: Product['productType']) => {
      const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
      if (type === 'Service') {
          return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200`;
      }
      if (type === 'Keg') {
          return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200`;
      }
      return `${base} bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
  }

  const handleDownloadTemplate = () => {
    const headers = [
        "name", "category", "price", "productType", 
        "stock", "lowStockThreshold", "kegCapacity", "kegCapacityUnit",
        "linkedKegProductId", "servingSize", "servingSizeUnit"
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "jobiflow_product_template.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
        showToast("Error: Please upload a valid .csv file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
          showToast("Error: CSV file must contain a header and at least one data row.");
          return;
        }

        const headers = lines[0].trim().split(',').map(h => h.trim());
        const requiredHeaders = ['name', 'category', 'price', 'productType'];
        const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
        if (missingHeaders.length > 0) {
            showToast(`Error: CSV is missing required headers: ${missingHeaders.join(', ')}`);
            return;
        }

        const productsToAdd: Omit<Product, 'id'>[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          const { name, category, price, productType, stock, lowStockThreshold, kegCapacity, kegCapacityUnit, linkedKegProductId, servingSize, servingSizeUnit } = rowData;

          if (!name || !category || !price || !productType) {
            errors.push(`Row ${i + 1}: Missing required fields (name, category, price, productType).`);
            continue;
          }

          const product: Omit<Product, 'id'> & { [key: string]: any } = {
            name,
            category,
            price: parseFloat(price),
            productType: productType as 'Stocked' | 'Service' | 'Keg',
            stock: productType === 'Service' ? 0 : parseInt(stock || '0'),
            lowStockThreshold: productType === 'Service' ? 0 : parseInt(lowStockThreshold || '10'),
          };

          if (isNaN(product.price) || (product.productType !== 'Service' && isNaN(product.stock)) || (product.productType !== 'Service' && isNaN(product.lowStockThreshold))) {
            errors.push(`Row ${i + 1}: Invalid number format for price, stock, or threshold for product "${name}".`);
            continue;
          }

          if (!['Stocked', 'Service', 'Keg'].includes(product.productType)) {
            errors.push(`Row ${i + 1}: Invalid productType for "${name}". Must be 'Stocked', 'Service', or 'Keg'.`);
            continue;
          }

          if (product.productType === 'Keg') {
            product.kegCapacity = parseFloat(kegCapacity);
            product.kegCapacityUnit = kegCapacityUnit as MeasureUnit;
            if (isNaN(product.kegCapacity) || !['ml', 'L', 'g', 'kg'].includes(product.kegCapacityUnit)) {
              errors.push(`Row ${i + 1}: Keg product "${name}" requires valid kegCapacity and kegCapacityUnit.`);
              continue;
            }
          }

          if (product.productType === 'Service' && linkedKegProductId) {
            product.linkedKegProductId = linkedKegProductId;
            product.servingSize = parseFloat(servingSize);
            product.servingSizeUnit = servingSizeUnit as MeasureUnit;
            if (isNaN(product.servingSize) || !['ml', 'L', 'g', 'kg'].includes(product.servingSizeUnit)) {
              errors.push(`Row ${i + 1}: Service product "${name}" linked to a keg requires valid servingSize and servingSizeUnit.`);
              continue;
            }
          }

          productsToAdd.push(product);
        }

        if (errors.length > 0) {
            showToast(`Import failed. ${errors.length} rows have errors. See console for details.`);
            console.error("CSV Import Errors:", errors);
        } else {
            productsToAdd.forEach(p => addProduct(p));
            showToast(`${productsToAdd.length} products imported successfully!`);
        }

      } catch (error) {
        showToast("An unexpected error occurred during import. Please check file format and console.");
        console.error(error);
      } finally {
        if(event.target) {
            event.target.value = ''; // Allow re-uploading the same file
        }
      }
    };
    reader.readAsText(file);
  };


  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">Product List</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
             <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full sm:w-64"
              />
            <Button onClick={() => setCategoryModalOpen(true)} variant="secondary" icon={<FaTags />} className="w-full sm:w-auto">Manage Categories</Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".csv" />
            <Button onClick={handleImportClick} variant="secondary" icon={<FaFileImport />}>Import</Button>
            <Button onClick={handleDownloadTemplate} variant="secondary" icon={<FaFileDownload />}>Template</Button>
            <Button onClick={handleAddNew} icon={<FaPlus />} className="w-full sm:w-auto">Add New Product</Button>
            <Button onClick={handleGeneratePDF} variant="secondary" icon={<FaFilePdf />} className="w-full sm:w-auto">Generate PDF</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left dark:text-gray-200">
            <thead className="border-b dark:border-dark-mode-blue-700">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Low Stock Threshold</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const stockValue = product.derivedStock;
                let stockDisplay;

                if (typeof stockValue === 'number') {
                    const isLowStock = (product.productType === 'Stocked' || product.productType === 'Keg') && stockValue <= product.lowStockThreshold;
                    const badgeColor = isLowStock ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
                    stockDisplay = (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                            {isFinite(stockValue) ? stockValue : '∞'} {product.stockLabel}
                        </span>
                    );
                } else {
                    stockDisplay = <span className="text-gray-400 dark:text-gray-500">{stockValue}</span>;
                }

                return (
                    <tr key={product.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="p-3">{product.category}</td>
                        <td className="p-3"><span className={getTypeBadge(product.productType)}>{product.productType}</span></td>
                        <td className="p-3">Ksh {product.price.toFixed(2)}</td>
                        <td className="p-3">{stockDisplay}</td>
                        <td className="p-3">{product.productType === 'Stocked' || product.productType === 'Keg' ? product.lowStockThreshold : <span className="text-gray-400 dark:text-gray-500">N/A</span>}</td>
                        <td className="p-3">
                            <div className="flex space-x-2">
                                <Button variant="secondary" className="!p-2" onClick={() => handleEdit(product)}><FaEdit /></Button>
                                <Button variant="danger" className="!p-2" onClick={() => handleDelete(product.id)}><FaTrash /></Button>
                            </div>
                        </td>
                    </tr>
                )
            })}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
            <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">No products found.</p>
            </div>
        )}
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
        <ProductForm 
          product={editingProduct}
          allProducts={products}
          onSave={handleSave}
          onClose={() => setModalOpen(false)} 
          categories={categories}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
      
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        products={products}
        addCategory={addCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />
      <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: ''})} />

    </>
  );
};

export default Inventory;