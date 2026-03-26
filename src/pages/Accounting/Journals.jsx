import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { createJournal, getJournals } from '../../services/accountingService';
import { toList } from './shared';

const journalColumns = [
  { key: 'journalCode', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
  { key: 'journalName', header: 'Journal' },
  { key: 'systemJournal', header: 'Mode', render: (value) => <Badge variant={value ? 'warning' : 'info'}>{value ? 'System' : 'Manual'}</Badge> },
  { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
];

const Journals = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [journalForm, setJournalForm] = useState({
    journalCode: '',
    journalName: '',
    description: '',
  });

  const loadJournals = async () => {
    try {
      setLoading(true);
      const response = await getJournals();
      setJournals(toList(response));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load journals' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, []);

  const handleCreateJournal = async () => {
    try {
      setSubmitting(true);
      await createJournal(journalForm);
      setJournalForm({ journalCode: '', journalName: '', description: '' });
      setAlert({ type: 'success', message: 'Journal created successfully.' });
      await loadJournals();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create journal' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <Card title="Create Journal" subtitle="Register a manual journal for finance-led entry management">
            <div className="space-y-3">
              <Input label="Journal code" value={journalForm.journalCode} onChange={(event) => setJournalForm((current) => ({ ...current, journalCode: event.target.value.toUpperCase() }))} placeholder="SALES" />
              <Input label="Journal name" value={journalForm.journalName} onChange={(event) => setJournalForm((current) => ({ ...current, journalName: event.target.value }))} placeholder="Sales Journal" />
              <Input label="Description" value={journalForm.description} onChange={(event) => setJournalForm((current) => ({ ...current, description: event.target.value }))} placeholder="Optional journal description" />
              <Button className="w-full" icon="library_add" loading={submitting} onClick={handleCreateJournal}>
                Create journal
              </Button>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Accounting Journals" subtitle="System and manual journals available for accounting operations">
            <DataTable columns={journalColumns} data={journals} loading={loading} emptyMessage="No accounting journals created yet." />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Journals;
