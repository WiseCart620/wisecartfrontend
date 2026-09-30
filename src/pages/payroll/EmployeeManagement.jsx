import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Search, X, User, UserCheck, UserX, FileText } from 'lucide-react';
import EmployeeDocumentsModal, { SecureImage } from './EmployeeDocumentsModal';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import Pagination from '../../components/common/Pagination';
import { useAuth, can } from '../../context/AuthContext';
import { MoneyInput } from '../../components/payroll/Shared';

const EMPTY_FORM = {
    firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
    email: '', phone: '', address: '', hireDate: '', status: 'ACTIVE',
    department: '', designation: '', employmentType: 'REGULAR', workLocation: '',
    supervisorId: '', scheduleId: '', inactiveDate: '', includeLeaveConversion: false,
    tinNumber: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '', taxStatus: '',
    paymentMode: 'BANK_TRANSFER', bankName: '', accountNumber: '', accountHolderName: '', basicSalary: '',
    allowancePayTypeId: '', allowanceAmount: '',
    customScheduleName: '', customScheduleFrequency: '', customPeriodsPerYear: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '', otherDetails: [],
};

const parseOthers = (raw) => {
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(x => ({ key: x.key ?? '', value: x.value ?? '' }));
    } catch { /* old plain-text value */ }
    return [{ key: 'Notes', value: raw }];
};

const PRESET_SCHEDULES = ['15th & 30th', 'Weekly', 'Monthly'];
const SEPARATION_REASONS = ['Termination - Lawful', 'Termination - Just', 'Termination - Authorized', 'Resignation', 'Others'];

const tenure = (hire, end) => {
    if (!hire) return '—';
    const s = new Date(hire + 'T00:00:00');
    const e = end ? new Date(end + 'T00:00:00') : new Date();
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) months--;
    if (months < 0) months = 0;
    return `${String(Math.floor(months / 12)).padStart(2, '0')}Y/${String(months % 12).padStart(2, '0')}M`;
};

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
    const [allowanceTypes, setAllowanceTypes] = useState([]);
    const [docsEmployee, setDocsEmployee] = useState(null);
    const [deactivateEmp, setDeactivateEmp] = useState(null);
    const [deactivateDate, setDeactivateDate] = useState('');
    const [deactivateLeave, setDeactivateLeave] = useState(false);
    const [deactivateReason, setDeactivateReason] = useState('');
    const [deactivateRemarks, setDeactivateRemarks] = useState('');
    const [deactivateFile, setDeactivateFile] = useState(null);


    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);


    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [empRes, schRes, ptRes] = await Promise.all([
                api.get('/employees'), api.get('/pay-schedules'), api.get('/pay-types'),
            ]);
            setEmployees(empRes.success ? empRes.data || [] : []);
            setSchedules(schRes.success ? schRes.data || [] : []);
            setAllowanceTypes(ptRes.success ? (ptRes.data || []).filter(p => p.category === 'ALLOWANCE') : []);
            if (!empRes.success) toast.error(empRes.error || 'Failed to load employees');
        } catch (e) {
            console.error(e);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };


    const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const addOther = () => setForm(p => ({ ...p, otherDetails: [...p.otherDetails, { key: '', value: '' }] }));
    const updateOther = (i, field, val) => setForm(p => ({
        ...p,
        otherDetails: p.otherDetails.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)),
    }));
    const removeOther = (i) => setForm(p => ({ ...p, otherDetails: p.otherDetails.filter((_, idx) => idx !== i) }));
    const presetSchedules = schedules.filter(s => PRESET_SCHEDULES.includes(s.scheduleName));

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, scheduleId: presetSchedules[0]?.scheduleId ?? '' });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditing(emp);
        const next = { ...EMPTY_FORM };
        Object.keys(EMPTY_FORM).forEach(k => { next[k] = emp[k] ?? ''; });
        next.otherDetails = parseOthers(emp.otherDetails);
        next.customScheduleName = '';
        next.customScheduleFrequency = '';
        next.customPeriodsPerYear = '';
        if (emp.scheduleId && !presetSchedules.some(s => s.scheduleId === emp.scheduleId)) {
            const PPY = { WEEKLY: 52, SEMI_MONTHLY: 24, MONTHLY: 12 };
            next.scheduleId = 'OTHERS';
            next.customScheduleName = emp.scheduleName || '';
            next.customScheduleFrequency = emp.scheduleFrequencyLabel
                || (emp.scheduleFrequency || '').replace('_', ' ').toLowerCase();
            next.customPeriodsPerYear = emp.schedulePeriodsPerYear ?? PPY[emp.scheduleFrequency] ?? '';
        }
        setForm(next);
        setShowModal(true);
    };

    const buildPayload = () => {
        const p = {};
        Object.entries(form).forEach(([k, v]) => { p[k] = v === '' ? null : v; });
        const other = form.scheduleId === 'OTHERS';
        p.scheduleId = form.scheduleId && !other ? Number(form.scheduleId) : null;
        p.customScheduleName = other ? form.customScheduleName.trim() : null;
        p.customScheduleFrequency = other ? form.customScheduleFrequency.trim() : null;
        p.customPeriodsPerYear = other ? Number(form.customPeriodsPerYear) : null;
        const others = (form.otherDetails || [])
            .map(o => ({ key: o.key.trim(), value: o.value.trim() }))
            .filter(o => o.key || o.value);
        p.otherDetails = others.length ? JSON.stringify(others) : null;
        p.supervisorId = form.supervisorId ? Number(form.supervisorId) : null;
        p.basicSalary = form.basicSalary !== '' ? Number(form.basicSalary) : null;
        p.allowancePayTypeId = form.allowancePayTypeId ? Number(form.allowancePayTypeId) : null;
        p.allowanceAmount = form.allowancePayTypeId && form.allowanceAmount !== '' ? Number(form.allowanceAmount) : null;
        return p;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.firstName || !form.lastName || !form.email || !form.hireDate) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (!form.scheduleId) {
            toast.error('Please select a pay schedule');
            return;
        }
        if (form.scheduleId === 'OTHERS') {
            const n = Number(form.customPeriodsPerYear);
            if (!form.customScheduleFrequency.trim()) {
                toast.error('Enter the pay frequency (e.g. Once a year)');
                return;
            }
            if (!Number.isInteger(n) || n < 1 || n > 366) {
                toast.error('Enter how many times per year employees are paid (1 to 366)');
                return;
            }
        }
        if (form.allowancePayTypeId && form.allowanceAmount === '') {
            toast.error('Enter the allowance amount');
            return;
        }
        setActionLoading(true);
        setLoadingMessage(editing ? 'Updating employee...' : 'Creating employee...');
        try {
            const res = editing
                ? await api.put(`/employees/${editing.employeeId}`, buildPayload())
                : await api.post('/employees', buildPayload());
            if (res.success) {
                toast.success(editing ? 'Employee updated' : 'Employee created');
                setShowModal(false);
                await loadAll();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to save employee');
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    const localToday = () =>
        new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    const toggleStatus = (emp) => {
        if (emp.status === 'ACTIVE') {
            setDeactivateEmp(emp);
            setDeactivateDate(localToday());
            setDeactivateLeave(false);
            setDeactivateReason('');
            setDeactivateRemarks('');
            setDeactivateFile(null);
            return;
        }
        if (!window.confirm(`Activate ${emp.fullName}?`)) return;
        submitStatus(emp, null);
    };

    const submitStatus = async (emp, inactiveDate, includeLeave = false, sep = {}) => {
        setActionLoading(true);
        setLoadingMessage('Updating status...');
        try {
            const res = await api.patch(
                `/employees/${emp.employeeId}/toggle-status`,
                null,
                inactiveDate ? {
                    params: {
                        inactiveDate,
                        includeLeaveConversion: includeLeave,
                        separationReason: sep.reason,
                        separationRemarks: sep.remarks || undefined,
                    },
                } : {}
            );
            if (res.success) {
                toast.success('Status updated');
                if (sep.file) {
                    const fd = new FormData();
                    fd.append('title', `Separation - ${sep.reason}`);
                    fd.append('file', sep.file);
                    const up = await api.upload(`/employees/${emp.employeeId}/contracts`, fd);
                    if (up.success) {
                        toast.success('Document uploaded');
                    } else {
                        toast.error('Employee deactivated, but the document failed to upload. Add it under Documents.');
                    }
                }
                await loadAll();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
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
                <p className="text-gray-600 mt-1">Manage employee records and payroll setup</p>
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
                                {['Employee', 'Department / Position', 'Schedule', 'Tenure', 'Basic Salary', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pageItems.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No employees found</td></tr>
                            ) : pageItems.map(emp => (
                                <tr key={emp.employeeId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {emp.photoUrl
                                                ? <SecureImage path={emp.photoUrl} className="w-10 h-10 rounded-lg object-cover"
                                                    fallback={<div className="p-2 bg-blue-100 rounded-lg"><User size={20} className="text-blue-600" /></div>} />
                                                : <div className="p-2 bg-blue-100 rounded-lg"><User size={20} className="text-blue-600" /></div>}
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
                                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                                        {tenure(emp.hireDate, emp.status === 'ACTIVE' ? null : emp.inactiveDate)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{money(emp.basicSalary)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {emp.status === 'ACTIVE' ? <UserCheck size={12} /> : <UserX size={12} />}
                                            {emp.status === 'ACTIVE' ? 'Active' : emp.status}
                                        </span>
                                        {emp.status !== 'ACTIVE' && emp.inactiveDate && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Since {new Date(emp.inactiveDate + 'T00:00:00').toLocaleDateString()}
                                            </div>
                                        )}
                                        {emp.status !== 'ACTIVE' && emp.separationReason && (
                                            <div className="text-xs text-gray-500" title={emp.separationRemarks || ''}>
                                                {emp.separationReason}{emp.separationRemarks ? `: ${emp.separationRemarks}` : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setDocsEmployee(emp)} title="Documents" className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg">
                                                <FileText size={18} />
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
                                    <Field label="Tenure">
                                        <input className={`${inputCls} bg-gray-100 font-mono`} readOnly
                                            value={tenure(form.hireDate, form.status === 'INACTIVE' ? form.inactiveDate : null)} />
                                    </Field>
                                    <Field label="Status">
                                        <select className={inputCls} name="status" value={form.status} onChange={onChange}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </Field>
                                    {form.status === 'INACTIVE' && (
                                        <Field label="Inactive Since" required><input type="date" className={inputCls} name="inactiveDate" value={form.inactiveDate} onChange={onChange} required /></Field>
                                    )}
                                    {form.status === 'INACTIVE' && (
                                        <Field label="Final Pay">
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-2.5">
                                                <input type="checkbox" checked={!!form.includeLeaveConversion}
                                                    onChange={(e) => setForm(p => ({ ...p, includeLeaveConversion: e.target.checked }))} />
                                                Include leave conversion
                                            </label>
                                        </Field>
                                    )}
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
                                            {presetSchedules.map(s => <option key={s.scheduleId} value={s.scheduleId}>{s.scheduleName}</option>)}
                                            <option value="OTHERS">Others (type manually)</option>
                                        </select>
                                    </Field>
                                    {form.scheduleId === 'OTHERS' && (
                                        <>
                                            <Field label="Frequency" required>
                                                <input className={inputCls} name="customScheduleFrequency"
                                                    value={form.customScheduleFrequency} onChange={onChange}
                                                    placeholder="e.g. Once a year, Every 10 days" />
                                            </Field>
                                            <Field label="Pays per year" required>
                                                <input type="number" min="1" max="366" step="1" className={inputCls}
                                                    name="customPeriodsPerYear" value={form.customPeriodsPerYear}
                                                    onChange={onChange} placeholder="e.g. 1" />
                                            </Field>
                                            <Field label="Schedule Name (optional)" className="md:col-span-2">
                                                <input className={inputCls} name="customScheduleName"
                                                    value={form.customScheduleName} onChange={onChange}
                                                    placeholder="Defaults to the frequency you typed" />
                                            </Field>
                                        </>
                                    )}
                                </Section>

                                <Section title="Emergency Contact">
                                    <Field label="Contact Name"><input className={inputCls} name="emergencyContactName" value={form.emergencyContactName} onChange={onChange} /></Field>
                                    <Field label="Relationship"><input className={inputCls} name="emergencyContactRelationship" value={form.emergencyContactRelationship} onChange={onChange} placeholder="e.g. Spouse, Parent" /></Field>
                                    <Field label="Phone"><input className={inputCls} name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={onChange} /></Field>
                                </Section>

                                <Section title="Statutory Numbers">
                                    <Field label="TIN"><input className={inputCls} name="tinNumber" value={form.tinNumber} onChange={onChange} /></Field>
                                    <Field label="SSS Number"><input className={inputCls} name="sssNumber" value={form.sssNumber} onChange={onChange} /></Field>
                                    <Field label="PhilHealth Number"><input className={inputCls} name="philhealthNumber" value={form.philhealthNumber} onChange={onChange} /></Field>
                                    <Field label="Pag-IBIG Number"><input className={inputCls} name="pagibigNumber" value={form.pagibigNumber} onChange={onChange} /></Field>
                                    <Field label="Tax Status"><input className={inputCls} name="taxStatus" value={form.taxStatus} onChange={onChange} placeholder="e.g. S, ME1" /></Field>
                                </Section>

                                <Section title="Salary & Payment">
                                    <Field label="Basic Salary (monthly)"><MoneyInput className={inputCls} name="basicSalary" value={form.basicSalary} onChange={onChange} /></Field>
                                    <Field label="Allowance">
                                        <div className="flex gap-2">
                                            <select className={inputCls} name="allowancePayTypeId" value={form.allowancePayTypeId}
                                                onChange={(e) => setForm(p => ({ ...p, allowancePayTypeId: e.target.value, allowanceAmount: e.target.value ? p.allowanceAmount : '' }))}>
                                                <option value="">None</option>
                                                {allowanceTypes.map(p => <option key={p.payTypeId} value={p.payTypeId}>{p.payTypeName}</option>)}
                                            </select>
                                            <MoneyInput placeholder="Amount" className={inputCls}
                                                name="allowanceAmount" value={form.allowanceAmount} onChange={onChange}
                                                disabled={!form.allowancePayTypeId} />
                                        </div>
                                    </Field>
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

                                <Section title="Others">
                                    <div className="md:col-span-2 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-500">Add any extra employee details as a label and value.</p>
                                            <button type="button" onClick={addOther}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                                                <Plus size={14} /> Add other
                                            </button>
                                        </div>
                                        {form.otherDetails.length === 0 && (
                                            <p className="text-xs text-gray-400">Nothing added yet. Click "Add other" to add a key and value.</p>
                                        )}
                                        {form.otherDetails.map((o, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input className={`${inputCls} md:w-1/3`} placeholder="Key (e.g. Blood Type)"
                                                    value={o.key} onChange={(e) => updateOther(i, 'key', e.target.value)} />
                                                <input className={inputCls} placeholder="Value (e.g. O+)"
                                                    value={o.value} onChange={(e) => updateOther(i, 'value', e.target.value)} />
                                                <button type="button" onClick={() => removeOther(i)} title="Remove"
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
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
            {deactivateEmp && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Deactivate Employee</h2>
                            <button onClick={() => setDeactivateEmp(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                {deactivateEmp.fullName} will be removed from future payroll runs.
                            </p>
                            <Field label="Inactive Since" required>
                                <input type="date" className={inputCls} value={deactivateDate}
                                    onChange={(e) => setDeactivateDate(e.target.value)} />
                            </Field>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={deactivateLeave}
                                    onChange={(e) => setDeactivateLeave(e.target.checked)} />
                                Include leave conversion in final pay
                            </label>
                            <Field label="Reason for leaving" required>
                                <select className={inputCls} value={deactivateReason}
                                    onChange={(e) => setDeactivateReason(e.target.value)}>
                                    <option value="">Select reason...</option>
                                    {SEPARATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </Field>
                            {deactivateReason === 'Others' && (
                                <Field label="Please specify" required>
                                    <input className={inputCls} value={deactivateRemarks} maxLength={500}
                                        onChange={(e) => setDeactivateRemarks(e.target.value)} />
                                </Field>
                            )}
                            <Field label="Supporting document (optional)">
                                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className={inputCls}
                                    onChange={(e) => setDeactivateFile(e.target.files?.[0] || null)} />
                                <p className="text-xs text-gray-500 mt-1">e.g. resignation letter or termination notice</p>
                            </Field>
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setDeactivateEmp(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                            <button
                                disabled={!deactivateDate || !deactivateReason
                                    || (deactivateReason === 'Others' && !deactivateRemarks.trim())}
                                onClick={() => {
                                    const emp = deactivateEmp;
                                    const date = deactivateDate;
                                    const sep = { reason: deactivateReason, remarks: deactivateRemarks.trim(), file: deactivateFile };
                                    setDeactivateEmp(null);
                                    submitStatus(emp, date, deactivateLeave, sep);
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {docsEmployee && (
                <EmployeeDocumentsModal
                    employee={employees.find(e => e.employeeId === docsEmployee.employeeId) || docsEmployee}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onClose={() => setDocsEmployee(null)}
                    onChanged={async () => {
                        const r = await api.get('/employees');
                        if (r.success) setEmployees(r.data || []);
                    }}
                />
            )}

        </div >
    );
};

export default EmployeeManagement;