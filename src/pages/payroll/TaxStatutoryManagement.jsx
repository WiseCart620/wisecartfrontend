import React, { useState } from 'react';
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

  return (
    <PageShell title="Tax & Statutory"
      subtitle="Withholding tax brackets and SSS / PhilHealth / Pag-IBIG contributions"
      tabs={TABS} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'tax' && <TaxBracketsTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'statutory' && <StatutoryContributionsTab canDelete={canDelete} />}
      {tab === 'brackets' && <StatutoryBracketsTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
    </PageShell>
  );
};

export default TaxStatutoryManagement;