# 🎨 Building New Pages Guide

This guide will help you create new pages in the Mint & Slate Inventory system while maintaining consistent design and reusing existing components.

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/        # Page-specific components
│   └── layout/          # Layout components (Header, Sidebar, MainLayout)
├── contexts/            # React contexts (ThemeContext)
├── pages/              # Page components
│   └── Dashboard/
│       └── index.jsx
└── App.jsx
```

## 🎯 Quick Start: Creating a New Page

### 1. Create Your Page Component

Create a new folder in `src/pages/` with an `index.jsx` file:

```jsx
// src/pages/Inventory/index.jsx
import React from 'react';

const Inventory = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Inventory
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage your products and stock levels
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Product</span>
          </button>
        </div>

        {/* Your content here */}
      </div>
    </div>
  );
};

export default Inventory;
```

### 2. Update App.jsx

Add your new page to the main App:

```jsx
// src/App.jsx
import React from 'react';
import MainLayout from './components/layout/MainLayout';
import Inventory from './pages/Inventory';

function App() {
  return (
    <MainLayout>
      <Inventory />
    </MainLayout>
  );
}

export default App;
```

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--color-primary: #135bec          /* Brand blue */

/* Backgrounds */
--color-background-light: #f6f6f8  /* Light mode background */
--color-background-dark: #101622   /* Dark mode background */

/* Slate Scale (for text, borders, cards) */
slate-50  → slate-900  /* Light to dark shades */

/* Accent Colors */
mint-500, mint-600, mint-700       /* Success/growth indicators */
orange-400, orange-500, orange-600 /* Warnings/alerts */
```

### Common Class Patterns

#### Card Component
```jsx
<div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
  {/* Card content */}
</div>
```

#### Page Container
```jsx
<div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
  <div className="max-w-7xl mx-auto flex flex-col gap-8">
    {/* Page content */}
  </div>
</div>
```

#### Primary Button
```jsx
<button className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-primary/30">
  <span className="material-symbols-outlined text-[20px]">icon_name</span>
  <span>Button Text</span>
</button>
```

#### Secondary Button
```jsx
<button className="py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
  Button Text
</button>
```

#### Search Input
```jsx
<div className="relative w-full max-w-md">
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
  </div>
  <input 
    className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" 
    placeholder="Search..." 
    type="text"
  />
</div>
```

## 🧩 Reusable Components

### Stats Card Component

Create reusable stat cards for metrics:

```jsx
// src/components/common/StatCard.jsx
import React from 'react';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  iconColor = 'text-primary',
  trend,
  trendLabel,
  trendType = 'positive' // 'positive', 'negative', 'neutral'
}) => {
  const trendColors = {
    positive: 'text-mint-600',
    negative: 'text-red-600',
    neutral: 'text-slate-500'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
      {/* Background Icon */}
      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className={`material-symbols-outlined ${iconColor} text-[64px]`}>
          {icon}
        </span>
      </div>
      
      {/* Content */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          {title}
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {value}
        </p>
      </div>
      
      {/* Trend */}
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trendType]}`}>
          <span className="material-symbols-outlined text-[16px]">
            {trendType === 'positive' ? 'trending_up' : 'trending_down'}
          </span>
          <span>{trend}</span>
          {trendLabel && (
            <span className="text-slate-400 font-normal ml-1">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
```

**Usage:**
```jsx
<StatCard
  title="Total Items"
  value="12,450"
  icon="inventory_2"
  iconColor="text-primary"
  trend="+5.2%"
  trendLabel="vs last month"
  trendType="positive"
/>
```

### Section Card Component

```jsx
// src/components/common/SectionCard.jsx
import React from 'react';

const SectionCard = ({ title, action, children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
```

**Usage:**
```jsx
<SectionCard 
  title="Recent Activity"
  action={<button className="text-sm text-primary">View All</button>}
>
  {/* Your content */}
</SectionCard>
```

## 🌙 Dark Mode Support

**Always include dark mode variants!** Use the `dark:` prefix for all color-related classes:

```jsx
// ✅ Good - Includes dark mode
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">

// ❌ Bad - No dark mode support
<div className="bg-white text-slate-900">
```

### Common Dark Mode Patterns

```jsx
// Text
className="text-slate-900 dark:text-white"                 // Primary text
className="text-slate-600 dark:text-slate-300"            // Secondary text
className="text-slate-500 dark:text-slate-400"            // Muted text

// Backgrounds
className="bg-white dark:bg-slate-800"                     // Card background
className="bg-slate-50 dark:bg-slate-900"                 // Subtle background
className="bg-background-light dark:bg-background-dark"   // Page background

// Borders
className="border-slate-200 dark:border-slate-700"        // Standard border
className="border-slate-300 dark:border-slate-600"        // Emphasized border
```

## 📊 Layout Patterns

### Grid Layouts

```jsx
{/* 4-column grid (responsive) */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Stats cards */}
</div>

{/* 2/3 - 1/3 split */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Chart */}</div>
  <div className="lg:col-span-1">{/* Sidebar */}</div>
</div>
```

### Flexbox Patterns

```jsx
{/* Page header with action button */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>{/* Title and description */}</div>
  <button>{/* Action button */}</button>
</div>

{/* Centered content */}
<div className="flex items-center justify-center gap-2">
  {/* Icon and text */}
</div>
```

## 🎯 Common Use Cases

### Data Table

```jsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
      Recent Items
    </h3>
  </div>
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
      <thead className="bg-slate-50 dark:bg-slate-900">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Name
          </th>
          {/* More headers */}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
            Item 1
          </td>
          {/* More cells */}
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Progress Bar

```jsx
<div>
  <div className="flex justify-between text-sm font-medium mb-2">
    <span className="text-slate-700 dark:text-slate-300">Electronics</span>
    <span className="text-slate-900 dark:text-white">45%</span>
  </div>
  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
    <div className="bg-primary h-2.5 rounded-full" style={{ width: '45%' }}></div>
  </div>
</div>
```

### Badge

```jsx
{/* Status badge */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mint-100 dark:bg-mint-900/30 text-mint-800 dark:text-mint-400">
  Active
</span>

<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
  Pending
</span>
```

## 🔤 Typography

```jsx
{/* Page Title */}
<h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
  Page Title
</h1>

{/* Section Title */}
<h2 className="text-xl font-bold text-slate-900 dark:text-white">
  Section Title
</h2>

{/* Card Title */}
<h3 className="text-lg font-bold text-slate-900 dark:text-white">
  Card Title
</h3>

{/* Body Text */}
<p className="text-slate-600 dark:text-slate-300">
  Regular paragraph text
</p>

{/* Muted Text */}
<p className="text-slate-500 dark:text-slate-400 text-sm">
  Secondary information
</p>
```

## 🎭 Icons

We use **Material Symbols Outlined**. Common icons:

```jsx
<span className="material-symbols-outlined">add</span>
<span className="material-symbols-outlined">search</span>
<span className="material-symbols-outlined">inventory_2</span>
<span className="material-symbols-outlined">shopping_bag</span>
<span className="material-symbols-outlined">trending_up</span>
<span className="material-symbols-outlined">warning</span>
<span className="material-symbols-outlined">notifications</span>
<span className="material-symbols-outlined">dark_mode</span>
<span className="material-symbols-outlined">light_mode</span>
```

## ✅ Best Practices

1. **Always wrap pages** with the page container pattern (flex-1, overflow-y-auto, p-8)
2. **Use max-w-7xl** for content to prevent excessive width on large screens
3. **Include dark mode** for all color-related classes
4. **Use gap utilities** instead of margins for spacing between elements
5. **Make it responsive** - test with `sm:`, `md:`, `lg:` breakpoints
6. **Add transitions** to buttons and interactive elements for smooth UX
7. **Use semantic HTML** - h1, h2, h3 for headings, main, section, article where appropriate
8. **Consistent spacing** - Use gap-4 (1rem), gap-6 (1.5rem), gap-8 (2rem) for consistency

## 🚀 Example: Complete New Page

```jsx
// src/pages/Orders/index.jsx
import React from 'react';
import StatCard from '../../components/common/StatCard';
import SectionCard from '../../components/common/SectionCard';

const Orders = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Orders
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Track and manage customer orders
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-primary/30">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Order</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value="1,234"
            icon="shopping_bag"
            iconColor="text-primary"
            trend="+12%"
            trendLabel="this month"
            trendType="positive"
          />
          {/* More stat cards */}
        </div>

        {/* Orders Table */}
        <SectionCard title="Recent Orders">
          {/* Table content */}
        </SectionCard>
      </div>
    </div>
  );
};

export default Orders;
```

---

## 📚 Next Steps

1. Check existing components in `src/components/` for reference
2. Study the Dashboard page for layout patterns
3. Test your page in both light and dark modes
4. Ensure mobile responsiveness

**Happy building! 🎨**
