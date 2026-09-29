import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, Trash2, FileText, Camera, User, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const serveUrl = (path) => `/files/serve?path=${encodeURIComponent(path)}`;
const downloadUrl = (path) => `/files/download?path=${encodeURIComponent(path)}`;

const fmtSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

// Loads an image through the authenticated API and shows it
export const SecureImage = ({ path, className = '', alt = '', fallback = null }) => {
    const [src, setSrc] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl = null;
        let cancelled = false;
        setSrc(null);
        setFailed(false);
        if (!path) return undefined;
        api.download(serveUrl(path)).then((res) => {
            if (cancelled) return;
            if (res.success) {
                objectUrl = URL.createObjectURL(res.data);
                setSrc(objectUrl);
            } else {
                setFailed(true);
            }
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [path]);

    if (!path || failed) return fallback;
    if (!src) return <div className={`${className} bg-gray-100 animate-pulse`} />;
    return <img src={src} alt={alt} className={className} />;
};

const EmployeeDocumentsModal = ({ employee, canEdit, canDelete, onClose, onChanged }) => {
    const id = employee.employeeId;
    const [photoUrl, setPhotoUrl] = useState(employee.photoUrl || null);
    const [contracts, setContracts] = useState([]);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    const loadContracts = async () => {
        const res = await api.get(`/employees/${id}/contracts`);
        if (res.success) setContracts(res.data || []);
    };
    
    useEffect(() => { loadContracts(); /* eslint-disable-next-line */ }, [id]);
    useEffect(() => { setPhotoUrl(employee.photoUrl || null); }, [employee.photoUrl]);

    const refreshPhoto = async () => {
        const r = await api.get(`/employees/${id}`);
        if (r.success) setPhotoUrl(r.data?.photoUrl || null);
        onChanged?.();
    };

    const uploadPhoto = async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        const fd = new FormData();
        fd.append('file', f);
        setBusy(true);
        const res = await api.upload(`/employees/${id}/photo`, fd);
        setBusy(false);
        if (res.success) {
            await refreshPhoto();
            toast.success('Photo updated');
        }
    };

    const removePhoto = async () => {
        if (!window.confirm('Remove ID photo?')) return;
        setBusy(true);
        const res = await api.delete(`/employees/${id}/photo`);
        setBusy(false);
        if (res.success) {
            await refreshPhoto();
            toast.success('Photo removed');
        }
    };

    const addContract = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Enter a contract title');
        if (!file) return toast.error('Choose a file');
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('file', file);
        setBusy(true);
        const res = await api.upload(`/employees/${id}/contracts`, fd);
        setBusy(false);
        if (res.success) {
            toast.success('Contract uploaded');
            setTitle('');
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            loadContracts();
        }
    };

    const removeContract = async (c) => {
        if (!window.confirm(`Delete contract "${c.title}"?`)) return;
        const res = await api.delete(`/employees/${id}/contracts/${c.contractId}`);
        if (res.success) {
            toast.success('Contract deleted');
            loadContracts();
        }
    };

    const viewContract = async (c) => {
        const w = window.open('', '_blank'); // open first so the popup isn't blocked
        const res = await api.download(serveUrl(c.fileUrl));
        if (!res.success) { w?.close(); return; }
        const url = URL.createObjectURL(res.data);
        if (w) w.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const downloadContract = async (c) => {
        const res = await api.download(downloadUrl(c.fileUrl));
        if (!res.success) return;
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = c.originalName || c.title;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Documents — {employee.fullName}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-8">
                    {/* ID photo */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">ID Photo</h3>
                        <div className="flex items-center gap-5">
                            <div className="w-28 h-28 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                <SecureImage
                                    path={photoUrl}
                                    alt="ID"
                                    className="w-full h-full object-cover"
                                    fallback={<User size={40} className="text-gray-300" />}
                                />
                            </div>
                            {canEdit && (
                                <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700">
                                        <Camera size={16} /> {photoUrl ? 'Replace photo' : 'Upload photo'}
                                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadPhoto} disabled={busy} />
                                    </label>
                                    {photoUrl && (
                                        <button onClick={removePhoto} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                                            <Trash2 size={16} /> Remove
                                        </button>
                                    )}
                                    <p className="text-xs text-gray-500">JPG, PNG or WEBP, max 5MB</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Contracts */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Contracts</h3>

                        <div className="border border-gray-200 rounded-lg divide-y mb-4">
                            {contracts.length === 0 && <p className="p-4 text-sm text-gray-500">No contracts uploaded yet.</p>}
                            {contracts.map(c => (
                                <div key={c.contractId} className="p-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-blue-100 rounded-lg"><FileText size={18} className="text-blue-600" /></div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">{c.title}</div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {c.originalName} · {fmtSize(c.fileSize)}
                                                {c.uploadedAt ? ` · ${new Date(c.uploadedAt).toLocaleDateString()}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => viewContract(c)} title="View" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Eye size={16} /></button>
                                        <button onClick={() => downloadContract(c)} title="Download" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Download size={16} /></button>
                                        {canDelete && (
                                            <button onClick={() => removeContract(c)} title="Delete" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {canEdit && (
                            <form onSubmit={addContract} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                <input className={inputCls} placeholder="Contract title (e.g. Employment Contract 2026)" value={title} onChange={(e) => setTitle(e.target.value)} />
                                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-gray-200 file:text-sm" />
                                <div className="md:col-span-2 flex justify-end">
                                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                        <Upload size={16} /> Upload Contract
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDocumentsModal;