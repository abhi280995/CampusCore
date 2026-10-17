import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Edit2,
  Trash2,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Branch } from '../../types/erp';

export const SuperAdminDashboard: React.FC = () => {
  const {
    branches,
    users,
    createBranch,
    updateBranch,
    deleteBranch,
    createMainAdmin,
    switchUserById,
  } = useERP();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'branches' | 'main_admins'>('branches');

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form states
  const [branchForm, setBranchForm] = useState({
    code: '',
    name: '',
    description: '',
    headOfDepartment: '',
    totalSemesters: 8,
    divisions: 'A, B',
  });

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: branches[0]?.id || '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.code || !branchForm.name) return;

    const divisionsArray = branchForm.divisions
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        code: branchForm.code.toUpperCase(),
        name: branchForm.name,
        description: branchForm.description,
        headOfDepartment: branchForm.headOfDepartment,
        totalSemesters: Number(branchForm.totalSemesters),
        divisionsPerSemester: divisionsArray.length ? divisionsArray : ['A'],
      });
      showToast(`Branch "${branchForm.name}" updated successfully.`);
    } else {
      createBranch({
        code: branchForm.code.toUpperCase(),
        name: branchForm.name,
        description: branchForm.description,
        headOfDepartment: branchForm.headOfDepartment,
        totalSemesters: Number(branchForm.totalSemesters),
        divisionsPerSemester: divisionsArray.length ? divisionsArray : ['A', 'B'],
      });
      showToast(`New Branch "${branchForm.name}" created successfully.`);
    }

    setIsBranchModalOpen(false);
    setEditingBranch(null);
    setBranchForm({
      code: '',
      name: '',
      description: '',
      headOfDepartment: '',
      totalSemesters: 8,
      divisions: 'A, B',
    });
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.name || !adminForm.email || !adminForm.branchId) return;

    createMainAdmin({
      name: adminForm.name,
      email: adminForm.email,
      phone: adminForm.phone,
      branchId: adminForm.branchId,
    });

    const targetBranch = branches.find((b) => b.id === adminForm.branchId);
    showToast(
      `Main Admin ${adminForm.name} assigned to ${targetBranch?.name || 'Branch'} successfully.`
    );

    setIsAdminModalOpen(false);
    setAdminForm({
      name: '',
      email: '',
      phone: '',
      branchId: branches[0]?.id || '',
    });
  };

  // Metrics
  const mainAdmins = users.filter((u) => u.role === 'main_admin');
  const totalFaculty = users.filter((u) => u.role === 'teacher').length;
  const totalStudents = users.filter((u) => u.role === 'student').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Super Administrator Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional overview, multi-branch governance, and Main Admin credentials management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingBranch(null);
              setBranchForm({
                code: '',
                name: '',
                description: '',
                headOfDepartment: '',
                totalSemesters: 8,
                divisions: 'A, B',
              });
              setIsBranchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Create Main Admin
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-medium text-slate-400">Total Branches</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {branches.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Autonomous academic depts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-medium text-slate-400">Main Admins</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {mainAdmins.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">1 Assigned per branch</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-medium text-slate-400">Total Faculty</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {totalFaculty}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Teachers & class incharges</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-medium text-slate-400">Enrolled Students</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {totalStudents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active registered profiles</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`pb-3 px-1 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'branches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Branches & Departments ({branches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('main_admins')}
          className={`pb-3 px-1 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'main_admins'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Branch Main Admins ({mainAdmins.length})
        </button>
      </div>

      {/* Tab 1: Branches Directory */}
      {activeTab === 'branches' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">College Academic Branches</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each Main Admin manages only their assigned branch curriculum, teachers, and timetables.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Branch Name</th>
                  <th className="px-6 py-3">Head of Department</th>
                  <th className="px-6 py-3">Semesters / Divs</th>
                  <th className="px-6 py-3">Assigned Main Admin</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {branches.map((b) => {
                  const assignedAdmin = users.find(
                    (u) => u.role === 'main_admin' && (u.branchId === b.id || u.id === b.mainAdminId)
                  );
                  const branchStudents = users.filter(
                    (u) => u.role === 'student' && u.branchId === b.id
                  ).length;
                  const branchTeachers = users.filter(
                    (u) => u.role === 'teacher' && u.branchId === b.id
                  ).length;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {b.code}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {b.description}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-800 font-medium">
                        {b.headOfDepartment || 'Not designated'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono tabular-nums">{b.totalSemesters} Sems</span>
                        <span className="text-slate-300 mx-1.5">·</span>
                        <span>Divs: {b.divisionsPerSemester?.join(', ') || 'A'}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        {assignedAdmin ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{assignedAdmin.name}</span>
                            <button
                              type="button"
                              onClick={() => switchUserById(assignedAdmin.id)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                              title="Inspect as this Main Admin"
                            >
                              Login as <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBranch(b);
                              setBranchForm({
                                code: b.code,
                                name: b.name,
                                description: b.description || '',
                                headOfDepartment: b.headOfDepartment || '',
                                totalSemesters: b.totalSemesters || 8,
                                divisions: (b.divisionsPerSemester || ['A']).join(', '),
                              });
                              setIsBranchModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Branch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete branch "${b.name}"?`)) {
                                deleteBranch(b.id);
                                showToast(`Branch "${b.name}" removed.`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete Branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Main Admins Directory */}
      {activeTab === 'main_admins' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Main Administrators (Branch Heads)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each administrator is securely isolated to oversee their designated engineering department.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Main Admin
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Administrator Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Assigned Branch</th>
                  <th className="px-6 py-3 text-right">Switch Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {mainAdmins.map((admin) => {
                  const b = branches.find((branch) => branch.id === admin.branchId);
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {admin.name[0]}
                        </div>
                        {admin.name}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{admin.email}</td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono">{admin.phone || '-'}</td>
                      <td className="px-6 py-3.5">
                        {b ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="font-mono font-bold text-indigo-600">{b.code}</span>
                            <span>·</span>
                            <span>{b.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => switchUserById(admin.id)}
                          className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          Launch Branch Dashboard
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Branch */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingBranch ? 'Edit Academic Branch' : 'Create New Academic Branch'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBranchSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science & Engineering"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Head of Department (HOD)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Verma, Ph.D."
                  value={branchForm.headOfDepartment}
                  onChange={(e) => setBranchForm({ ...branchForm, headOfDepartment: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Total Semesters</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={branchForm.totalSemesters}
                    onChange={(e) => setBranchForm({ ...branchForm, totalSemesters: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Divisions (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. A, B"
                    value={branchForm.divisions}
                    onChange={(e) => setBranchForm({ ...branchForm, divisions: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={branchForm.description}
                  onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  placeholder="Academic scope, laboratory domains, etc."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Main Admin */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Create Main Admin (Branch Head)
              </h3>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Assigned Branch</label>
                <select
                  required
                  value={adminForm.branchId}
                  onChange={(e) => setAdminForm({ ...adminForm, branchId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Main Admin will have exclusive authority over this department.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sunita Rao"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin.ece@campuscore.edu"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98230 44556"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
