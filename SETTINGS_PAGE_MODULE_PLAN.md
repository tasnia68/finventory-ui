# Settings Page Module Plan

## 1. Purpose

This document defines how the Settings page should be structured so that:

- all settings live in one centralized Settings page
- each module can own and extend its own settings over time
- the UI stays consistent as the system grows
- the backend uses one shared settings store instead of scattered ad hoc configuration

The current frontend has a placeholder Settings route in `src/App.jsx`.
The backend already provides a tenant settings API at `/api/v1/settings` through `TenantSettingController`.

That means the correct direction is not to build separate settings pages per module. The correct direction is:

1. one shared Settings page
2. one shared tenant settings API
3. visually differentiated sections inside that page
4. stable keys that modules can read without owning separate settings screens

## 2. Core Design Rule

The Settings page is central and should remain central.

This means:

- users should not have to visit module-specific settings pages
- all configuration should be editable from one place
- settings can still be grouped by business area for clarity
- modules can read their own keys at runtime, but they do not need their own settings UI
- adding a new setting should extend the central Settings page, not create a new settings surface

## 3. Product Decision

The product should use:

- one route: `/settings`
- one page shell
- one save/load flow
- one search experience
- one visual system for sections, cards, and grouped controls

The product should not use:

- separate settings pages under each module
- hidden configuration split across unrelated pages
- different patterns for each team or feature area

## 4. Recommended Architecture

### 4.1 Backend Source of Truth

Use the existing tenant settings API:

- `GET /api/v1/settings?category={category}`
- `GET /api/v1/settings/{key}`
- `PUT /api/v1/settings`
- `PUT /api/v1/settings/{key}`

Current DTO shape:

```json
{
  "key": "pos.receipt.showCashierName",
  "value": "true",
  "type": "BOOLEAN",
  "category": "pos"
}
```

### 4.2 Frontend Structure

The Settings page should have:

- a single page shell
- a sticky in-page navigation or section index
- a main content panel for setting groups
- reusable field renderers by type
- save state, validation state, and dirty-state tracking
- visually distinct sections so users can quickly tell where they are

### 4.3 Runtime Ownership Model

Each module should define:

- category name
- setting keys it owns
- default values
- input type
- validation rules
- where each setting affects runtime behavior

This is an implementation concern, not a UX concern.

In UX terms, the user sees one Settings page.
In implementation terms, the system still knows which domain consumes which key.

## 5. Naming Convention

Use a strict key naming convention:

`{module}.{group}.{setting}`

Examples:

- `general.localization.defaultLanguage`
- `auth.session.timeoutMinutes`
- `catalog.sku.autoGenerate`
- `inventory.stock.allowNegativeStock`
- `advancedInventory.batch.requireExpiryDate`
- `procurement.purchaseOrder.defaultApprovalThreshold`
- `sales.order.defaultPaymentTermDays`
- `pos.offline.autoSyncOnReconnect`
- `analytics.dashboard.defaultDateRange`
- `integration.webhooks.retryLimit`

Rules:

- `category` should map to the top-level module
- keys should be human-readable and stable
- do not use UI labels as keys
- avoid one flat namespace like `defaultCurrency` or `theme`

## 6. Setting Types

Recommended supported types:

- `STRING`
- `BOOLEAN`
- `NUMBER`
- `PERCENTAGE`
- `CURRENCY`
- `ENUM`
- `JSON`
- `DATE`
- `TIMEZONE`
- `LANGUAGE`
- `EMAIL_LIST`

Frontend renderers should map types to components:

- `BOOLEAN` -> toggle or checkbox
- `ENUM` -> select
- `NUMBER` -> numeric input
- `JSON` -> structured editor or textarea with validation
- `EMAIL_LIST` -> tokenized input

## 7. Information Architecture for the Settings Page

Top-level sections should be:

1. General
2. Authentication and User Management
3. Product and Catalog
4. Inventory Core
5. Advanced Inventory
6. Procurement and Suppliers
7. Sales and Fulfillment
8. Point of Sale
9. Analytics and Reporting
10. Integrations and System

These are page sections, not separate module settings pages.

Each section should contain smaller groups. Example:

- Point of Sale
- Receipt
- Offline
- Register
- Cashier Controls

### 7.1 UX Principle

The page should feel unified, but visually segmented.

That means:

- one consistent layout
- section headers with short descriptions
- grouped cards or panels per business area
- spacing, dividers, icons, and background treatments to separate domains
- no context switch into separate settings modules

### 7.2 Recommended Visual Structure

Use this layout:

1. page header
2. search and quick filters
3. sticky section index
4. stacked settings sections
5. grouped cards inside each section
6. save bar for dirty changes

Example section sequence:

- General
- Inventory Rules
- POS and Counter Operations
- Sales and Fulfillment
- Procurement
- Security
- Analytics and Reporting
- Integrations

This gives visual differentiation without fragmenting the configuration experience.

## 8. Single-Page Settings Structure

The page should not be thought of as “module pages inside settings”.
It should be thought of as one operational control surface with clearly differentiated sections.

Recommended sections:

### 8.1 General

Use for organization-wide defaults and display behavior.

Suggested cards:

- Organization Profile
- Localization
- Branding

### 8.2 Security and Access

Use for authentication, sessions, password rules, invitations, and audit settings.

Suggested cards:

- Session Policy
- Password Policy
- Invitation Rules
- Audit and Access Controls

### 8.3 Catalog and Product Rules

Use for SKU generation, attribute rules, and product defaults.

Suggested cards:

- SKU Rules
- Product Defaults
- Attribute Rules
- Category Governance

### 8.4 Inventory Rules

Use for warehouse defaults, stock policies, adjustments, transfers, and core inventory behavior.

Suggested cards:

- Stock Policy
- Warehouse Defaults
- Movement Controls
- Transfer Controls

### 8.5 Advanced Inventory Controls

Use for batch, serial, reservations, replenishment, cycle counting, and valuation configuration.

Suggested cards:

- Batch and Serial Rules
- Reservation Controls
- Replenishment Defaults
- Cycle Count Rules
- Valuation Method

### 8.6 Procurement Controls

Use for supplier defaults, requisition rules, PO defaults, and receiving tolerances.

Suggested cards:

- Supplier Defaults
- Requisition Rules
- Purchase Order Defaults
- Receiving Rules

### 8.7 Sales and Fulfillment Controls

Use for sales order defaults, payment terms, fulfillment rules, and customer policy.

Suggested cards:

- Sales Order Defaults
- Customer Defaults
- Fulfillment Rules
- Delivery and Shipment Defaults

### 8.8 POS and Counter Operations

Use for terminal rules, receipt behavior, offline mode, shift policy, and cashier controls.

Suggested cards:

- Counter and Terminal Defaults
- Register and Shift Policy
- Receipt Settings
- Offline and Sync Behavior
- Cashier Controls

### 8.9 Analytics and Reporting

Use for dashboard defaults, export behavior, retention, and report visibility rules.

Suggested cards:

- Dashboard Defaults
- Report Defaults
- Export Rules
- Data Exchange Defaults

### 8.10 Integrations and System

Use for webhook, API, printing, and maintenance-related system settings.

Suggested cards:

- Webhooks
- API Access
- Devices and Printing
- Retention and Maintenance

## 9. Settings Inventory by Domain

### 9.1 General

Purpose:
Tenant-wide defaults used across all modules.

Suggested groups:

- Organization Profile
- Localization
- Number Formats
- Branding

Suggested settings:

- `general.organization.name`
- `general.organization.logoUrl`
- `general.localization.defaultLanguage`
- `general.localization.defaultTimezone`
- `general.localization.defaultCurrency`
- `general.localization.dateFormat`
- `general.localization.numberFormat`
- `general.branding.receiptFooterText`

Where used:

- login page branding
- app shell
- receipts
- reports
- invoices

### 9.2 Authentication and User Management

Purpose:
Controls security, invitation, session, and role defaults.

Suggested groups:

- Session Policy
- Password Policy
- Invitation Policy
- Access Controls

Suggested settings:

- `auth.session.timeoutMinutes`
- `auth.session.refreshGraceMinutes`
- `auth.password.minLength`
- `auth.password.requireUppercase`
- `auth.password.requireNumber`
- `auth.password.requireSymbol`
- `auth.invitation.expiryHours`
- `auth.mfa.enabled`
- `auth.auditLog.userActionsEnabled`

Where used:

- login flow
- invitation flow
- user creation and reset flows
- audit logging behavior

### 9.3 Product and Catalog

Purpose:
Controls product definition standards, SKU rules, and catalog behavior.

Suggested groups:

- SKU Rules
- Attributes
- Templates
- Category Governance

Suggested settings:

- `catalog.sku.autoGenerate`
- `catalog.sku.template`
- `catalog.product.requireCategory`
- `catalog.product.requireBarcode`
- `catalog.attributes.allowFreeTextValues`
- `catalog.attributes.maxOptionsPerAttribute`
- `catalog.templates.defaultStatus`
- `catalog.categories.maxDepth`

Where used:

- product create/edit
- template generation
- attribute creation
- category management

### 9.4 Inventory Core

Purpose:
Controls base stock behavior across warehouses and movements.

Suggested groups:

- Stock Policy
- Warehouses
- Movements
- Transfers

Suggested settings:

- `inventory.stock.allowNegativeStock`
- `inventory.stock.defaultLowStockThreshold`
- `inventory.stock.defaultSafetyStockDays`
- `inventory.warehouse.defaultWarehouseId`
- `inventory.movements.requireReason`
- `inventory.movements.allowBackdatedEntry`
- `inventory.transfer.requireApproval`
- `inventory.transfer.autoCreateReceipt`

Where used:

- stock adjustment
- warehouse transfer
- stock transaction screens
- inventory dashboard behavior

### 9.5 Advanced Inventory

Purpose:
Controls enterprise inventory features like batch, serial, reservation, replenishment, and valuation.

Suggested groups:

- Batch and Serial
- Reservations
- Replenishment
- Cycle Count
- Valuation

Suggested settings:

- `advancedInventory.batch.enabled`
- `advancedInventory.batch.requireExpiryDate`
- `advancedInventory.serial.enabled`
- `advancedInventory.serial.uniquePerTenant`
- `advancedInventory.reservation.autoExpireHours`
- `advancedInventory.replenishment.defaultCoverageDays`
- `advancedInventory.replenishment.autoSuggestEnabled`
- `advancedInventory.cycleCount.defaultTolerancePercent`
- `advancedInventory.valuation.method`
- `advancedInventory.valuation.currency`

Where used:

- batches
- serials
- reservations
- replenishment suggestions
- cycle counting
- valuation reports

### 9.6 Procurement and Suppliers

Purpose:
Controls purchasing defaults, approval rules, and supplier operating policies.

Suggested groups:

- Supplier Defaults
- Purchase Requisition
- Purchase Orders
- Receiving

Suggested settings:

- `procurement.suppliers.defaultLeadTimeDays`
- `procurement.suppliers.defaultCurrency`
- `procurement.requisition.approvalThreshold`
- `procurement.requisition.requireJustification`
- `procurement.purchaseOrder.defaultPaymentTermDays`
- `procurement.purchaseOrder.numberPrefix`
- `procurement.purchaseOrder.allowPartialReceipt`
- `procurement.receiving.overReceiptTolerancePercent`
- `procurement.receiving.requireReferenceDocument`

Where used:

- supplier form defaults
- PR workflow
- PO form defaults
- goods receipt validation

### 9.7 Sales and Fulfillment

Purpose:
Controls outbound sales order, delivery, and customer-policy defaults.

Suggested groups:

- Sales Orders
- Pricing and Payment
- Fulfillment
- Customer Defaults

Suggested settings:

- `sales.order.numberPrefix`
- `sales.order.defaultStatus`
- `sales.order.defaultPaymentTermDays`
- `sales.order.allowPartialShipment`
- `sales.fulfillment.requireReservationBeforePick`
- `sales.fulfillment.autoCreatePickList`
- `sales.fulfillment.defaultCarrier`
- `sales.customer.defaultType`
- `sales.customer.requirePhone`

Where used:

- customer create/edit
- sales order form
- fulfillment workflow
- picking and shipment preparation

### 9.8 Point of Sale

Purpose:
Controls terminal behavior, receipts, offline operation, and cashier accountability.

Suggested groups:

- Terminals
- Register and Shift
- Receipt
- Offline and Sync
- Cashier Controls

Suggested settings:

- `pos.terminal.defaultCounterId`
- `pos.terminal.requireAssignedWarehouse`
- `pos.register.requireOpenShiftBeforeSale`
- `pos.register.allowManualCloseWithOfflineQueue`
- `pos.receipt.showCashierName`
- `pos.receipt.showCustomerName`
- `pos.receipt.footerText`
- `pos.offline.enabled`
- `pos.offline.maxQueuedSales`
- `pos.offline.autoSyncOnReconnect`
- `pos.cash.roundingRule`
- `pos.cashier.allowPriceOverride`
- `pos.cashier.allowManualDiscount`

Where used:

- POS sell screen
- register control
- sold history
- counter setup
- receipt printing

### 9.9 Analytics and Reporting

Purpose:
Controls report defaults, dashboard scopes, retention, and export behavior.

Suggested groups:

- Dashboard Defaults
- Reports
- Export
- Data Exchange

Suggested settings:

- `analytics.dashboard.defaultDateRange`
- `analytics.dashboard.defaultWarehouseScope`
- `analytics.reports.defaultExportFormat`
- `analytics.reports.showSensitiveMargins`
- `analytics.export.maxRowsPerFile`
- `analytics.export.includeAuditMetadata`
- `analytics.dataExchange.importRequiresValidation`
- `analytics.dataExchange.historyRetentionDays`

Where used:

- dashboard load defaults
- reports builder
- exports
- import validation and history

### 9.10 Integrations and System

Purpose:
Controls external connectivity, webhook delivery, and system-level operational settings.

Suggested groups:

- Webhooks
- API Access
- Devices and Printing
- Retention and Maintenance

Suggested settings:

- `integration.webhooks.enabled`
- `integration.webhooks.retryLimit`
- `integration.webhooks.timeoutSeconds`
- `integration.api.allowTokenCreation`
- `integration.devices.defaultReceiptPrinter`
- `integration.devices.defaultBarcodePrinter`
- `integration.system.auditRetentionDays`
- `integration.system.allowCsvImport`

Where used:

- webhook configuration
- data exchange
- POS printing
- administrative tools

## 10. How New Settings Should Be Added Later

When a new setting is added, use this workflow:

1. define the setting key using the module naming convention
2. assign a `category` equal to the owning module
3. define the type and validation rules
4. add it to the module section in the Settings page config
5. update the module UI to read or respect that setting
6. place it in the right section and card inside the centralized Settings page

Example:

If later the POS team needs a barcode timeout rule:

- key: `pos.terminal.barcodeInputDebounceMs`
- category: `pos`
- type: `NUMBER`
- UI location: `POS > Terminals`
- module usage: POS scan input handler

This way the system grows without creating fragmented settings experiences.

## 11. Recommended Frontend Implementation Model

Use a frontend registry, not hard-coded JSX scattered across the page.

Suggested shape:

```js
const SETTINGS_SECTIONS = [
  {
    id: 'pos',
    label: 'Point of Sale',
    groups: [
      {
        id: 'receipt',
        label: 'Receipt',
        settings: [
          {
            key: 'pos.receipt.showCashierName',
            type: 'BOOLEAN',
            label: 'Show cashier name on receipt',
            defaultValue: true,
          },
        ],
      },
    ],
  },
];
```

Benefits:

- new settings are added by config, not by rebuilding the page
- the centralized page stays consistent
- rendering logic stays generic
- validation can be centralized

## 12. Recommended Backend Enhancements

The current backend API is enough to start, but the next improvements should be:

1. add default values on read when a key does not yet exist
2. validate values by type on save
3. optionally support metadata fields later:
   - `label`
   - `description`
   - `isSecret`
   - `isReadOnly`
   - `module`
   - `group`
4. support bulk category updates cleanly
5. add audit logging for settings changes

## 13. UX Rules for the Settings Page

The Settings page should follow these rules:

- keep module sections stable in the left nav
- keep everything on one route and one page shell
- show concise operational descriptions, not marketing copy
- keep high-risk settings grouped and clearly labeled
- separate `Defaults` from `Policies`
- show save confirmation and unsaved changes clearly
- allow search by key, label, and module
- support deep links like `/settings?section=pos&group=receipt`

The distinction should be visual, not architectural.

Users should feel:

- “everything configurable is here”

They should not feel:

- “I need to know which module owns this setting before I can find it”

## 14. Rollout Plan

### Phase 1: Foundations

Build the Settings page shell with:

- single-page layout
- section index
- section layout
- generic field renderers
- save and load through `/api/v1/settings`

Initial sections to ship first:

- General
- Authentication and User Management
- Inventory Core
- Point of Sale

### Phase 2: Operational Expansion

Add:

- Product and Catalog
- Advanced Inventory
- Procurement and Suppliers
- Sales and Fulfillment

### Phase 3: Administrative Expansion

Add:

- Analytics and Reporting
- Integrations and System
- audit history for settings changes

Optional later:

- deep links into sections from operational pages

## 15. MVP Recommendation

If the team wants the smallest useful first version, implement these first:

1. `general.localization.defaultLanguage`
2. `general.localization.defaultTimezone`
3. `general.localization.defaultCurrency`
4. `inventory.stock.allowNegativeStock`
5. `inventory.movements.requireReason`
6. `advancedInventory.valuation.method`
7. `pos.register.requireOpenShiftBeforeSale`
8. `pos.offline.autoSyncOnReconnect`
9. `pos.receipt.footerText`
10. `auth.session.timeoutMinutes`

These ten settings are enough to prove the architecture and connect settings to real system behavior.

## 16. Final Recommendation

Do not treat Settings as a miscellaneous page.
Treat it as one centralized configuration surface.

The right long-term model is:

- one settings page
- one tenant settings backend
- one visually segmented but centralized UX
- one registry-driven frontend
- one naming convention
- domain-based grouping inside the same page

That gives the system a clean path to grow without rebuilding configuration every time the product needs one more rule.