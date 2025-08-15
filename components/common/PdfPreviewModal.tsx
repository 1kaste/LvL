
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import type { jsPDF } from 'jspdf'; // Using type import

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: jsPDF | null;
  title: string;
  fileName: string;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ isOpen, onClose, doc, title, fileName }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doc) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Cleanup function to revoke the object URL when the modal is closed or component unmounts
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc || !pdfUrl) return null;

  const handleDownload = () => {
    doc.save(fileName);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="w-full h-[70vh] bg-gray-200 dark:bg-gray-800">
        <iframe src={pdfUrl} width="100%" height="100%" title={title} style={{ border: 'none' }} />
      </div>
      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t dark:border-dark-mode-blue-700">
        <Button variant="secondary" onClick={onClose}>Close Preview</Button>
        <Button onClick={handleDownload}>Download PDF</Button>
      </div>
    </Modal>
  );
};

export default PdfPreviewModal;
