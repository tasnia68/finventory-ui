import React from 'react';
import { Card } from '../../components/common';
import { AccountingPage } from './AccountingShell';

const Section = ({ title, children }) => (
    <Card title={title} className="rounded-[24px]">
        <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {children}
        </div>
    </Card>
);

const Guide = () => {
    const availableAreas = [
        'Chart of accounts and accounting journals',
        'Posting of inventory financial events into native journal entries',
        'Manual journal entries and journal reversals',
        'Trial balance, profit and loss, and balance sheet views',
        'Accounts payable invoices, payments, and aging',
        'Accounts receivable invoices, receipts, and aging',
        'Treasury accounts and treasury reconciliation',
    ];

    const dailyFlow = [
        'Post pending inventory financial events so warehouse and sales activity reaches the accounting ledger.',
        'Review the journal entry register for new operational postings, manual journals, and reversals.',
        'Create AP invoices for supplier obligations and record outgoing payments when settled.',
        'Create AR invoices for customer obligations and record receipts when cash is collected.',
        'Review AP and AR aging to identify overdue balances and collection or payment pressure.',
        'Create treasury reconciliations to compare statement balances against system cash activity from POS, AR, and AP.',
        'Use trial balance, profit and loss, and balance sheet pages to verify that the period is behaving as expected.',
    ];

    const goodPractice = [
        'Use manual journals only for controlled finance adjustments, not for routine operational postings.',
        'Prefer linking AP invoices to purchase orders and AR invoices to sales orders whenever the source document exists.',
        'Do not reverse entries casually. Reversal should be used when the original posting should no longer stand.',
        'Complete treasury reconciliation only after reviewing the difference between statement balance and matched system activity.',
        'Treat AP, AR, and treasury workflows as part of period-close discipline, not as isolated data-entry tasks.',
    ];

    return (
        <AccountingPage
            title="Guide"
            subtitle="Operating manual: what the accounting module does, what posts automatically, and how finance should work through it."
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Section title="Module Overview">
                        <p>
                            The accounting module is the finance layer of the system. It receives operational activity from inventory, POS, supplier returns, refunds, and stock adjustments, then turns that activity into accounting records that finance users can review and manage.
                        </p>
                        <p>
                            The module is built in layers. First, operational events create financial events and subledger entries. Second, those financial events post into journal entries. Third, finance users manage AP, AR, treasury, and statements from the accounting workspace.
                        </p>
                    </Section>

                    <Section title="What Is Available">
                        <ul className="list-disc space-y-2 pl-5">
                            {availableAreas.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </Section>
                </div>

                <Section title="How The Module Fits The Business">
                    <p>
                        Inventory and commercial workflows remain the system of record for physical and customer-facing activity. Accounting does not replace those workflows. Instead, accounting receives the financially relevant results of those workflows and makes them reviewable, reportable, and reconcilable.
                    </p>
                    <p>
                        That means warehouse receipts, POS sales, supplier returns, refunds, and manual inventory adjustments should originate in their operational modules. Finance then validates the posting result inside accounting rather than recreating the same transaction from scratch.
                    </p>
                </Section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <Section title="Chart And Journals">
                        <p>
                            Use the chart of accounts to define the finance structure used by journals and statements. Use journals to separate different posting contexts such as manual adjustments or system-generated flows.
                        </p>
                        <p>
                            The system also provisions and uses system journals where needed for automated posting.
                        </p>
                    </Section>

                    <Section title="Manual Journals">
                        <p>
                            Use manual journals for finance-controlled entries that should not originate from inventory or sales workflows. Every manual entry must be balanced, and only accounts marked for manual posting should be used.
                        </p>
                    </Section>

                    <Section title="Reversals">
                        <p>
                            Reverse a journal entry when the original posting should be negated. Reversal creates a compensating accounting entry rather than silently changing the original record, which preserves auditability.
                        </p>
                    </Section>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Section title="Accounts Payable">
                        <p>
                            AP is used to register supplier obligations. Create an AP invoice directly or link it to a purchase order. When the supplier is paid, record an AP payment to reduce the outstanding balance and update AP aging.
                        </p>
                    </Section>

                    <Section title="Accounts Receivable">
                        <p>
                            AR is used to register customer obligations. Create an AR invoice directly or link it to a sales order. When the customer pays, record an AR receipt to reduce the open balance and update AR aging.
                        </p>
                    </Section>
                </div>

                <Section title="Treasury And Reconciliation">
                    <p>
                        Treasury accounts represent the cash, bank, wallet, or clearing destinations you reconcile. A reconciliation compares an external statement balance against system activity already recorded in the platform.
                    </p>
                    <p>
                        Current reconciliation lines are built from POS shift cash settlement, AR receipts, and AP payments. This gives finance users a practical way to compare collected and disbursed money against the external balance they are reconciling.
                    </p>
                </Section>

                <Section title="Daily User Manual">
                    <ol className="list-decimal space-y-2 pl-5">
                        {dailyFlow.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ol>
                </Section>

                <Section title="Month-End Or Review Checklist">
                    <ul className="list-disc space-y-2 pl-5">
                        <li>Confirm pending financial events have been posted.</li>
                        <li>Review manual journals and reversals for approval and business context.</li>
                        <li>Review open AP and AR balances and investigate unusual aging.</li>
                        <li>Run treasury reconciliations for active cash and bank accounts.</li>
                        <li>Inspect the trial balance for unexpected balances.</li>
                        <li>Review profit and loss and balance sheet for material movement.</li>
                    </ul>
                </Section>

                <Section title="Good Practice">
                    <ul className="list-disc space-y-2 pl-5">
                        {goodPractice.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </Section>
        </AccountingPage>
    );
};

export default Guide;
