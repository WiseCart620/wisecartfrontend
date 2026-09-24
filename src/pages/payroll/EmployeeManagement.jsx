import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Search, X, User, UserCheck, UserX, CalendarClock, Trash2, Wallet } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import EmployeeCompensationModal from '../../components/payroll/EmployeeCompensationModal';
import { api } from '../../services/api';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import Pagination from '../../components/common/Pagination';
import { useAuth, can } from '../../context/AuthContext';

const EMPTY_FORM = {
    firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
    email: '', phone: '', address: '', hireDate: '', status: 'ACTIVE',
    department: '', designation: '', employmentType: 'REGULAR', workLocation: '',
    supervisorId: '', scheduleId: '',
    tinNumber: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '', taxStatus: '',
    paymentMode: 'BANK_TRANSFER', bankName: '', accountNumber: '', accountHolderName: '', basicSalary: '',
};

const EMPTY_SCHEDULE = { scheduleName: '', payFrequency: 'SEMI_MONTHLY', firstCutoffDay: 15, secondCutoffDay: 30, payDelayDays: 0 };

const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition';

const Field = ({ label, required, children, className = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const Section = ({ title, children }) => (
    <section>
        <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-blue-600 rounded-full" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 rounded-xl p-5 border border-gray-100">
            {children}
        </div>
    </section>
);

const EmployeeManagement = () => {
    const { user } = useAuth();
    const canCreate = can(user, 'employees', 'create');
    const canEdit = can(user, 'employees', 'edit');
    const canDelete = can(user, 'employees', 'delete');

    const [employees, setEmployees] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [compEmployee, setCompEmployee] = useState(null);


    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE);
    const [editingSchedule, setEditingSchedule] = useState(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [empRes, schRes] = await Promise.all([api.get('/employees'), api.get('/pay-schedules')]);
            setEmployees(empRes.success ? empRes.data || [] : []);
            setSchedules(schRes.success ? schRes.data || [] : []);
            if (!empRes.success) toast.error(empRes.error || 'Failed to load employees');
        } catch (e) {
            console.error(e);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const loadSchedules = async () => {
        const res = await api.get('/pay-schedules');
        if (res.success) setSchedules(res.data || []);
    };

    const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, scheduleId: schedules[0]?.scheduleId ?? '' });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditing(emp);
        const next = { ...EMPTY_FORM };
        Object.keys(EMPTY_FORM).forEach(k => { next[k] = emp[k] ?? ''; });
        setForm(next);
        setShowModal(true);
    };

    const buildPayload = () => {
        const p = {};
        Object.entries(form).forEach(([k, v]) => { p[k] = v === '' ? null : v; });
        p.scheduleId = form.scheduleId ? Number(form.scheduleId) : null;
        p.supervisorId = form.supervisorId ? Number(form.supervisorId) : null;
        p.basicSalary = form.basicSalary !== '' ? Number(form.basicSalary) : null;
        return p;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.firstName || !form.lastName || !form.email || !form.hireDate) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (!form.scheduleId) {
            toast.error('Please select a pay schedule (create one first if none exist)');
            return;
        }
        setActionLoading(true);
        setLoadingMessage(editing ? 'Updating employee...' : 'Creating employee...');
        try {
            if (editing) {
                await api.put(`/employees/${editing.employeeId}`, buildPayload());
                toast.success('Employee updated');
            } else {
                await api.post('/employees', buildPayload());
                toast.success('Employee created');
            }
            setShowModal(false);
            await loadAll();
        } catch (err) {
            toast.error(err.message || 'Failed to save employee');
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    const toggleStatus = async (emp) => {
        const active = emp.status === 'ACTIVE';
        if (!window.confirm(`${active ? 'Deactivate' : 'Activate'} ${emp.fullName}?`)) return;
        setActionLoading(true);
        setLoadingMessage('Updating status...');
        try {
            await api.patch(`/employees/${emp.employeeId}/toggle-status`);
            toast.success('Status updated');
            await loadAll();
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    // ---- schedules
    const saveSchedule = async (e) => {
        e.preventDefault();
        if (!scheduleForm.scheduleName || !scheduleForm.payFrequency) {
            toast.error('Name and frequency are required');
            return;
        }
        const payload = { ...scheduleForm };
        try {
            if (editingSchedule) {
                await api.put(`/pay-schedules/${editingSchedule.scheduleId}`, payload);
                toast.success('Schedule updated');
            } else {
                await api.post('/pay-schedules', payload);
                toast.success('Schedule created');
            }
            setScheduleForm(EMPTY_SCHEDULE);
            setEditingSchedule(null);
            loadSchedules();
        } catch (err) {
            toast.error(err.message || 'Failed to save schedule');
        }
    };

    const deleteSchedule = async (s) => {
        if (!window.confirm(`Delete schedule "${s.scheduleName}"?`)) return;
        try {
            await api.delete(`/pay-schedules/${s.scheduleId}`);
            toast.success('Schedule deleted');
            loadSchedules();
        } catch (err) {
            toast.error(err.message || 'Failed to delete schedule');
        }
    };

    // ---- list
    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return employees.filter(e =>
            (statusFilter === 'ALL' || e.status === statusFilter) &&
            (!q ||
                e.fullName?.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q) ||
                e.designation?.toLowerCase().includes(q))
        );
    }, [employees, searchTerm, statusFilter]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const last = currentPage * itemsPerPage;
    const first = last - itemsPerPage;
    const pageItems = filtered.slice(first, last);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const money = (v) => (v == null ? '—' :
        new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingOverlay show={true} message="Loading employees..." />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <LoadingOverlay show={actionLoading} message={loadingMessage} />
            <Toaster position="top-right" />

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
                <p className="text-gray-600 mt-1">Manage employee records, pay schedules, and payroll setup</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, department, or designation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                    <CalendarClock size={18} /> Pay Schedules
                </button>
                {canCreate && (
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus size={20} /> Add Employee
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Employee', 'Department / Position', 'Schedule', 'Basic Salary', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pageItems.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No employees found</td></tr>
                            ) : pageItems.map(emp => (
                                <tr key={emp.employeeId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg"><User size={20} className="text-blue-600" /></div>
                                            <div>
                                                <div className="font-medium text-gray-900">{emp.fullName}</div>
                                                <div className="text-sm text-gray-500">{emp.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div>{emp.department || '—'}</div>
                                        <div className="text-gray-500">{emp.designation || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{emp.scheduleName || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{money(emp.basicSalary)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {emp.status === 'ACTIVE' ? <UserCheck size={12} /> : <UserX size={12} />}
                                            {emp.status === 'ACTIVE' ? 'Active' : emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setCompEmployee(emp)} title="Compensation" className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">
                                                <Wallet size={18} />
                                            </button>
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => openEdit(emp)} title="Edit" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(emp)}
                                                        title={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                        className={`p-2 rounded-lg ${emp.status === 'ACTIVE' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                                                    >
                                                        {emp.status === 'ACTIVE' ? <UserX size={18} /> : <UserCheck size={18} />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onNextPage={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        onPrevPage={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        showingStart={first + 1}
                        showingEnd={Math.min(last, filtered.length)}
                        totalItems={filtered.length}
                    />
                )}
            </div>

            {/* Employee modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
                            <div className="flex-shrink-0 border-b border-gray-200 px-8 py-5 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {editing ? `Edit ${editing.fullName}` : 'Add Employee'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <form id="employee-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                                <Section title="Personal Information">
                                    <Field label="First Name" required><input className={inputCls} name="firstName" value={form.firstName} onChange={onChange} required /></Field>
                                    <Field label="Middle Name"><input className={inputCls} name="middleName" value={form.middleName} onChange={onChange} /></Field>
                                    <Field label="Last Name" required><input className={inputCls} name="lastName" value={form.lastName} onChange={onChange} required /></Field>
                                    <Field label="Gender">
                                        <select className={inputCls} name="gender" value={form.gender} onChange={onChange}>
                                            <option value="">Select...</option>
                                            <option value="MALE">Male</option>
                                            <option value="FEMALE">Female</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </Field>
                                    <Field label="Date of Birth"><input type="date" className={inputCls} name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} /></Field>
                                    <Field label="Email" required><input type="email" className={inputCls} name="email" value={form.email} onChange={onChange} required /></Field>
                                    <Field label="Phone"><input className={inputCls} name="phone" value={form.phone} onChange={onChange} /></Field>
                                    <Field label="Address"><input className={inputCls} name="address" value={form.address} onChange={onChange} /></Field>
                                </Section>

                                <Section title="Job Details">
                                    <Field label="Hire Date" required><input type="date" className={inputCls} name="hireDate" value={form.hireDate} onChange={onChange} required /></Field>
                                    <Field label="Status">
                                        <select className={inputCls} name="status" value={form.status} onChange={onChange}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </Field>
                                    <Field label="Department"><input className={inputCls} name="department" value={form.department} onChange={onChange} /></Field>
                                    <Field label="Designation"><input className={inputCls} name="designation" value={form.designation} onChange={onChange} /></Field>
                                    <Field label="Employment Type">
                                        <select className={inputCls} name="employmentType" value={form.employmentType} onChange={onChange}>
                                            <option value="REGULAR">Regular</option>
                                            <option value="PROBATIONARY">Probationary</option>
                                            <option value="CONTRACTUAL">Contractual</option>
                                            <option value="PART_TIME">Part-time</option>
                                        </select>
                                    </Field>
                                    <Field label="Work Location"><input className={inputCls} name="workLocation" value={form.workLocation} onChange={onChange} /></Field>
                                    <Field label="Supervisor">
                                        <select className={inputCls} name="supervisorId" value={form.supervisorId} onChange={onChange}>
                                            <option value="">None</option>
                                            {employees.filter(e => e.employeeId !== editing?.employeeId).map(e => (
                                                <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Pay Schedule" required>
                                        <select className={inputCls} name="scheduleId" value={form.scheduleId} onChange={onChange} required>
                                            <option value="">Select schedule...</option>
                                            {schedules.map(s => <option key={s.scheduleId} value={s.scheduleId}>{s.scheduleName} ({s.payFrequency})</option>)}
                                        </select>
                                    </Field>
                                </Section>

                                <Section title="Statutory Numbers">
                                    <Field label="TIN"><input className={inputCls} name="tinNumber" value={form.tinNumber} onChange={onChange} /></Field>
                                    <Field label="SSS Number"><input className={inputCls} name="sssNumber" value={form.sssNumber} onChange={onChange} /></Field>
                                    <Field label="PhilHealth Number"><input className={inputCls} name="philhealthNumber" value={form.philhealthNumber} onChange={onChange} /></Field>
                                    <Field label="Pag-IBIG Number"><input className={inputCls} name="pagibigNumber" value={form.pagibigNumber} onChange={onChange} /></Field>
                                    <Field label="Tax Status"><input className={inputCls} name="taxStatus" value={form.taxStatus} onChange={onChange} placeholder="e.g. S, ME1" /></Field>
                                </Section>

                                <Section title="Salary & Payment">
                                    <Field label="Basic Salary (monthly)"><input type="number" min="0" step="0.01" className={inputCls} name="basicSalary" value={form.basicSalary} onChange={onChange} /></Field>
                                    <Field label="Payment Mode">
                                        <select className={inputCls} name="paymentMode" value={form.paymentMode} onChange={onChange}>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="CASH">Cash</option>
                                            <option value="CHECK">Check</option>
                                        </select>
                                    </Field>
                                    <Field label="Bank Name"><input className={inputCls} name="bankName" value={form.bankName} onChange={onChange} /></Field>
                                    <Field label="Account Number"><input className={inputCls} name="accountNumber" value={form.accountNumber} onChange={onChange} /></Field>
                                    <Field label="Account Holder Name" className="md:col-span-2"><input className={inputCls} name="accountHolderName" value={form.accountHolderName} onChange={onChange} /></Field>
                                </Section>
                            </form>

                            <div className="flex-shrink-0 border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                                <button type="submit" form="employee-form" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                    {editing ? 'Save Changes' : 'Create Employee'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                compEmployee && (
                    <EmployeeCompensationModal
                        employee={compEmployee}
                        canEdit={canEdit}
                        onClose={() => setCompEmployee(null)}
                    />
                )
            }

            {/* Pay schedule modal */}
            {
                showScheduleModal && (
                    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Pay Schedules</h2>
                                <button onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); setScheduleForm(EMPTY_SCHEDULE); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="border border-gray-200 rounded-lg divide-y">
                                    {schedules.length === 0 && <p className="p-4 text-sm text-gray-500">No schedules yet. Create one below.</p>}
                                    {schedules.map(s => (
                                        <div key={s.scheduleId} className="p-3 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm">{s.scheduleName}</div>
                                                <div className="text-xs text-gray-500">
                                                    {s.payFrequency}
                                                    {s.firstCutoffDay ? ` · Cutoff${s.secondCutoffDay ? 's' : ''}: ${s.firstCutoffDay}${s.secondCutoffDay ? ` & ${s.secondCutoffDay}` : ''}` : ''}
                                                    {s.payDelayDays ? ` · Paid ${s.payDelayDays} day(s) later` : ' · Paid on cutoff'}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {canEdit && (
                                                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => {
                                                        setEditingSchedule(s);
                                                        setScheduleForm({
                                                            scheduleName: s.scheduleName,
                                                            payFrequency: s.payFrequency,
                                                            firstCutoffDay: s.firstCutoffDay ?? 15,
                                                            secondCutoffDay: s.secondCutoffDay ?? 30,
                                                            payDelayDays: s.payDelayDays ?? 0,
                                                        });
                                                    }}><Edit2 size={16} /></button>
                                                )}
                                                {canDelete && (
                                                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" onClick={() => deleteSchedule(s)}><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(canCreate || canEdit) && (
                                    <form onSubmit={saveSchedule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <h3 className="md:col-span-2 text-sm font-semibold text-gray-900">{editingSchedule ? 'Edit schedule' : 'New schedule'}</h3>
                                        <Field label="Schedule Name" required>
                                            <input className={inputCls} value={scheduleForm.scheduleName} onChange={(e) => setScheduleForm(p => ({ ...p, scheduleName: e.target.value }))} placeholder="e.g. Semi-monthly (15th/30th)" />
                                        </Field>
                                        <Field label="Frequency" required>
                                            <select className={inputCls} value={scheduleForm.payFrequency} onChange={(e) => setScheduleForm(p => ({ ...p, payFrequency: e.target.value }))}>
                                                <option value="WEEKLY">Weekly</option>
                                                <option value="SEMI_MONTHLY">Semi-monthly</option>
                                                <option value="MONTHLY">Monthly</option>
                                            </select>
                                        </Field>
                                        {(scheduleForm.payFrequency === 'SEMI_MONTHLY' || scheduleForm.payFrequency === 'MONTHLY') && (
                                            <Field label="First cutoff day" required>
                                                <input type="number" min="1" max="31" className={inputCls}
                                                    value={scheduleForm.firstCutoffDay}
                                                    onChange={(e) => setScheduleForm(p => ({ ...p, firstCutoffDay: Number(e.target.value) }))} />
                                            </Field>
                                        )}
                                        {scheduleForm.payFrequency === 'SEMI_MONTHLY' && (
                                            <Field label="Second cutoff day" required>
                                                <input type="number" min="1" max="31" className={inputCls}
                                                    value={scheduleForm.secondCutoffDay}
                                                    onChange={(e) => setScheduleForm(p => ({ ...p, secondCutoffDay: Number(e.target.value) }))} />
                                            </Field>
                                        )}
                                        <Field label="Days after cutoff until payday">
                                            <input type="number" min="0" max="30" className={inputCls}
                                                value={scheduleForm.payDelayDays}
                                                onChange={(e) => setScheduleForm(p => ({ ...p, payDelayDays: Number(e.target.value) }))} />
                                        </Field>
                                        <div className="md:col-span-2 flex justify-end gap-2">
                                            {editingSchedule && (
                                                <button type="button" onClick={() => { setEditingSchedule(null); setScheduleForm(EMPTY_SCHEDULE); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel edit</button>
                                            )}
                                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                                {editingSchedule ? 'Update' : 'Add Schedule'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default EmployeeManagement;