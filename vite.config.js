import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split('\\').join('/');

          if (normalizedId.includes('node_modules/react') || normalizedId.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }

          if (normalizedId.includes('node_modules/react-router') || normalizedId.includes('node_modules/@remix-run')) {
            return 'router-vendor';
          }

          if (normalizedId.includes('/src/pages/Analytics')) {
            return 'analytics-workspace';
          }

          if (normalizedId.includes('/src/pages/Products') || normalizedId.includes('/src/pages/Templates') || normalizedId.includes('/src/pages/Categories') || normalizedId.includes('/src/pages/Attributes') || normalizedId.includes('/src/pages/AttributeGroups') || normalizedId.includes('/src/pages/UnitsOfMeasure')) {
            return 'catalog-workspace';
          }

          if (normalizedId.includes('/src/pages/Inventory') || normalizedId.includes('/src/pages/Warehouses') || normalizedId.includes('/src/pages/Transactions') || normalizedId.includes('/src/pages/WarehouseTransfers') || normalizedId.includes('/src/pages/Batches') || normalizedId.includes('/src/pages/Serials') || normalizedId.includes('/src/pages/Reservations') || normalizedId.includes('/src/pages/Replenishment') || normalizedId.includes('/src/pages/CycleCounts') || normalizedId.includes('/src/pages/Valuation') || normalizedId.includes('/src/pages/DamageControl')) {
            return 'inventory-workspace';
          }

          if (normalizedId.includes('/src/pages/Suppliers') || normalizedId.includes('/src/pages/PurchaseOrders') || normalizedId.includes('/src/pages/GoodsReceipts') || normalizedId.includes('/src/pages/PurchaseRequisitions')) {
            return 'procurement-workspace';
          }

          if (normalizedId.includes('/src/pages/POS') || normalizedId.includes('/src/pages/POSRegister') || normalizedId.includes('/src/pages/POSSettlement') || normalizedId.includes('/src/pages/POSSales') || normalizedId.includes('/src/pages/POSCounters') || normalizedId.includes('/src/pages/Customers') || normalizedId.includes('/src/pages/SalesOrders') || normalizedId.includes('/src/pages/RefundsExchanges') || normalizedId.includes('/src/pages/PromotionsPricing') || normalizedId.includes('/src/pages/Fulfillment') || normalizedId.includes('/src/services/posService') || normalizedId.includes('/src/services/promotionService')) {
            return 'commercial-workspace';
          }
        },
      },
    },
  },
})
