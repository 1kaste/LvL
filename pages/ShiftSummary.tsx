import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FaFilePdf, FaCheck, FaTimes, FaExclamationCircle, FaUser, FaCalendarDay, FaCashRegister, FaBalanceScale, FaClock } from 'react-icons/fa';
import { convertImageToDataUrl } from '../utils/imageConverter.ts';
import RejectionReasonModal from '../components/common/RejectionReasonModal';
import { TimeLog } from '../types';


const toYYYYMMDD = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // Adjust for timezone
    return d.toISOString().split('T')[0];
};

const formatTime = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold';
    if (status.includes('Completed')) return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200`;
    if (status.includes('Ongoing')) return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200`;
    if (status.includes('Pending')) return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200`;
    if (status.includes('Late')) return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200`;
    if (status.includes('Awaiting')) return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200`;
    if (status.includes('Missed')) return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200`;
    if (status.includes('Rejected')) return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200`;
    if (status.includes('Upcoming')) return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    return baseClasses;
};

type ProcessedShift = {
    id: string;
    userId: string;
    userName: string;
    date: string;
    isScheduled: boolean;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    actualClockIn?: Date;
    actualClockOut?: Date;
    hoursWorked?: number;
    status: string;
    isLate: boolean;
    difference?: number;
    logId?: string;
    rejectionReason?: string;
};

const ShiftSummary: React.FC = () => {
    const { scheduledShifts, timeLogs, users, storeSettings, approveShift, rejectShift, currentUser } = useData();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [rejectionModalState, setRejectionModalState] = useState({ isOpen: false, timeLogId: null as string | null });
    const [countedAmounts, setCountedAmounts] = useState<Record<string, string>>({});
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const canManage = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Manager');

    const pendingApprovals = useMemo(() => {
        if (!canManage) return [];
        return timeLogs
            .filter(log => log.status === 'Pending Approval')
            .sort((a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime());
    }, [timeLogs, canManage]);
    
    const activeShifts = useMemo(() => {
        return timeLogs
            .filter(log => log.status === 'Ongoing')
            .map(log => {
                const shiftDay = new Date(log.clockInTime);
                const schedule = scheduledShifts.find(s => s.userId === log.userId && s.date === toYYYYMMDD(shiftDay));
                let isLate = false;
                if (schedule) {
                    const shiftStart = new Date(`${schedule.date}T${schedule.startTime}`);
                    const lateTime = new Date(shiftStart.getTime() + 5 * 60000); // 5 min grace
                    if (new Date(log.clockInTime) > lateTime) {
                        isLate = true;
                    }
                }
                return { ...log, isLate };
            })
            .sort((a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime());
    }, [timeLogs, scheduledShifts]);

    const processedShifts = useMemo((): ProcessedShift[] => {
        const dateStr = toYYYYMMDD(selectedDate);
        const workedLogIds = new Set<string>();

        // 1. Process all logs for the selected date and user
        const logsForDay = timeLogs.filter(log => {
            const logDateStr = toYYYYMMDD(new Date(log.clockInTime));
            const userMatch = selectedUserId === 'all' || log.userId === selectedUserId;
            return logDateStr === dateStr && userMatch && log.status !== 'Ongoing';
        });

        const shiftsFromLogs: ProcessedShift[] = logsForDay.map(log => {
            workedLogIds.add(log.id);
            const schedule = scheduledShifts.find(s => s.userId === log.userId && s.date === dateStr);
            let isLate = false;
            if (schedule) {
                const shiftStart = new Date(`${schedule.date}T${schedule.startTime}`);
                const lateTime = new Date(shiftStart.getTime() + 5 * 60000);
                isLate = new Date(log.clockInTime) > lateTime;
            }

            return {
                id: log.id,
                userId: log.userId,
                userName: log.userName || 'Unknown User',
                date: dateStr,
                isScheduled: !!schedule,
                scheduledStartTime: schedule?.startTime,
                scheduledEndTime: schedule?.endTime,
                actualClockIn: log.clockInTime,
                actualClockOut: log.clockOutTime,
                hoursWorked: log.durationHours,
                status: isLate ? `${log.status} (Late)` : log.status,
                isLate,
                difference: log.difference,
                logId: log.id,
                rejectionReason: log.rejectionReason,
            };
        });

        // 2. Find scheduled shifts for that day that were NOT worked
        const unworkedSchedules = scheduledShifts.filter(s => {
            const userMatch = selectedUserId === 'all' || s.userId === selectedUserId;
            if (s.date !== dateStr || !userMatch) return false;

            // Check if there's any log for this user on this day
            return !timeLogs.some(log => log.userId === s.userId && toYYYYMMDD(new Date(log.clockInTime)) === dateStr);
        });

        const shiftsFromSchedules: ProcessedShift[] = unworkedSchedules.map(shift => {
            const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
            const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
            const now = new Date();
            let status = 'Upcoming';
            if (now > shiftEnd) status = 'Missed';
            else if (now > shiftStart) status = 'Awaiting Clock-In';
            
            return {
                id: shift.id,
                userId: shift.userId,
                userName: shift.userName,
                date: shift.date,
                isScheduled: true,
                scheduledStartTime: shift.startTime,
                scheduledEndTime: shift.endTime,
                status,
                isLate: false
            };
        });
        
        return [...shiftsFromLogs, ...shiftsFromSchedules].sort((a,b) => (a.scheduledStartTime || a.actualClockIn?.toLocaleTimeString() || '').localeCompare(b.scheduledStartTime || b.actualClockIn?.toLocaleTimeString() || ''));
    }, [timeLogs, scheduledShifts, selectedDate, selectedUserId]);
    
    const getStatusText = (shift: ProcessedShift): string => {
        return shift.status;
    };

    const handleRejectShift = (reason: string) => {
        if(rejectionModalState.timeLogId && currentUser) {
            rejectShift(rejectionModalState.timeLogId, reason);
        }
        setRejectionModalState({ isOpen: false, timeLogId: null });
    };

    const handleGeneratePDF = async () => {
        if (processedShifts.length === 0) {
          alert("There are no shifts to download for the current selection.");
          return;
        }
        
        const doc = new jsPDF();
        const logoDataUrl = await convertImageToDataUrl(storeSettings.logoUrl);
        const footerLogoDataUrl = (storeSettings.showPdfFooter && storeSettings.pdfFooterLogoUrl) 
            ? await convertImageToDataUrl(storeSettings.pdfFooterLogoUrl) 
            : null;

        const tableColumns = ["Employee", "Scheduled", "Clock In/Out", "Hours", "Status", "Difference (Ksh)"];

        const tableRows = processedShifts.map(shift => [
            shift.userName,
            shift.isScheduled ? `${shift.scheduledStartTime} - ${shift.scheduledEndTime}` : 'Unscheduled',
            `${formatTime(shift.actualClockIn)} - ${formatTime(shift.actualClockOut)}`,
            shift.hoursWorked ? shift.hoursWorked.toFixed(2) : 'N/A',
            getStatusText(shift),
            typeof shift.difference === 'number' ? shift.difference.toFixed(2) : 'N/A'
        ]);
        
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

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

        doc.setFontSize(18);
        doc.text("Shift Summary Report", 14, 28);
        doc.setFontSize(11);
        doc.setTextColor(100);

        const selectedUser = users.find(u => u.id === selectedUserId);
        const filterText = `For Date: ${selectedDate.toLocaleDateString()} | Employee: ${selectedUser ? selectedUser.name : 'All Employees'}`;
        doc.text(filterText, 14, 36);

        autoTable(doc, {
            startY: 42,
            head: [tableColumns],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: '#ea5314' },
            didDrawPage: (data) => {
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

        const fileName = `jobiflow_shifts_${toYYYYMMDD(selectedDate)}_${
            selectedUserId === 'all' ? 'all' : users.find(u => u.id === selectedUserId)?.name.replace(/\s+/g, '') || 'user'
        }.pdf`;
        doc.save(fileName);
    };

    return (
        <div className="space-y-6">
        {canManage && pendingApprovals.length > 0 && (
            <Card className="mb-6 border-2 border-primary-orange-500 bg-primary-orange-50 dark:bg-primary-orange-900/20">
                <h2 className="text-xl font-bold mb-4 text-primary-orange-700 dark:text-primary-orange-300 flex items-center gap-2">
                    <FaExclamationCircle/> Pending Shift Clearances ({pendingApprovals.length})
                </h2>
                <div className="space-y-4">
                    {pendingApprovals.map(log => {
                        const totalSales = (log.expectedSales?.cash ?? 0) + (log.expectedSales?.card ?? 0) + (log.expectedSales?.mpesa ?? 0);
                        const countedAmountStr = countedAmounts[log.id] ?? '';
                        const countedAmountNum = parseFloat(countedAmountStr) || 0;
                        const finalDifference = countedAmountStr === '' ? 0 : countedAmountNum - (log.expectedSales?.cash ?? 0);
                        const finalDiffColor = finalDifference < 0 ? 'text-red-500' : finalDifference > 0 ? 'text-green-500' : 'text-gray-500 dark:text-gray-400';
                        
                        return (
                            <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 p-4 rounded-lg bg-white dark:bg-dark-mode-blue-900/50 shadow-md">
                                <div className="md:col-span-3 flex flex-col justify-center border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6 border-gray-200 dark:border-dark-mode-blue-700">
                                    <div className="flex items-center gap-2">
                                        <FaUser className="text-gray-400"/>
                                        <p className="font-bold text-lg">{log.userName}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        <FaCalendarDay />
                                        <span>{log.clockOutTime ? new Date(log.clockOutTime).toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="md:col-span-4 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6 border-gray-200 dark:border-dark-mode-blue-700">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><FaCashRegister /> Sales Summary</h4>
                                    <div className="flex justify-between text-base font-bold mb-2">
                                        <span>Total Sales</span>
                                        <span className="font-mono">Ksh {totalSales.toFixed(2)}</span>
                                    </div>
                                    <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                        <li className="flex justify-between"><span>Cash:</span> <span className="font-mono">Ksh {log.expectedSales?.cash.toFixed(2)}</span></li>
                                        <li className="flex justify-between"><span>Card:</span> <span className="font-mono">Ksh {log.expectedSales?.card.toFixed(2)}</span></li>
                                        <li className="flex justify-between"><span>M-Pesa:</span> <span className="font-mono">Ksh {log.expectedSales?.mpesa.toFixed(2)}</span></li>
                                    </ul>
                                </div>
                                <div className="md:col-span-3">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><FaBalanceScale /> Cash Reconciliation</h4>
                                     <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                        <li className="flex justify-between"><span>Expected Cash:</span> <span className="font-mono">Ksh {log.expectedSales?.cash.toFixed(2)}</span></li>
                                        <li className="flex justify-between text-gray-500"><span>Declared by Cashier:</span> <span className="font-mono">Ksh {log.declaredAmount?.toFixed(2)}</span></li>
                                    </ul>
                                    <div className="my-3">
                                        <label htmlFor={`counted-${log.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Actual Amount Counted</label>
                                        <input
                                            type="number"
                                            id={`counted-${log.id}`}
                                            value={countedAmountStr}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                    setCountedAmounts(prev => ({...prev, [log.id]: value}));
                                                }
                                            }}
                                            className="mt-1 block w-full text-lg p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-white dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-dark-mode-blue-700 mt-2 pt-2 flex justify-between text-base font-bold">
                                         <span>Final Difference:</span>
                                         <span className={`font-mono ${finalDiffColor}`}>Ksh {finalDifference.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2 flex items-center justify-center md:justify-end gap-3">
                                    <Button
                                        onClick={() => currentUser && approveShift(log.id, currentUser.name, countedAmountNum)}
                                        variant="primary"
                                        className="!p-2 rounded-full"
                                        title="Approve"
                                        disabled={countedAmountStr === ''}
                                    >
                                        <FaCheck size={16}/>
                                    </Button>
                                    <Button onClick={() => setRejectionModalState({ isOpen: true, timeLogId: log.id })} variant="danger" className="!p-2 rounded-full" title="Reject">
                                        <FaTimes size={16}/>
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>
        )}
        
        {activeShifts.length > 0 && (
            <Card className="mb-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FaClock className="text-blue-500" /> Currently Active Shifts
                </h2>
                <div className="space-y-3">
                    {activeShifts.map(log => (
                        <div key={log.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-3 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <img src={`https://i.pravatar.cc/40?u=${log.userId}`} alt={log.userName} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold">{log.userName}</p>
                                      {log.isLate && <span className={getStatusBadge('Late')}>Late</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Clocked in at: {formatTime(log.clockInTime)}</p>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="font-semibold text-lg font-mono text-blue-600 dark:text-blue-400">
                                    {formatDuration(now.getTime() - new Date(log.clockInTime).getTime())}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Shift Duration</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        )}
        
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold">Historical Shift Log</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <label htmlFor="shift-user" className="font-semibold text-sm">Employee:</label>
                        <select
                            id="shift-user"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 bg-gray-50 dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500 text-sm"
                        >
                            <option value="all">All Employees</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <label htmlFor="shift-date" className="font-semibold text-sm">Date:</label>
                        <input
                            type="date"
                            id="shift-date"
                            value={toYYYYMMDD(selectedDate)}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 bg-gray-50 dark:bg-dark-mode-blue-800 focus:ring-primary-orange-500 focus:border-primary-orange-500 text-sm"
                        />
                    </div>
                     <Button onClick={handleGeneratePDF} variant="secondary" icon={<FaFilePdf />} className="!py-2">
                        Generate PDF
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left dark:text-gray-200">
                    <thead className="border-b dark:border-dark-mode-blue-700 dark:text-gray-400">
                        <tr>
                            <th className="p-3">Employee</th>
                            <th className="p-3">Scheduled</th>
                            <th className="p-3">Actual Time</th>
                            <th className="p-3">Hours</th>
                            <th className="p-3 text-right">Shortage/Surplus</th>
                            <th className="p-3">Status</th>
                            {canManage && <th className="p-3">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {processedShifts.map(shift => (
                            <tr key={shift.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                                <td className="p-3 font-medium">{shift.userName}</td>
                                <td className="p-3">{shift.isScheduled ? `${shift.scheduledStartTime} - ${shift.scheduledEndTime}` : <span className="italic text-gray-500">Unscheduled</span>}</td>
                                <td className="p-3">{formatTime(shift.actualClockIn)} - {formatTime(shift.actualClockOut)}</td>
                                <td className="p-3">{shift.hoursWorked ? shift.hoursWorked.toFixed(2) : 'N/A'}</td>
                                <td className="p-3 text-right font-semibold">
                                    {typeof shift.difference === 'number' ? (
                                        <span className={
                                            shift.difference < 0 ? 'text-red-500' :
                                            shift.difference > 0 ? 'text-green-500' :
                                            'text-gray-500 dark:text-gray-400'
                                        }>
                                            {shift.difference.toFixed(2)}
                                        </span>
                                    ) : 'N/A'}
                                </td>
                                <td className="p-3">
                                    <span className={getStatusBadge(getStatusText(shift))}>
                                        {getStatusText(shift)}
                                    </span>
                                    {shift.status.includes('Rejected') && shift.rejectionReason && (
                                        <p className="text-xs text-red-500 mt-1 italic">"{shift.rejectionReason}"</p>
                                    )}
                                </td>
                                {canManage && (
                                <td className="p-3">
                                    {shift.status.includes('Pending Approval') && shift.logId && currentUser && (
                                        <div className="flex gap-2">
                                            <Button
                                              onClick={() => approveShift(shift.logId!, currentUser.name, parseFloat(countedAmounts[shift.logId!] || '0'))}
                                              variant="primary"
                                              className="!p-1.5"
                                              disabled={!countedAmounts[shift.logId!]}
                                            >
                                                <FaCheck/>
                                            </Button>
                                            <Button onClick={() => setRejectionModalState({ isOpen: true, timeLogId: shift.logId! })} variant="danger" className="!p-1.5"><FaTimes/></Button>
                                        </div>
                                    )}
                                </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {processedShifts.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">No shifts found for the current selection.</p>
                    </div>
                )}
            </div>
        </Card>
        <RejectionReasonModal
            isOpen={rejectionModalState.isOpen}
            onClose={() => setRejectionModalState({isOpen: false, timeLogId: null})}
            onConfirm={handleRejectShift}
        />
        </div>
    );
};

export default ShiftSummary;