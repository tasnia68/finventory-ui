import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard } from '../../components/common';
import {
    createWebhookEndpoint,
    deleteWebhookEndpoint,
    getReportConfigurations,
    getReportExecutions,
    getWebhookDeliveries,
    getWebhookEndpoints,
} from '../../services/reportingService';
import {
    formatDateTime,
    formatNumber,
    getExecutionStatusVariant,
    getWebhookStatusVariant,
    toHeadline,
    toList,
} from './utils';

const Automation = () => {
    const [configurations, setConfigurations] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState(null);
    const [webhookForm, setWebhookForm] = useState({
        name: '',
        url: '',
        subscribedEvents: 'REPORT_GENERATED,IMPORT_COMPLETED',
        secretKey: '',
        headersJson: '{}',
        active: true,
    });

    useEffect(() => {
        loadAutomation();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadAutomation = async () => {
        try {
            setLoading(true);
            const [configsResponse, executionsResponse, webhooksResponse, deliveriesResponse] = await Promise.all([
                getReportConfigurations(),
                getReportExecutions(),
                getWebhookEndpoints(),
                getWebhookDeliveries(),
            ]);

            setConfigurations(toList(configsResponse));
            setExecutions(toList(executionsResponse));
            setWebhooks(toList(webhooksResponse));
            setDeliveries(toList(deliveriesResponse));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load automation data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
            showAlert('warning', 'Webhook name and endpoint URL are required.');
            return;
        }

        try {
            setSubmitting(true);
            await createWebhookEndpoint({
                ...webhookForm,
                active: Boolean(webhookForm.active),
            });
            setWebhookForm({
                name: '',
                url: '',
                subscribedEvents: 'REPORT_GENERATED,IMPORT_COMPLETED',
                secretKey: '',
                headersJson: '{}',
                active: true,
            });
            showAlert('success', 'Webhook endpoint created successfully.');
            await loadAutomation();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create webhook');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWebhook = async (id) => {
        if (!window.confirm('Delete this webhook endpoint?')) {
            return;
        }

        try {
            await deleteWebhookEndpoint(id);
            showAlert('success', 'Webhook endpoint deleted successfully.');
            await loadAutomation();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete webhook');
        }
    };

    const metrics = useMemo(() => {
        const activeConfigurations = configurations.filter((configuration) => configuration.active).length;
        const scheduledConfigurations = configurations.filter((configuration) => configuration.scheduleCron).length;
        const successfulExecutions = executions.filter((execution) => execution.status === 'COMPLETED' || execution.status === 'SUCCESS').length;
        const activeWebhooks = webhooks.filter((webhook) => webhook.active).length;

        return {
            activeConfigurations,
            scheduledConfigurations,
            successfulExecutions,
            activeWebhooks,
        };
    }, [configurations, executions, webhooks]);

    const configurationColumns = [
        {
            key: 'name',
            header: 'Configuration',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.code || row.reportType}</div>
                </div>
            ),
        },
        { key: 'category', header: 'Category', render: (value) => <Badge variant="primary">{toHeadline(value)}</Badge> },
        { key: 'reportType', header: 'Report Type', render: (value) => toHeadline(value) },
        { key: 'scheduleCron', header: 'Schedule', render: (value) => value || 'Manual only' },
        { key: 'exportFormats', header: 'Formats', render: (value) => value || 'CSV' },
        { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
    ];

    const executionColumns = [
        {
            key: 'reportName',
            header: 'Execution',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{toHeadline(row.reportType)}</div>
                </div>
            ),
        },
        { key: 'outputFormat', header: 'Format', render: (value) => <Badge variant="info">{value}</Badge> },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getExecutionStatusVariant(value)}>{toHeadline(value)}</Badge> },
        { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
        { key: 'completedAt', header: 'Completed', render: (value) => formatDateTime(value) },
        { key: 'rowCount', header: 'Rows', render: (value) => formatNumber(value) },
    ];

    const webhookColumns = [
        {
            key: 'name',
            header: 'Webhook',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.url}</div>
                </div>
            ),
        },
        { key: 'subscribedEvents', header: 'Events', render: (value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value || '-'}</span> },
        { key: 'createdAt', header: 'Created', render: (value) => formatDateTime(value) },
        { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
        {
            key: 'id',
            header: 'Action',
            render: (value) => (
                <Button variant="ghost" icon="delete" onClick={() => handleDeleteWebhook(value)}>
                    Remove
                </Button>
            ),
        },
    ];

    const deliveryColumns = [
        { key: 'webhookName', header: 'Webhook' },
        { key: 'eventType', header: 'Event', render: (value) => <Badge variant="primary">{toHeadline(value)}</Badge> },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getWebhookStatusVariant(value)}>{toHeadline(value)}</Badge> },
        { key: 'responseStatus', header: 'HTTP Status', render: (value) => value || '-' },
        { key: 'attemptCount', header: 'Attempts', render: (value) => formatNumber(value) },
        { key: 'deliveredAt', header: 'Delivered At', render: (value) => formatDateTime(value) },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_44%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.14),_transparent_28%)]" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Automation
                                </span>
                                <InfoTip text="This workspace surfaces schedules, execution history, and outbound webhook delivery tracking from the Phase 8 backend." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Govern schedules, run history, and downstream event delivery.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Review active report definitions, confirm execution health, and register webhook subscribers for report and import events from one operator console.
                            </p>
                        </div>

                        <Card className="xl:w-[420px]" title="Register Webhook" subtitle="Add a new subscriber for report and import events">
                            <div className="space-y-3">
                                <Input label="Endpoint name" value={webhookForm.name} onChange={(event) => setWebhookForm((current) => ({ ...current, name: event.target.value }))} placeholder="Slack notifier" />
                                <Input label="Webhook URL" value={webhookForm.url} onChange={(event) => setWebhookForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/hooks/reporting" />
                                <Input label="Subscribed events" value={webhookForm.subscribedEvents} onChange={(event) => setWebhookForm((current) => ({ ...current, subscribedEvents: event.target.value }))} placeholder="REPORT_GENERATED,IMPORT_COMPLETED" />
                                <Input label="Secret key" value={webhookForm.secretKey} onChange={(event) => setWebhookForm((current) => ({ ...current, secretKey: event.target.value }))} placeholder="Optional signature secret" />
                                <Input label="Headers JSON" value={webhookForm.headersJson} onChange={(event) => setWebhookForm((current) => ({ ...current, headersJson: event.target.value }))} placeholder='{"X-Environment":"prod"}' />
                                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                    <input type="checkbox" checked={webhookForm.active} onChange={(event) => setWebhookForm((current) => ({ ...current, active: event.target.checked }))} />
                                    Activate immediately
                                </label>
                                <Button icon="add_link" className="w-full" loading={submitting} onClick={handleCreateWebhook}>
                                    Create endpoint
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Active Configurations" value={formatNumber(metrics.activeConfigurations)} caption="Report definitions currently available to operators" icon="inventory" tone="blue" />
                    <MetricCard title="Scheduled Jobs" value={formatNumber(metrics.scheduledConfigurations)} caption="Configurations with a cron schedule configured" icon="schedule" tone="amber" />
                    <MetricCard title="Successful Runs" value={formatNumber(metrics.successfulExecutions)} caption="Completed executions visible in recent history" icon="task_alt" tone="emerald" />
                    <MetricCard title="Active Webhooks" value={formatNumber(metrics.activeWebhooks)} caption="Enabled outbound subscribers for reporting events" icon="webhook" tone="violet" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Report Configurations" subtitle="Configured reports, categories, and schedule posture">
                    <DataTable columns={configurationColumns} data={configurations} loading={loading} emptyMessage="No report configurations have been created yet." />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Execution History" subtitle="Recent report runs across manual and scheduled execution">
                    <DataTable columns={executionColumns} data={executions} loading={loading} emptyMessage="No report executions have been recorded yet." />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Webhook Endpoints" subtitle="Current subscribers registered for reporting and import events">
                    <DataTable columns={webhookColumns} data={webhooks} loading={loading} emptyMessage="No webhook endpoints have been configured yet." />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Delivery History" subtitle="Outbound delivery attempts emitted by the automation pipeline">
                    <DataTable columns={deliveryColumns} data={deliveries} loading={loading} emptyMessage="No webhook deliveries have been recorded yet." />
                </Card>
            </div>
        </div>
    );
};

export default Automation;