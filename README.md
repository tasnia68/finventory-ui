# Mint & Slate Inventory Dashboard

A modern, responsive inventory management dashboard built with React, Vite, and Tailwind CSS.

## 🚀 Features

- **Authentication & User Management**
  - Secure Login with JWT
  - Role-Based Access Control (RBAC)
  - User Invitation Flow
  - Profile Management
  - User Administration (List, Create, Edit, Delete)
- **Dashboard Overview** with key metrics
- **Dark Mode** support
- **Responsive Design** for all devices

## 🛠️ Tech Stack

- **Frontend:** React, Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router DOM
- **State Management:** React Context (Auth, Theme)
- **Icons:** Material Symbols Outlined

## 📦 Reusable Components

Located in `src/components/common/`:

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, danger, ghost variants with loading state |
| `Input` | Form input with validation and icons |
| `Select` | Dropdown selection component |
| `Card` | Content container with title and actions |
| `Badge` | Status indicators (success, warning, error, info) |
| `Modal` | Dialog overlays with backdrop |
| `DataTable` | Sorting, mapping, and listing data |
| `Alert` | Feedback messages (success, error, info) |

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🔐 Authentication Module

The application implements a full authentication flow as defined in `MODULE_01_AUTH_USER.md`.

- **Login:** `/login`
- **Accept Invitation:** `/accept-invitation?token=...`
- **Protected Routes:** All other routes require authentication.
- **API Configuration:** Base URL defaults to `http://localhost:8080/api/v1` (configurable via `VITE_API_URL`).