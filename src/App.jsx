import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import AppLoadingScreen from './components/common/AppLoadingScreen';
import { PERMISSIONS } from './constants/permissions';
import { useStorefrontModule } from './hooks/useStorefrontModule';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Users = lazy(() => import('./pages/Users'));
const UserDetails = lazy(() => import('./pages/Users/UserDetails'));
const CreateStaff = lazy(() => import('./pages/Users/CreateStaff'));
const Profile = lazy(() => import('./pages/Profile'));
const Roles = lazy(() => import('./pages/Roles'));
const CategoriesList = lazy(() => import('./pages/Categories/List'));
const CategoriesEditor = lazy(() => import('./pages/Categories/Editor'));
const UnitsOfMeasure = lazy(() => import('./pages/UnitsOfMeasure'));
const Products = lazy(() => import('./pages/Products'));
const CreateProduct = lazy(() => import('./pages/Products/CreateProduct'));
const CreateSimpleProduct = lazy(() => import('./pages/Products/CreateSimpleProduct'));
const ProductDetails = lazy(() => import('./pages/Products/ProductDetails'));
const AttributesList = lazy(() => import('./pages/Attributes/List'));
const AttributesEditor = lazy(() => import('./pages/Attributes/Editor'));
const AttributeGroups = lazy(() => import('./pages/AttributeGroups'));
const Templates = lazy(() => import('./pages/Templates'));
const BatchesList = lazy(() => import('./pages/Batches/List'));
const BatchesDetail = lazy(() => import('./pages/Batches/Detail'));
const Serials = lazy(() => import('./pages/Serials'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Replenishment = lazy(() => import('./pages/Replenishment'));
const DamageControlOverview = lazy(() => import('./pages/DamageControl/Overview'));
const DamageControlIncidents = lazy(() => import('./pages/DamageControl/Incidents'));
const DamageControlIncidentEditor = lazy(() => import('./pages/DamageControl/IncidentEditor'));
const DamageControlReceiving = lazy(() => import('./pages/DamageControl/Receiving'));
const DamageControlClaims = lazy(() => import('./pages/DamageControl/Claims'));
const DamageControlClaimEditor = lazy(() => import('./pages/DamageControl/ClaimEditor'));
const PurchaseRequisitions = lazy(() => import('./pages/PurchaseRequisitions'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Procurement = lazy(() => import('./pages/Procurement'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const GoodsReceipts = lazy(() => import('./pages/GoodsReceipts'));
const CycleCountsList = lazy(() => import('./pages/CycleCounts/List'));
const CycleCountsEntry = lazy(() => import('./pages/CycleCounts/CountEntry'));
const WarehouseTransfers = lazy(() => import('./pages/WarehouseTransfers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Valuation = lazy(() => import('./pages/Valuation'));
const Customers = lazy(() => import('./pages/Customers'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const OrdersList = lazy(() => import('./pages/Orders/List'));
const OrdersDetail = lazy(() => import('./pages/Orders/Detail'));
const Couriers = lazy(() => import('./pages/Couriers'));
const OrderInbox = lazy(() => import('./pages/OrderInbox'));
const RefundsExchangesList = lazy(() => import('./pages/RefundsExchanges/List'));
const RefundsExchangesEditor = lazy(() => import('./pages/RefundsExchanges/Editor'));
const RefundsExchangesDetail = lazy(() => import('./pages/RefundsExchanges/Detail'));
const DiscountsList = lazy(() => import('./pages/Discounts/List'));
const DiscountsEditor = lazy(() => import('./pages/Discounts/Editor'));
const DiscountsCodes = lazy(() => import('./pages/Discounts/Codes'));
const DiscountsAnalytics = lazy(() => import('./pages/Discounts/Analytics'));
const DiscountsPreview = lazy(() => import('./pages/Discounts/Preview'));
const GiftCardsList = lazy(() => import('./pages/GiftCards/List'));
const GiftCardsDetail = lazy(() => import('./pages/GiftCards/Detail'));
const ReferralsProgram = lazy(() => import('./pages/Referrals/Program'));
const ReferralsCodes = lazy(() => import('./pages/Referrals/Codes'));
const ReferralsCodeDetail = lazy(() => import('./pages/Referrals/CodeDetail'));
const ControlTower = lazy(() => import('./pages/ControlTower'));
const ControlTowerOutbound = lazy(() => import('./pages/ControlTower/Outbound'));
const ControlTowerInbound = lazy(() => import('./pages/ControlTower/Inbound'));
const ControlTowerExceptions = lazy(() => import('./pages/ControlTower/Exceptions'));
const FulfillmentOverview = lazy(() => import('./pages/Fulfillment/Overview'));
const FulfillmentPicking = lazy(() => import('./pages/Fulfillment/Picking'));
const FulfillmentShipments = lazy(() => import('./pages/Fulfillment/Shipments'));
const FulfillmentShipmentDetail = lazy(() => import('./pages/Fulfillment/ShipmentDetail'));
const FulfillmentExceptions = lazy(() => import('./pages/Fulfillment/Exceptions'));
const FulfillmentReturns = lazy(() => import('./pages/Fulfillment/Returns'));
const Accounting = lazy(() => import('./pages/Accounting'));
const AccountingAccounts = lazy(() => import('./pages/Accounting/Accounts'));
const AccountingJournals = lazy(() => import('./pages/Accounting/Journals'));
const AccountingEntries = lazy(() => import('./pages/Accounting/Entries'));
const AccountingPayables = lazy(() => import('./pages/Accounting/Payables'));
const AccountingReceivables = lazy(() => import('./pages/Accounting/Receivables'));
const AccountingTreasury = lazy(() => import('./pages/Accounting/Treasury'));
const AccountingStatements = lazy(() => import('./pages/Accounting/Statements'));
const AccountingGuide = lazy(() => import('./pages/Accounting/Guide'));
const PayrollOverview = lazy(() => import('./pages/Payroll'));
const PayrollEmployees = lazy(() => import('./pages/Payroll/Employees'));
const PayrollAttendance = lazy(() => import('./pages/Payroll/Attendance'));
const PayrollSalaryStructures = lazy(() => import('./pages/Payroll/SalaryStructures'));
const PayrollRuns = lazy(() => import('./pages/Payroll/Runs'));
const PayrollPayslips = lazy(() => import('./pages/Payroll/Payslips'));
const PayrollSettings = lazy(() => import('./pages/Payroll/Settings'));
const StorefrontOverview = lazy(() => import('./pages/Storefront'));
const StorefrontTheme = lazy(() => import('./pages/Storefront/Theme'));
const StorefrontPages = lazy(() => import('./pages/Storefront/Pages'));
const StorefrontNavigation = lazy(() => import('./pages/Storefront/Navigation'));
const StorefrontPublish = lazy(() => import('./pages/Storefront/Publish'));
const StorefrontCustomers = lazy(() => import('./pages/Storefront/Customers'));
const StorefrontMenus = lazy(() => import('./pages/Storefront/Menus'));
const StorefrontAnalytics = lazy(() => import('./pages/Storefront/Analytics'));
const StorefrontPagesManager = lazy(() => import('./pages/Storefront/PagesManager'));
const SuperAdminTenants = lazy(() => import('./pages/SuperAdmin/Tenants'));
const SuperAdminVirtualTryOn = lazy(() => import('./pages/SuperAdmin/VirtualTryOn'));
const PluginsOverview = lazy(() => import('./pages/Plugins'));
const ShopifyPlugin = lazy(() => import('./pages/Plugins/Shopify'));
const PluginLogs = lazy(() => import('./pages/Plugins/Logs'));
const PosTerminal = lazy(() => import('./pages/POS'));
const PosCounters = lazy(() => import('./pages/POSCounters'));
const PosRegister = lazy(() => import('./pages/POSRegister'));
const PosSales = lazy(() => import('./pages/POSSales'));
const PosSettlement = lazy(() => import('./pages/POSSettlement'));
const AnalyticsOverview = lazy(() => import('./pages/Analytics'));
const AnalyticsReports = lazy(() => import('./pages/Analytics/Reports'));
const AnalyticsDataExchange = lazy(() => import('./pages/Analytics/DataExchange'));
const AnalyticsAutomation = lazy(() => import('./pages/Analytics/Automation'));
const Settings = lazy(() => import('./pages/Settings'));
const SettingsSectionPage = lazy(() => import('./pages/Settings/SectionPage'));

const SETTINGS_DEFAULT_SECTION = 'general';

// Protected Route Wrapper
const ProtectedRoute = ({ children, permission, superAdminOnly = false }) => {
  const { hasPermission, isSuperAdmin, isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  // Force password change before doing anything else inside protected area
  if (isAuthenticated && mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (superAdminOnly && !isSuperAdmin) {
    return (
      <MainLayout>
        <NotAuthorized />
      </MainLayout>
    );
  }

  // If permission is required check it
  if (permission && !hasPermission(permission)) {
    return (
      <MainLayout>
        <NotAuthorized />
      </MainLayout>
    );
  }

  return <MainLayout>{children}</MainLayout>;
};

// Authenticated-only wrapper (no permission gate, no MainLayout).
// Used for /change-password which must be reachable as soon as the user has a token.
const AuthOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <AppLoadingScreen
        message="Initializing session..."
        caption="Verifying access, loading tenant settings, and assembling your inventory workspace."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const StorefrontModuleRoute = ({ children }) => {
  const { storefrontEnabled, storefrontResolved } = useStorefrontModule();

  if (!storefrontResolved) {
    return (
      <AppLoadingScreen
        message="Loading storefront access..."
        caption="Checking tenant storefront licensing and workspace availability."
      />
    );
  }

  if (!storefrontEnabled) {
    return <StorefrontModuleUnavailable />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL}>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

            {/* Authenticated but no-permission route — must be reachable before any guard kicks in */}
            <Route path="/change-password" element={
              <AuthOnlyRoute>
                <ChangePassword />
              </AuthOnlyRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={
              <ProtectedRoute permission={PERMISSIONS.MENU_DASHBOARD}>
                <Dashboard />
              </ProtectedRoute>
            } />

          <Route path="/users" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_USER_MANAGEMENT}>
              <Users />
            </ProtectedRoute>
          } />

          <Route path="/users/new" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_USER_MANAGEMENT}>
              <CreateStaff />
            </ProtectedRoute>
          } />

          <Route path="/users/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_USER_MANAGEMENT}>
              <UserDetails />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/roles" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_USER_MANAGEMENT}>
              <Roles />
            </ProtectedRoute>
          } />

          {/* Inventory Core */}
          <Route path="/inventory" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_INVENTORY_CORE}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/warehouses" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_INVENTORY_CORE}>
              <Warehouses />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_INVENTORY_CORE}>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <OrdersDetail />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <OrdersList />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <Navigate to="/analytics/overview" replace />
            </ProtectedRoute>
          } />
          <Route path="/accounting" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <Accounting />
            </ProtectedRoute>
          } />
          <Route path="/accounting/accounts" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingAccounts />
            </ProtectedRoute>
          } />
          <Route path="/accounting/journals" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingJournals />
            </ProtectedRoute>
          } />
          <Route path="/accounting/entries" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingEntries />
            </ProtectedRoute>
          } />
          <Route path="/accounting/payables" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingPayables />
            </ProtectedRoute>
          } />
          <Route path="/accounting/receivables" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingReceivables />
            </ProtectedRoute>
          } />
          <Route path="/accounting/treasury" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingTreasury />
            </ProtectedRoute>
          } />
          <Route path="/accounting/statements" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingStatements />
            </ProtectedRoute>
          } />
          <Route path="/accounting/guide" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ACCOUNTING}>
              <AccountingGuide />
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollOverview />
            </ProtectedRoute>
          } />
          <Route path="/payroll/employees" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollEmployees />
            </ProtectedRoute>
          } />
          <Route path="/payroll/attendance" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollAttendance />
            </ProtectedRoute>
          } />
          <Route path="/payroll/salary-structures" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollSalaryStructures />
            </ProtectedRoute>
          } />
          <Route path="/payroll/runs" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollRuns />
            </ProtectedRoute>
          } />
          <Route path="/payroll/payslips" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollPayslips />
            </ProtectedRoute>
          } />
          <Route path="/payroll/settings" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PAYROLL}>
              <PayrollSettings />
            </ProtectedRoute>
          } />
          <Route path="/plugins" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <PluginsOverview />
            </ProtectedRoute>
          } />
          <Route path="/storefront" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontOverview />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/theme" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontTheme />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/pages" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontPages />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/navigation" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontNavigation />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/menus" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontMenus />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/publish" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontPublish />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/customers" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontCustomers />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/analytics" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontAnalytics />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/storefront/pages-manager" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <StorefrontModuleRoute>
                <StorefrontPagesManager />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/super-admin/tenants" element={
            <ProtectedRoute superAdminOnly>
              <SuperAdminTenants />
            </ProtectedRoute>
          } />
          <Route path="/super-admin/virtual-try-on" element={
            <ProtectedRoute superAdminOnly>
              <SuperAdminVirtualTryOn />
            </ProtectedRoute>
          } />
          <Route path="/plugins/shopify" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <ShopifyPlugin />
            </ProtectedRoute>
          } />
          <Route path="/plugins/logs" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <PluginLogs />
            </ProtectedRoute>
          } />
          <Route path="/analytics/overview" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <AnalyticsOverview />
            </ProtectedRoute>
          } />
          <Route path="/analytics/reports" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <AnalyticsReports />
            </ProtectedRoute>
          } />
          <Route path="/analytics/data-exchange" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <AnalyticsDataExchange />
            </ProtectedRoute>
          } />
          <Route path="/analytics/automation" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <AnalyticsAutomation />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SETTINGS}>
              <Settings />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to={SETTINGS_DEFAULT_SECTION} replace />} />
            <Route path=":sectionId" element={<SettingsSectionPage />} />
          </Route>

          {/* Product & Catalog Management (Module 03) */}
          <Route path="/categories/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <CategoriesEditor />
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <CategoriesList />
            </ProtectedRoute>
          } />
          
          <Route path="/uoms" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <UnitsOfMeasure />
            </ProtectedRoute>
          } />

          <Route path="/products" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <Products />
            </ProtectedRoute>
          } />

          <Route path="/products/create" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <CreateProduct />
            </ProtectedRoute>
          } />

          <Route path="/products/create/simple" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <CreateSimpleProduct />
            </ProtectedRoute>
          } />

          <Route path="/products/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <ProductDetails />
            </ProtectedRoute>
          } />

          <Route path="/products/:id/edit" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <CreateProduct />
            </ProtectedRoute>
          } />

          <Route path="/attributes/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <AttributesEditor />
            </ProtectedRoute>
          } />

          <Route path="/attributes" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <AttributesList />
            </ProtectedRoute>
          } />

          <Route path="/attribute-groups" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <AttributeGroups />
            </ProtectedRoute>
          } />

          <Route path="/templates" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <Templates />
            </ProtectedRoute>
          } />

          {/* Advanced Inventory */}
          <Route path="/batches/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <BatchesDetail />
            </ProtectedRoute>
          } />
          <Route path="/batches" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <BatchesList />
            </ProtectedRoute>
          } />
          <Route path="/serials" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Serials />
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Reservations />
            </ProtectedRoute>
          } />
          <Route path="/replenishment" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Replenishment />
            </ProtectedRoute>
          } />
          <Route path="/cycle-counts/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <CycleCountsEntry />
            </ProtectedRoute>
          } />
          <Route path="/cycle-counts" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <CycleCountsList />
            </ProtectedRoute>
          } />
          <Route path="/valuation" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Valuation />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/incidents/new" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlIncidentEditor />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/incidents/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlIncidentEditor />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/incidents" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlIncidents />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/claims/new" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlClaimEditor />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/claims/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlClaimEditor />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/claims" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlClaims />
            </ProtectedRoute>
          } />
          <Route path="/damage-control/receiving" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlReceiving />
            </ProtectedRoute>
          } />
          <Route path="/damage-control" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControlOverview />
            </ProtectedRoute>
          } />

          <Route path="/purchase-requisitions" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}>
              <PurchaseRequisitions />
            </ProtectedRoute>
          } />

          <Route path="/warehouse-transfers" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_INVENTORY_CORE}>
              <WarehouseTransfers />
            </ProtectedRoute>
          } />

          {/* Procurement */}
          <Route path="/procurement" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}>
              <Procurement />
            </ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}>
              <Suppliers />
            </ProtectedRoute>
          } />
          <Route path="/purchase-orders" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}>
              <PurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/goods-receipts" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}>
              <GoodsReceipts />
            </ProtectedRoute>
          } />

          {/* Sales */}
          <Route path="/customers" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <Customers />
            </ProtectedRoute>
          } />
          <Route path="/sales-orders" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <SalesOrders />
            </ProtectedRoute>
          } />

          <Route path="/sales-orders/web" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <StorefrontModuleRoute>
                <SalesOrders mode="storefront" />
              </StorefrontModuleRoute>
            </ProtectedRoute>
          } />
          <Route path="/sales-orders/inbox" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <OrderInbox />
            </ProtectedRoute>
          } />
          <Route path="/couriers" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <Couriers />
            </ProtectedRoute>
          } />
          <Route path="/control-tower" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <ControlTower />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="outbound" replace />} />
            <Route path="outbound" element={<ControlTowerOutbound />} />
            <Route path="inbound" element={<ControlTowerInbound />} />
            <Route path="exceptions" element={<ControlTowerExceptions />} />
          </Route>
          <Route path="/refunds-exchanges/new" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <RefundsExchangesEditor />
            </ProtectedRoute>
          } />
          <Route path="/refunds-exchanges/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <RefundsExchangesDetail />
            </ProtectedRoute>
          } />
          <Route path="/refunds-exchanges" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <RefundsExchangesList />
            </ProtectedRoute>
          } />
          <Route path="/discounts/new" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsEditor />
            </ProtectedRoute>
          } />
          <Route path="/discounts/codes" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsCodes />
            </ProtectedRoute>
          } />
          <Route path="/discounts/analytics" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/discounts/preview" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsPreview />
            </ProtectedRoute>
          } />
          <Route path="/discounts/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsEditor />
            </ProtectedRoute>
          } />
          <Route path="/discounts" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <DiscountsList />
            </ProtectedRoute>
          } />
          <Route path="/gift-cards/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <GiftCardsDetail />
            </ProtectedRoute>
          } />
          <Route path="/gift-cards" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <GiftCardsList />
            </ProtectedRoute>
          } />
          <Route path="/referrals/codes/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <ReferralsCodeDetail />
            </ProtectedRoute>
          } />
          <Route path="/referrals/codes" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <ReferralsCodes />
            </ProtectedRoute>
          } />
          <Route path="/referrals" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <ReferralsProgram />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment/shipments/:id" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentShipmentDetail />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment/picking" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentPicking />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment/shipments" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentShipments />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment/exceptions" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentExceptions />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment/returns" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentReturns />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <FulfillmentOverview />
            </ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <PosTerminal />
            </ProtectedRoute>
          } />
          <Route path="/pos/register" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <PosRegister />
            </ProtectedRoute>
          } />
          <Route path="/pos/settlement" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <PosSettlement />
            </ProtectedRoute>
          } />
          <Route path="/pos/sales" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <PosSales />
            </ProtectedRoute>
          } />
            <Route path="/pos/counters" element={
              <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
                <PosCounters />
              </ProtectedRoute>
            } />

          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

const RouteLoading = () => (
  <AppLoadingScreen
    message="Loading workspace..."
    caption="Preparing dashboard modules, inventory views, and operating context."
  />
);

// Not Authorized Component
const NotAuthorized = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
      gpp_bad
    </span>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
      Access Denied
    </h1>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">
      You do not have permission to access this page. Please contact your administrator if you believe this is an error.
    </p>
  </div>
);

const StorefrontModuleUnavailable = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <span className="material-symbols-outlined mb-4 text-6xl text-slate-300 dark:text-slate-600">
      storefront
    </span>
    <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
      Storefront Module Disabled
    </h1>
    <p className="max-w-md text-slate-500 dark:text-slate-400">
      This tenant does not currently have the storefront module enabled, so storefront workspaces and web-order routes are blocked.
    </p>
  </div>
);

export default App;
