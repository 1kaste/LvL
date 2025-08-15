

import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { User } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import UserDetailsModal from '../components/common/UserDetailsModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { FaPlus, FaEye, FaTrash, FaUserShield } from 'react-icons/fa';

const getRoleColor = (role: User['role']) => {
    switch (role) {
        case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
        case 'Manager': return 'bg-primary-orange-100 text-primary-orange-800 dark:bg-primary-orange-900/50 dark:text-primary-orange-200';
        case 'Cashier': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        case 'Server/bartender': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    }
};

const getRoleIconColor = (role: User['role']) => {
    switch (role) {
        case 'Admin': return 'text-red-600 dark:text-red-400';
        case 'Manager': return 'text-primary-orange-600 dark:text-primary-orange-400';
        case 'Cashier': return 'text-green-600 dark:text-green-400';
        case 'Server/bartender': return 'text-blue-600 dark:text-blue-400';
    }
}

const Users: React.FC = () => {
    const { users, currentUser, addUser, updateUser, deleteUser, addUserDeduction, removeUserDeduction } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isUserDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const handleAddNewUser = () => {
        setSelectedUser(null);
        setUserDetailsModalOpen(true);
    };

    const handleViewUserDetails = (user: User) => {
        setSelectedUser(user);
        setUserDetailsModalOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
        }
    };

    const handleSaveUser = async (userData: Partial<User> & { id?: string }) => {
        try {
            if (userData.id && users.some(u => u.id === userData.id)) {
                await updateUser(userData as Partial<User> & { id: string });
            } else {
                await addUser({
                    name: userData.name!,
                    email: userData.email!,
                    role: userData.role!,
                    password: userData.password,
                    salaryAmount: userData.salaryAmount
                });
            }
        } catch (error: any) {
            const message = error.message || String(error);
            console.error("Failed to save user:", error);
            alert(`Error saving user: ${message}`);
        }
    };

    return (
        <>
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold">User Management</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <SearchInput
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full sm:w-64"
                        />
                        <Button onClick={handleAddNewUser} icon={<FaPlus />} className="w-full sm:w-auto">Add User</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left dark:text-gray-200">
                        <thead className="border-b dark:border-dark-mode-blue-700 dark:text-gray-400">
                            <tr>
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                                    <td className="p-3 font-medium flex items-center space-x-3">
                                        <img src={`https://i.pravatar.cc/40?u=${user.id}`} alt={user.name} className="w-8 h-8 rounded-full" />
                                        <span>{user.name}</span>
                                    </td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${getRoleColor(user.role)}`}>
                                            <FaUserShield className={`mr-2 ${getRoleIconColor(user.role)}`} />
                                            <span>{user.role}</span>
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex space-x-2">
                                            <Button variant="secondary" className="!p-2" onClick={() => handleViewUserDetails(user)} title="View & Edit Details"><FaEye /></Button>
                                            <Button variant="danger" className="!p-2" onClick={() => handleDeleteClick(user)} disabled={user.id === currentUser?.id || (currentUser?.role === 'Manager' && user.role === 'Admin')} title="Delete User"><FaTrash /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-500 dark:text-gray-400">No users found.</p>
                        </div>
                    )}
                </div>
            </Card>

            {isUserDetailsModalOpen && (
                <UserDetailsModal
                    isOpen={isUserDetailsModalOpen}
                    onClose={() => setUserDetailsModalOpen(false)}
                    user={selectedUser}
                    onSave={handleSaveUser}
                    onAddDeduction={addUserDeduction}
                    onRemoveDeduction={removeUserDeduction}
                />
            )}

            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete User"
                message={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
            />
        </>
    );
};

export default Users;