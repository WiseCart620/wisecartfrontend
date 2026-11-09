import { ui } from '../../utils/uiAccess';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth, can } from '../../context/AuthContext';
import TaxBracketsTab from '../../components/payroll/TaxBracketsTab';
import StatutoryContributionsTab from '../../components/payroll/StatutoryContributionsTab';
import StatutoryBracketsTab from '../../components/payroll/StatutoryBracketsTab';
import PageShell from '../../components/payroll/PageShell';

const TABS = [
  { key: 'statutory', label: 'Statutory Contributions' },
  { key: 'tax', label: 'Tax Brackets' },
  { key: 'brackets', label: 'Statutory Brackets' },
];



const TaxStatutoryManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const [tab, setTab] = useState('statutory');
  const tx = (k) => ui(user, 'tax_tabs', k);
  useEffect(() => {
    if (!tx('tab_' + tab)) { const f = TABS.find(t => tx('tab_' + t.key)); if (f) setTab(f.key); }
  }, [user, tab]);

  return (
    <PageShell title="Tax & Statutory"
      subtitle="Withholding tax brackets and SSS / PhilHealth / Pag-IBIG contributions"
      tabs={TABS.filter(t => tx('tab_' + t.key))} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'tax' && <TaxBracketsTab canCreate={canCreate && tx('tax_create')} canEdit={canEdit && tx('tax_edit')} canDelete={canDelete && tx('tax_delete')} />}
      {tab === 'statutory' && <StatutoryContributionsTab canDelete={canDelete && tx('stat_delete')} />}
      {tab === 'brackets' && <StatutoryBracketsTab canCreate={canCreate && tx('br_create')} canEdit={canEdit && tx('br_edit')} canDelete={canDelete && tx('br_delete')} />}
    </PageShell>
  );
};

export default TaxStatutoryManagement;