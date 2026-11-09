import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { useAuth, can, canUi, uiAllowed } from '../../context/AuthContext';
import TaxBracketsTab from '../../components/payroll/TaxBracketsTab';
import StatutoryContributionsTab from '../../components/payroll/StatutoryContributionsTab';
import StatutoryBracketsTab from '../../components/payroll/StatutoryBracketsTab';
import PageShell from '../../components/payroll/PageShell';

const TABS = [
  { key: 'statutory', label: 'Statutory Contributions' },
  { key: 'tax', label: 'Tax Brackets' },
  { key: 'brackets', label: 'Statutory Brackets' },
];
const TAB_KEYS = { statutory: 'tab_statutory', tax: 'tab_tax', brackets: 'tab_brackets' };

const TaxStatutoryManagementInner = () => {
  const { user } = useAuth();
  const ui = (k) => canUi(user, 'tax_tabs', k);
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const visibleTabs = TABS.filter((t) => uiAllowed(user, 'tax_tabs', TAB_KEYS[t.key]));
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'statutory');

  return (
    <PageShell title="Tax & Statutory"
      subtitle="Withholding tax brackets and SSS / PhilHealth / Pag-IBIG contributions"
      tabs={visibleTabs} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'tax' && <TaxBracketsTab canCreate={canCreate && ui('tax_create')} canEdit={canEdit && ui('tax_edit')} canDelete={canDelete && ui('tax_delete')} />}
      {tab === 'statutory' && <StatutoryContributionsTab canDelete={canDelete && ui('stat_delete')} />}
      {tab === 'brackets' && <StatutoryBracketsTab canCreate={canCreate && ui('br_create')} canEdit={canEdit && ui('br_edit')} canDelete={canDelete && ui('br_delete')} />}
    </PageShell>
  );
};

const TaxStatutoryManagement = () => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'pages_ui', 'page_tax')) return <Navigate to="/welcome" replace />;
  return <TaxStatutoryManagementInner />;
};

export default TaxStatutoryManagement;