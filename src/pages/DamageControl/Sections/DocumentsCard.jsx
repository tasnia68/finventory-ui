import React, { useState } from 'react';
import { Button, Card, InfoTip, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
    deleteDamageDocument,
    getDamageDocumentFile,
    uploadDamageDocument,
} from '../../../services/damageControlService';
import { DOCUMENT_TYPES, downloadBlob } from '../constants';

const DocumentsCard = ({ recordId, documents, onChanged, onAlert }) => {
    const { t } = useLanguage();
    const [documentForm, setDocumentForm] = useState({ documentType: 'PHOTO', notes: '', file: null });
    const [actionLoading, setActionLoading] = useState('');

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!recordId || !documentForm.file) {
            onAlert?.('error', t('damageControl.messages.documentRequired'));
            return;
        }
        try {
            setActionLoading('upload-document');
            await uploadDamageDocument(recordId, documentForm.file, documentForm.documentType, documentForm.notes);
            setDocumentForm({ documentType: 'PHOTO', notes: '', file: null });
            onAlert?.('success', t('damageControl.messages.documentUploaded'));
            await onChanged?.();
        } catch (error) {
            onAlert?.('error', error.message || t('damageControl.messages.documentUploadFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleDownload = async (documentId) => {
        try {
            setActionLoading(`download-${documentId}`);
            const file = await getDamageDocumentFile(documentId);
            downloadBlob(file.blob, file.filename);
        } catch (error) {
            onAlert?.('error', error.message || t('damageControl.messages.documentDownloadFailed'));
        } finally {
            setActionLoading('');
        }
    };

    const handleDelete = async (documentId) => {
        try {
            setActionLoading(`delete-${documentId}`);
            await deleteDamageDocument(documentId);
            onAlert?.('success', t('damageControl.messages.documentDeleted'));
            await onChanged?.();
        } catch (error) {
            onAlert?.('error', error.message || t('damageControl.messages.documentDeleteFailed'));
        } finally {
            setActionLoading('');
        }
    };

    return (
        <Card
            title={t('damageControl.detail.documents')}
            subtitle={t('damageControl.detail.documentsInfo')}
            action={<InfoTip text={t('damageControl.detail.documentsInfo')} />}
        >
            <form className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={handleUpload}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                        label={t('damageControl.forms.documentType')}
                        value={documentForm.documentType}
                        onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))}
                        options={DOCUMENT_TYPES.map((value) => ({ value, label: value }))}
                        placeholder={t('damageControl.forms.documentType')}
                    />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.file')}</label>
                        <input
                            type="file"
                            onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('damageControl.forms.notes')}</label>
                    <textarea
                        value={documentForm.notes}
                        onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))}
                        rows={3}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder={t('damageControl.forms.documentNotesPlaceholder')}
                    />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" loading={actionLoading === 'upload-document'}>{t('damageControl.actions.uploadDocument')}</Button>
                </div>
            </form>

            <div className="mt-4 space-y-3">
                {documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {t('damageControl.detail.noDocuments')}
                    </div>
                ) : documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{document.filename}</div>
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {document.documentType}{document.notes ? ` • ${document.notes}` : ''}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" loading={actionLoading === `download-${document.id}`} onClick={() => handleDownload(document.id)}>
                                {t('damageControl.actions.download')}
                            </Button>
                            <Button size="sm" variant="ghost" loading={actionLoading === `delete-${document.id}`} onClick={() => handleDelete(document.id)}>
                                {t('damageControl.actions.delete')}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default DocumentsCard;
