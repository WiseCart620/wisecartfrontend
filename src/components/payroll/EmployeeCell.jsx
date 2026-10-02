import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import EmployeeAvatar from './EmployeeAvatar';

// first + middle + last, falling back to fullName
export const fullNameOf = (e) =>
    [e.firstName, e.middleName, e.lastName]
        .filter(s => s && String(s).trim())
        .map(s => String(s).trim())
        .join(' ') || e.fullName || '';

// { [employeeId]: { photoUrl, name } }
export const useEmployeeDirectory = () => {
    const [dir, setDir] = useState({});
    useEffect(() => {
        api.get('/employees').then(r => {
            if (r.success) {
                setDir(Object.fromEntries((r.data || []).map(e =>
                    [e.employeeId, { photoUrl: e.photoUrl, name: fullNameOf(e) }])));
            }
        }).catch(() => { });
    }, []);
    return dir;
};

const EmployeeCell = ({ id, name, dir = {} }) => {
    const d = dir[id] || Object.values(dir).find(x => x.name === name);
    const shown = d?.name || name || '';
    return (
        <div className="flex items-center gap-3">
            <EmployeeAvatar name={shown} photoUrl={d?.photoUrl} />
            <span>{shown}</span>
        </div>
    );
};

export default EmployeeCell;