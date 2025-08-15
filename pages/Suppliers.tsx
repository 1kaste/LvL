import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { Supplier } from '../types';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SearchInput from '../components/common/SearchInput';
import { FaPlus, FaPhone, FaEnvelope, FaEdit, FaTrash, FaFilePdf } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter';

const SupplierForm: React.FC<{
  supplier?: Supplier | null;
  onSave: (supplierData: Supplier | Omit<Supplier, 'id'>) => Promise<void>;
  onClose: () => void;
}> = ({ supplier, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    paymentTerms: supplier?.paymentTerms || '',
    bankName: supplier?.bankName || '',
    bankAccountNumber: supplier?.bankAccountNumber || '',
    bankBranch: supplier?.bankBranch || '',
    mpesaPaybill: supplier?.mpesaPaybill || '',
    notes: supplier?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplier) {
      await onSave({ ...supplier, ...formData });
    } else {
      await onSave(formData);
    }
    onClose();
  };
  
  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClasses}>Supplier Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
      </div>
      <div>
        <label className={labelClasses}>Contact Person</label>
        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className={inputClasses} required />
      </div>
      <div>
        <label className={labelClasses}>Phone</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} required />
      </div>
      <div>
        <label className={labelClasses}>Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} required />
      </div>
       <div className="pt-4 mt-4 border-t dark:border-dark-mode-blue-700">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className={labelClasses}>Payment Terms</label>
                <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className={inputClasses} placeholder="e.g., Net 30" />
            </div>
            <div>
                <label className={labelClasses}>M-Pesa Paybill/Till</label>
                <input type="text" name="mpesaPaybill" value={formData.mpesaPaybill} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
                <label className={labelClasses}>Bank Name</label>
                <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
                <label className={labelClasses}>Bank Branch</label>
                <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleChange} className={inputClasses} />
            </div>
            <div className="md:col-span-2">
                <label className={labelClasses}>Bank Account Number</label>
                <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={inputClasses} />
            </div>
            <div className="md:col-span-2">
                <label className={labelClasses}>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClasses} />
            </div>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{supplier ? 'Save Changes' : 'Add Supplier'}</Button>
      </div>
    </form>
  );
};

const Suppliers: React.FC = () => {
  const location = useLocation();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, storeSettings } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');

  useEffect(() => {
    if (location.state?.searchQuery) {
        setSearchQuery(location.state.searchQuery);
        window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  const handleAddNew = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  };
  
  const handleSave = async (supplierData: Supplier | Omit<Supplier, 'id'>) => {
    if ('id' in supplierData) {
        await updateSupplier(supplierData as Supplier);
    } else {
        await addSupplier(supplierData);
    }
  };

  const handleDelete = (supplierId: string) => {
    setSupplierToDelete(supplierId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (supplierToDelete) {
        await deleteSupplier(supplierToDelete);
        setConfirmOpen(false);
        setSupplierToDelete(null);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  const handleGeneratePDF = async () => {
    if (filteredSuppliers.length === 0) {
      alert("There are no suppliers to download in the current view.");
      return;
    }

    const doc = new jsPDF();
    const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
    const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
        ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
        : null;

    const tableColumns = ["Name", "Contact Person", "Phone", "Email"];
    const tableRows = filteredSuppliers.map(s => [
        s.name,
        s.contactPerson,
        s.phone,
        s.email,
    ]);
    
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text("Suppliers Report", 14, 28);
    doc.setFontSize(11);
    doc.setTextColor(100);
    
    const reportDate = new Date().toLocaleString();
    const searchQueryText = searchQuery ? `Search Query: "${searchQuery}"` : "Showing all suppliers";
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
            // Header
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
            
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${data.pageNumber}`, pageWidth - 20, pageHeight - 10);
        }
    });

    doc.save(`jobiflow_suppliers_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">Suppliers</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or contact..."
              className="w-full sm:w-64"
            />
            <Button onClick={handleAddNew} icon={<FaPlus />} className="w-full sm:w-auto">Add Supplier</Button>
            <Button onClick={handleGeneratePDF} variant="secondary" icon={<FaFilePdf />} className="w-full sm:w-auto">Generate PDF</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left dark:text-gray-200">
            <thead className="border-b dark:border-dark-mode-blue-700 dark:text-gray-400">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">Contact Info</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                  <td className="p-3 font-medium">{supplier.name}</td>
                  <td className="p-3">{supplier.contactPerson}</td>
                  <td className="p-3">
                    <div className="flex flex-col space-y-1">
                      <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 hover:text-primary-orange-500"><FaPhone /> {supplier.phone}</a>
                      <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 hover:text-primary-orange-500"><FaEnvelope /> {supplier.email}</a>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                        <Button variant="secondary" className="!p-2" onClick={() => handleEdit(supplier)}><FaEdit /></Button>
                        <Button variant="danger" className="!p-2" onClick={() => handleDelete(supplier.id)}><FaTrash /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No suppliers found.</p>
            </div>
          )}
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}>
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
      />
    </>
  );
};

export default Suppliers;