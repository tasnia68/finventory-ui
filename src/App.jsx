import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AcceptInvitation from './pages/AcceptInvitation';
import Users from './pages/Users';
import UserDetails from './pages/Users/UserDetails';
import Profile from './pages/Profile';
import Roles from './pages/Roles';
import Categories from './pages/Categories';
import UnitsOfMeasure from './pages/UnitsOfMeasure';
import Products from './pages/Products';
import CreateProduct from './pages/Products/CreateProduct';
import CreateSimpleProduct from './pages/Products/CreateSimpleProduct';
import ProductDetails from './pages/Products/ProductDetails';
import Attributes from './pages/Attributes';
import AttributeGroups from './pages/AttributeGroups';
import Templates from './pages/Templates';
import Batches from './pages/Batches';
import Serials from './pages/Serials';
import Reservations from './pages/Reservations';
import Replenishment from './pages/Replenishment';
import PurchaseRequisitions from './pages/PurchaseRequisitions';
import CycleCounts from './pages/CycleCounts';
import WarehouseTransfers from './pages/WarehouseTransfers';
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';
import Transactions from './pages/Transactions';
import Valuation from './pages/Valuation';
import { PERMISSIONS } from './constants/permissions';

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
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Orders Page</h1></div>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_ANALYTICS}>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Analytics Page</h1></div>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute permission={PERMISSIONS.MENU_SETTINGS}>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Settings Page</h1></div>
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
          {['/suppliers', '/purchase-orders'].map(path => (
            <Route key={path} path={path} element={<ProtectedRoute permission={PERMISSIONS.MENU_PROCUREMENT}><div className="p-8"><h1 className="text-2xl font-bold dark:text-white capitalize">{path.replace('/', '')}</h1></div></ProtectedRoute>} />
          ))}

          {/* Sales */}
          {['/pos'].map(path => (
            <Route key={path} path={path} element={<ProtectedRoute permission={PERMISSIONS.MENU_SALES}><div className="p-8"><h1 className="text-2xl font-bold dark:text-white capitalize">{path.replace('/', '')}</h1></div></ProtectedRoute>} />
          ))}

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

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
