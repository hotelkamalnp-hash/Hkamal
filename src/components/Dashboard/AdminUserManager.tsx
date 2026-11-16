import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { StaffUser, StaffRole } from '../../types/hotel';
import { 
  Users, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Plus, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useModalDismiss, ModalDismissButton } from '../Common/ModalDismissHandler';

export const AdminUserManager: React.FC = () => {
  const { 
    staff, 
    addStaff, 
    deleteStaff, 
    updateStaffCredentials, 
    resetAllHotelDataToDefault,
    showToast,
    addAuditLog 
  } = useHotel();

  const [showPasswords, setShowPasswords] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [confirmResetPending, setConfirmResetPending] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add User Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('KamalHotel@2026');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+977 98');
  const [role, setRole] = useState<StaffRole>('receptionist');
  const [department, setDepartment] = useState('Front Office & Concierge');

  // Edit Modal State
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('receptionist');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'on-leave' | 'inactive'>('active');

  useModalDismiss(isAddUserOpen, () => setIsAddUserOpen(false));
  useModalDismiss(Boolean(editingStaff), () => setEditingStaff(null));

  const handleStartEdit = (member: StaffUser) => {
    setEditingStaff(member);
    setEditUsername(member.username || '');
    setEditPassword(member.password || '');
    setEditName(member.name);
    setEditRole(member.role);
    setEditDepartment(member.department);
    setEditStatus(member.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    updateStaffCredentials(editingStaff.id, {
      username: editUsername.trim().toLowerCase(),
      password: editPassword,
      name: editName,
      role: editRole,
      department: editDepartment,
      status: editStatus,
    });

    setEditingStaff(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    let permissions = ['view_availability'];
    if (role === 'super_admin') {
      permissions = ['all_access', 'manage_staff', 'edit_cms', 'modify_rates', 'manage_bookings', 'manage_rooms', 'view_finances', 'view_audit_logs', 'supabase_sync'];
    } else if (role === 'admin') {
      permissions = ['edit_cms', 'modify_rates', 'manage_bookings', 'manage_rooms', 'view_finances', 'manage_coupons', 'process_checkin'];
    } else if (role === 'hotel_manager') {
      permissions = ['manage_bookings', 'manage_rooms', 'modify_rates', 'process_checkin', 'view_finances', 'view_audit_logs'];
    } else if (role === 'restaurant_owner') {
      permissions = ['manage_restaurant_pos', 'view_dining_revenue', 'manage_menu_specials', 'view_kot', 'manage_inventory'];
    } else if (role === 'receptionist') {
      permissions = ['process_checkin', 'manage_bookings', 'view_availability'];
    } else if (role === 'chef') {
      permissions = ['view_dining_orders', 'manage_menu_specials', 'view_breakfast_counts'];
    } else if (role === 'waiter') {
      permissions = ['view_dining_orders', 'room_service_dispatch', 'view_guest_preferences'];
    } else if (role === 'housekeeping') {
      permissions = ['manage_rooms_cleanliness', 'view_availability'];
    }

    addStaff({
      name,
      username: username.trim().toLowerCase(),
      password: password || 'KamalHotel@2026',
      email: email || `${username.trim().toLowerCase()}@kamalhotel.np`,
      phone,
      role,
      permissions,
      status: 'active',
      lastActive: 'Just created',
      department,
    });

    setName('');
    setUsername('');
    setPassword('KamalHotel@2026');
    setEmail('');
    setIsAddUserOpen(false);
  };

  const handleResetAll = () => {
    if (!confirmResetPending) {
      setConfirmResetPending(true);
      setTimeout(() => setConfirmResetPending(false), 5000);
      return;
    }
    setConfirmResetPending(false);
    resetAllHotelDataToDefault();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
              Admin Governance & Credential Balancer
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Super Admin master controls: balances all hotel staff usernames, passwords, access privileges, and system parameters to ensure frictionless operation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition cursor-pointer"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'Hide Passwords' : 'Show Passwords'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Staff User</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              confirmResetPending
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-200'
            }`}
            title="Reset system to clean demo slate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmResetPending ? 'Confirm Factory Reset?' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Staff User Directory Table */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
          Master Staff Credentials & Access Directory ({staff.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-700">
              <tr>
                <th className="py-2.5 px-3">Name & Department</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Contact Email / Phone</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-900 dark:text-stone-100">{member.name}</div>
                    <div className="text-[11px] text-stone-500">{member.department}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-amber-700 dark:text-amber-400">
                    {member.username}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {showPasswords ? (
                      <span className="font-semibold text-stone-900 dark:text-stone-100 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        {member.password || 'KamalHotel@2026'}
                      </span>
                    ) : (
                      <span className="text-stone-400">••••••••••</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        member.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-500">
                    <div>{member.email}</div>
                    <div>{member.phone}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(member)}
                        className="px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Edit credentials or reset password"
                      >
                        <Key className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>

                      {staff.length > 1 && member.role !== 'super_admin' && (
                        confirmDeleteId === member.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteStaff(member.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-1 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="p-1 rounded text-stone-400 hover:text-red-500 cursor-pointer"
                            title="Delete staff account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Credentials */}
      {editingStaff && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingStaff(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Key className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 truncate">
                  Edit Staff Credentials ({editingStaff.name})
                </h3>
              </div>
              <ModalDismissButton onClose={() => setEditingStaff(null)} ariaLabel="Close Edit Staff Modal" />
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Staff Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Username (Used for Login)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Password (Plaintext)
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as StaffRole)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="super_admin">Super Admin (All Privileges)</option>
                  <option value="admin">Hotel Admin (CMS, Rates & Rooms)</option>
                  <option value="hotel_manager">Hotel Manager</option>
                  <option value="restaurant_owner">Restaurant Owner (Dining POS & P&L)</option>
                  <option value="receptionist">Receptionist / Front Desk</option>
                  <option value="waiter">Waiter (POS & Dining)</option>
                  <option value="chef">Head Chef (KDS)</option>
                  <option value="housekeeping">Housekeeping Supervisor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="active">Active</option>
                  <option value="on-leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add User */}
      {isAddUserOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddUserOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                Create New Staff Account
              </h3>
              <ModalDismissButton onClose={() => setIsAddUserOpen(false)} ariaLabel="Close Create Staff Modal" />
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Tamang"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. maya"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value as StaffRole;
                    setRole(r);
                    if (r === 'receptionist') setDepartment('Front Office & Concierge');
                    else if (r === 'waiter') setDepartment('Restaurant & Banquet Service');
                    else if (r === 'chef') setDepartment('Culinary & Rooftop Restaurant');
                    else if (r === 'housekeeping') setDepartment('Housekeeping & Laundry');
                    else if (r === 'hotel_manager') setDepartment('Operations & Guest Relations');
                    else if (r === 'restaurant_owner') setDepartment('Rooftop Dining & Bar Ownership');
                    else if (r === 'admin') setDepartment('Hotel Administration & Customization');
                    else if (r === 'super_admin') setDepartment('Platform Ownership & IT');
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="receptionist">Receptionist / Front Desk</option>
                  <option value="waiter">Waiter (POS & Dining)</option>
                  <option value="chef">Head Chef (KDS)</option>
                  <option value="housekeeping">Housekeeping Supervisor</option>
                  <option value="restaurant_owner">Restaurant Owner</option>
                  <option value="hotel_manager">Hotel Manager</option>
                  <option value="admin">Hotel Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
