
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { FaShareAlt, FaWhatsapp, FaTimes } from 'react-icons/fa';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportFile: File | null;
  reportDate: Date | null;
  userName: string;
}

const ShareReportModal: React.FC<ShareReportModalProps> = ({ isOpen, onClose, reportFile, reportDate, userName }) => {
  
  const handleShare = async () => {
    // WhatsApp number provided by user
    const phoneNumber = '254707758004';
    const text = `Report for ${userName} on ${reportDate?.toLocaleDateString()}.`;

    if (navigator.share && reportFile) {
      try {
        await navigator.share({
          files: [reportFile],
          title: `Shift Report for ${userName}`,
          text: text
        });
      } catch (error) {
        console.error('Error sharing report:', error);
        // If sharing fails, still close the modal and log out
      } finally {
        onClose();
      }
    } else {
      // Fallback for browsers that don't support Web Share API with files
      const message = encodeURIComponent(text + "\n\n(Please attach the generated PDF report)");
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
      alert("Your device doesn't support direct file sharing. A WhatsApp chat has been opened. Please attach the report manually (it can be re-downloaded from the shift summary page later if needed).");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shift Ended - Share Report">
      <div className="text-center">
        <FaShareAlt className="mx-auto h-12 w-12 text-primary-cyan-500" />
        <h3 className="mt-2 text-lg font-medium dark:text-gray-100">Shift Report Generated</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your shift has been submitted for clearance. You can now share the detailed PDF report with management.
        </p>
      </div>
      <div className="mt-6 flex flex-col space-y-3">
        <Button onClick={handleShare} className="w-full !bg-[#25D366] hover:!bg-[#128C7E] text-white" icon={<FaWhatsapp />}>
          Share Report via WhatsApp
        </Button>
        <Button variant="secondary" onClick={onClose} className="w-full" icon={<FaTimes />}>
          Skip & Log Out
        </Button>
      </div>
    </Modal>
  );
};

export default ShareReportModal;
