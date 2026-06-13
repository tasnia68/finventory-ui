import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable } from '../../components/common';
import { getPendingFinancialEvents, postSelectedFinancialEvents } from '../../services/accountingService';
import { AccountingPage } from './AccountingShell';
import { formatNumber, toList } from './shared';

const Pending = () => {
  const [events, setEvents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = toList(await getPendingFinancialEvents());
      setEvents(response);
      setSelectedIds((current) => current.filter((id) => response.some((event) => event.id === id)));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load pending events' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const selectedEvent = useMemo(() => events.find((event) => event.id === expandedId) || events[0] || null, [events, expandedId]);

  const toggleSelected = (eventId) => {
    setSelectedIds((current) => (
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    ));
  };

  const handlePostSelected = async () => {
    try {
      setSubmitting(true);
      const posted = await postSelectedFinancialEvents(selectedIds);
      setAlert({ type: 'success', message: `Posted ${Array.isArray(posted) ? posted.length : 0} selected financial event(s).` });
      await loadEvents();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to post selected events' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'select',
      header: '',
      render: (_, row) => (
        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
      ),
    },
    {
      key: 'eventNumber',
      header: 'Event',
      render: (value, row) => (
        <button type="button" className="text-left" onClick={() => setExpandedId(row.id)}>
          <div className="font-semibold text-primary hover:underline">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.eventType} · {row.sourceDocumentNumber || row.sourceDocumentId}</div>
        </button>
      ),
    },
    { key: 'postingStatus', header: 'Status', render: (value) => <Badge variant={value === 'FAILED' ? 'danger' : 'warning'}>{value}</Badge> },
    { key: 'totalAmount', header: 'Amount', render: (value) => formatNumber(value) },
    { key: 'occurredAt', header: 'Occurred', render: (value) => (value ? new Date(value).toLocaleString() : '-') },
    { key: 'failureReason', header: 'Failure', render: (value) => value || '—' },
  ];

  const previewColumns = [
    { key: 'lineNumber', header: '#' },
    { key: 'entryType', header: 'Type', render: (value) => <Badge variant={value === 'DEBIT' ? 'success' : 'primary'}>{value}</Badge> },
    {
      key: 'accountCode',
      header: 'Account',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.accountName}</div>
        </div>
      ),
    },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount', render: (value) => formatNumber(value) },
  ];

  return (
    <AccountingPage
      title="Pending Events"
      subtitle="Review generated accounting events, preview their debit and credit lines, and retry failed postings."
      actions={(
        <div className="flex gap-2">
          <Button variant="secondary" loading={loading} onClick={loadEvents}>Refresh</Button>
          <Button icon="publish" loading={submitting} disabled={selectedIds.length === 0} onClick={handlePostSelected}>
            Post selected
          </Button>
        </div>
      )}
    >
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card padding="none" className="overflow-hidden" title="Pending and Failed Events" subtitle="Events waiting for ledger posting or manual retry">
          <DataTable columns={columns} data={events} loading={loading} emptyMessage="No pending or failed financial events." />
        </Card>

        <Card padding="none" className="overflow-hidden" title="Posting Preview" subtitle={selectedEvent ? selectedEvent.eventNumber : 'Select an event'}>
          <DataTable columns={previewColumns} data={selectedEvent?.subledgerEntries || []} loading={loading} emptyMessage="No preview lines available." />
        </Card>
      </div>
    </AccountingPage>
  );
};

export default Pending;
