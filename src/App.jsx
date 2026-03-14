import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import { PERMISSIONS } from './constants/permissions';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const Users = lazy(() => import('./pages/Users'));
const UserDetails = lazy(() => import('./pages/Users/UserDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Roles = lazy(() => import('./pages/Roles'));
const Categories = lazy(() => import('./pages/Categories'));
const UnitsOfMeasure = lazy(() => import('./pages/UnitsOfMeasure'));
const Products = lazy(() => import('./pages/Products'));
const CreateProduct = lazy(() => import('./pages/Products/CreateProduct'));
const CreateSimpleProduct = lazy(() => import('./pages/Products/CreateSimpleProduct'));
const ProductDetails = lazy(() => import('./pages/Products/ProductDetails'));
const Attributes = lazy(() => import('./pages/Attributes'));
const AttributeGroups = lazy(() => import('./pages/AttributeGroups'));
const Templates = lazy(() => import('./pages/Templates'));
const Batches = lazy(() => import('./pages/Batches'));
const Serials = lazy(() => import('./pages/Serials'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Replenishment = lazy(() => import('./pages/Replenishment'));
const DamageControl = lazy(() => import('./pages/DamageControl'));
const PurchaseRequisitions = lazy(() => import('./pages/PurchaseRequisitions'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const GoodsReceipts = lazy(() => import('./pages/GoodsReceipts'));
const CycleCounts = lazy(() => import('./pages/CycleCounts'));
const WarehouseTransfers = lazy(() => import('./pages/WarehouseTransfers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Valuation = lazy(() => import('./pages/Valuation'));
const Customers = lazy(() => import('./pages/Customers'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const RefundsExchanges = lazy(() => import('./pages/RefundsExchanges'));
const PromotionsPricing = lazy(() => import('./pages/PromotionsPricing'));
const Fulfillment = lazy(() => import('./pages/Fulfillment'));
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

// Protected Route Wrapper
const ProtectedRoute = ({ children, permission }) => {
  const { hasPermission } = useAuth();

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

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
          <Route path="/orders" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <Navigate to="/sales-orders" replace />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <Navigate to="/analytics/overview" replace />
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
          } />

          {/* Product & Catalog Management (Module 03) */}
          <Route path="/categories" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <Categories />
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

          <Route path="/attributes" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_CATALOG}>
              <Attributes />
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
          <Route path="/batches" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Batches />
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
          <Route path="/cycle-counts" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <CycleCounts />
            </ProtectedRoute>
          } />
          <Route path="/valuation" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <Valuation />
            </ProtectedRoute>
          } />
          <Route path="/damage-control" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ADVANCED_INVENTORY}>
              <DamageControl />
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
          <Route path="/refunds-exchanges" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <RefundsExchanges />
            </ProtectedRoute>
          } />
          <Route path="/promotions-pricing" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <PromotionsPricing />
            </ProtectedRoute>
          } />
          <Route path="/fulfillment" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SALES}>
              <Fulfillment />
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
  <div className="flex min-h-screen items-center justify-center bg-background-light px-6 dark:bg-background-dark">
    <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-4 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
      Loading workspace...
    </div>
  </div>
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

export default App;
