import { useEffect, useState } from 'react';
import { api } from '../services/api';

// date ranges of approved / paid payroll runs
export const useRunLocks = () => {
  const [locks, setLocks] = useState([]);
  useEffect(() => {
    api.get('/payroll/locks').then(r => { if (r.success) setLocks(r.data || []); }).catch(() => { });
  }, []);
  return locks;
};

// true when [from, to] touches a locked run of the same pay schedule
export const isLockedOn = (locks, scheduleId, from, to = from) =>
  locks.some(l => (!scheduleId || !l.scheduleId || String(l.scheduleId) === String(scheduleId))
    && from <= l.end && to >= l.start);