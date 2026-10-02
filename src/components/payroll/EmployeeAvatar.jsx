import React from 'react';
import { SecureImage } from '../../pages/payroll/EmployeeDocumentsModal';

const EmployeeAvatar = ({ name = '', photoUrl, size = 32 }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const box = { width: size, height: size };
  const fallback = (
    <div style={box} className="rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
  if (!photoUrl) return fallback;
  return (
    <SecureImage path={photoUrl} alt={name} fallback={fallback}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  );
};

export default EmployeeAvatar;