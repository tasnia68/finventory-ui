import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, InfoTip, MetricCard, Select } from '../../components/common';
import {
    exportDataset,
    getDataImportHistory,
    getImportTemplate,
    startDataImport,
    validateDataImport,
} from '../../services/reportingService';
import {
    downloadBlob,
    formatDateTime,
    formatNumber,
    getImportStatusVariant,
    toHeadline,
    toList,
} from './utils';

const DATASET_OPTIONS = [
    { value: 'PRODUCTS', label: 'Products' },
    { value: 'STOCKS', label: 'Stocks' },
    { value: 'PURCHASE_ORDERS', label: 'Purchase Orders' },
    { value: 'SALES_ORDERS', label: 'Sales Orders' },
    { value: 'SUPPLIERS', label: 'Suppliers' },
];

const DataExchange = () => {
    const [dataset, setDataset] = useState('PRODUCTS');
    const [selectedFile, setSelectedFile] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState('');
    const [alert, setAlert] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadHistory = async () => {
        try {
            setLoading(true);
            setHistory(toList(await getDataImportHistory()));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load import history');
        } finally {
            setLoading(false);
        }
    };

    const ensureFileSelected = () => {
        if (selectedFile) {
            return true;
        }

        showAlert('warning', 'Choose a file before validating or importing data.');
        return false;
    };

    const handleDownloadTemplate = async () => {
        try {
            setSubmitting('template');
            const template = await getImportTemplate(dataset);
            const blob = new Blob([template.templateContent || ''], { type: template.contentType || 'text/csv;charset=utf-8' });
            downloadBlob(blob, template.fileName || `${dataset.toLowerCase()}-template.csv`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to download template');
        } finally {
            setSubmitting('');
        }
    };

    const handleExportDataset = async () => {
        try {
            setSubmitting('export');
            const { blob, filename } = await exportDataset(dataset);
            downloadBlob(blob, filename);
        } catch (error) {
            showAlert('error', error.message || 'Failed to export dataset');
        } finally {
            setSubmitting('');
        }
    };

    const handleValidateImport = async () => {
        if (!ensureFileSelected()) {
            return;
        }

        try {
            setSubmitting('validate');
            const result = await validateDataImport(dataset, selectedFile);
            setValidationResult(result);
            if (result.valid) {
                showAlert('success', 'Import file validated successfully.');
            } else {
                showAlert('warning', 'Validation completed with issues that need attention.');
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to validate import');
        } finally {
            setSubmitting('');
        }
    };

    const handleStartImport = async () => {
        if (!ensureFileSelected()) {
            return;
        }

        try {
            setSubmitting('import');
            const response = await startDataImport(dataset, selectedFile);
            showAlert('success', response.summaryMessage || 'Import started successfully.');
            setSelectedFile(null);
            setValidationResult(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            await loadHistory();
        } catch (error) {
            showAlert('error', error.message || 'Failed to start import');
        } finally {
            setSubmitting('');
        }
    };

    const metrics = useMemo(() => {
        const completed = history.filter((entry) => entry.status === 'COMPLETED').length;
        const failed = history.filter((entry) => entry.status === 'FAILED').length;
        const processing = history.filter((entry) => entry.status === 'PROCESSING').length;
        const processedRecords = history.reduce((sum, entry) => sum + Number(entry.processedRecords || 0), 0);
        return { completed, failed, processing, processedRecords };
    }, [history]);

    const historyColumns = [
        { key: 'dataset', header: 'Dataset', render: (value) => <Badge variant="primary">{toHeadline(value)}</Badge> },
        {
            key: 'fileName',
            header: 'File',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Requested by {row.createdBy || 'system'}</div>
                </div>
            ),
        },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getImportStatusVariant(value)}>{toHeadline(value)}</Badge> },
        { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
        { key: 'processedRecords', header: 'Processed', render: (value) => formatNumber(value) },
        { key: 'successfulRecords', header: 'Successful', render: (value) => formatNumber(value) },
        { key: 'failedRecords', header: 'Failed', render: (value) => formatNumber(value) },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_42%),radial-gradient(circle_at_85%_18%,_rgba(59,130,246,0.14),_transparent_26%)]" />
                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Data Exchange
                                </span>
                                <InfoTip text="Templates, exports, and CSV imports all map to the backend reporting data exchange endpoints." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                Control inbound and outbound operational data safely.
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Download governed templates, validate files before processing, and monitor asynchronous import execution without leaving the inventory workspace.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:min-w-[480px]">
                            <Select
                                label="Dataset"
                                value={dataset}
                                onChange={(event) => setDataset(event.target.value)}
                                options={DATASET_OPTIONS}
                                placeholder="Choose dataset"
                            />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Source file</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:file:bg-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button variant="secondary" icon="description" loading={submitting === 'template'} onClick={handleDownloadTemplate}>
                                Template
                            </Button>
                            <Button variant="secondary" icon="download" loading={submitting === 'export'} onClick={handleExportDataset}>
                                Export dataset
                            </Button>
                            <Button variant="secondary" icon="rule" loading={submitting === 'validate'} onClick={handleValidateImport}>
                                Validate file
                            </Button>
                            <Button icon="upload" loading={submitting === 'import'} onClick={handleStartImport}>
                                Start import
                            </Button>
                        </div>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Completed Imports" value={formatNumber(metrics.completed)} caption="Successfully finished import jobs in the visible history" icon="task_alt" tone="emerald" />
                    <MetricCard title="Failed Imports" value={formatNumber(metrics.failed)} caption="Jobs that require file correction or operational review" icon="error" tone="rose" />
                    <MetricCard title="In Flight" value={formatNumber(metrics.processing)} caption="Imports currently being processed asynchronously" icon="progress_activity" tone="blue" />
                    <MetricCard title="Records Processed" value={formatNumber(metrics.processedRecords)} caption="Total processed rows across the visible history" icon="numbers" tone="amber" />
                </div>

                {validationResult ? (
                    <Card
                        title="Validation Result"
                        subtitle={`Checked ${formatNumber(validationResult.totalRecords)} records for ${toHeadline(dataset)}`}
                        action={<Badge variant={validationResult.valid ? 'success' : 'warning'}>{validationResult.valid ? 'Valid' : 'Issues Found'}</Badge>}
                    >
                        {validationResult.errors?.length ? (
                            <div className="space-y-2">
                                {validationResult.errors.slice(0, 8).map((error, index) => (
                                    <div key={`${error}-${index}`} className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300">
                                        {error}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                The file structure and records passed validation and are ready for processing.
                            </div>
                        )}
                    </Card>
                ) : null}

                <Card
                    padding="none"
                    className="overflow-hidden"
                    title="Import History"
                    subtitle="Execution trail for asynchronous data ingestion"
                >
                    <DataTable
                        columns={historyColumns}
                        data={history}
                        loading={loading}
                        emptyMessage="No data exchange imports have been recorded yet."
                    />
                </Card>
            </div>
        </div>
    );
};

export default DataExchange;