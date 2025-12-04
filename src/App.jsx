import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import History from './pages/History';
import Supplies from './pages/Supplies';
import Waitlist from './pages/Waitlist';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Vouchers from './pages/Vouchers';

import Settings from './pages/Settings';
import Community from './pages/Community';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="history" element={<History />} />
          <Route path="supplies" element={<Supplies />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="users" element={<Users />} />
          <Route path="customers" element={<Customers />} />
          <Route path="vouchers" element={<Vouchers />} />

          <Route path="settings" element={<Settings />} />
          <Route path="community" element={<Community />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
