import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import History from './pages/History';
import Supplies from './pages/Supplies';
import Inventory from './pages/Inventory';
import SupplierDetails from './pages/SupplierDetails';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Users from './pages/Users';
import Customers from './pages/Customers';
import Vouchers from './pages/Vouchers';
import Return from './pages/Return';

import Expenses from './pages/Expenses';
import Report from './pages/Report';
import Staff from './pages/Staff';
import StaffEdit from './pages/StaffEdit';
import StaffPaySalary from './pages/StaffPaySalary';
import StaffAddAdvance from './pages/StaffAddAdvance';
import OwnerSetup from './pages/OwnerSetup';

function App() {
  const [setupStatus, setSetupStatus] = useState({ isSetupCompleted: false, loading: true });

  useEffect(() => {
    const checkSetup = async () => {
      try {
        console.log('Checking system setup status...');
        const response = await fetch('http://localhost:5000/api/system/status');
        const data = await response.json();
        console.log('Setup status received:', data);
        setSetupStatus({ isSetupCompleted: data.isSetupCompleted, loading: false });
      } catch (err) {
        console.error('Failed to check setup status', err);
        // On error, we assume it's true to allow login if backend is unreachable, 
        // but strictly false for the very first time.
        setSetupStatus({ isSetupCompleted: true, loading: false });
      }
    };
    checkSetup();
  }, []);

  if (setupStatus.loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const isSetup = setupStatus.isSetupCompleted;

  return (
    <Router>
      <Routes>
        {/* Setup & Login - Mutual Exclusivity based on setup status */}
        <Route
          path="/setup"
          element={isSetup ? <Navigate to="/login" replace /> : <OwnerSetup onComplete={() => setSetupStatus({ isSetupCompleted: true, loading: false })} />}
        />
        <Route
          path="/login"
          element={!isSetup ? <Navigate to="/setup" replace /> : <LoginPage />}
        />

        {/* Protected Routes - Only accessible if setup is completed */}
        <Route element={!isSetup ? <Navigate to="/setup" replace /> : <ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            {/* Common / Dashboard Access */}
            <Route element={<ProtectedRoute roles={['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper', 'Delivery Rider']} />}>
              <Route path="dashboard" element={<Dashboard />} />
            </Route>

            {/* Sales & History Access */}
            <Route element={<ProtectedRoute roles={['Admin', 'Super Admin', 'Pharmacist', 'Salesman / Counter Staff', 'Cashier']} />}>
              <Route index element={<Home />} />
              <Route path="history" element={<History />} />
              <Route path="customers" element={<Customers />} />
            </Route>

            {/* Inventory & Supplies Access */}
            <Route element={<ProtectedRoute roles={['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper']} />}>
              <Route path="supplies" element={<Supplies />} />
              <Route path="suppliers/:id" element={<SupplierDetails />} />
              <Route path="inventory" element={<Inventory />} />
            </Route>

            {/* Returns Access */}
            <Route element={<ProtectedRoute roles={['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper', 'Delivery Rider']} />}>
              <Route path="return" element={<Return />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute roles={['Admin', 'Super Admin']} />}>
              <Route path="staff" element={<Staff />} />
              <Route path="staff/:id/edit" element={<StaffEdit />} />
              <Route path="staff/:id/pay-salary" element={<StaffPaySalary />} />
              <Route path="staff/:id/add-advance" element={<StaffAddAdvance />} />
              <Route path="users" element={<Users />} />
              <Route path="reports" element={<Report />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="vouchers" element={<Vouchers />} />
            </Route>
          </Route>
        </Route>

        {/* Global Catch-all */}
        <Route path="*" element={<Navigate to={isSetup ? "/" : "/setup"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
