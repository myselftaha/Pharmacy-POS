import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const MainLayout = ({ action }) => {
    const location = useLocation();
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/pos': return { title: 'POS Terminal', subtitle: 'Sales & Inventory' };
            case '/history': return { title: 'Sales History', subtitle: 'Sales History' };
            case '/supplies': return { title: 'Supplies Management', subtitle: 'Supplies Management' };
            case '/expenses': return { title: 'Expense Management', subtitle: 'Track Shop Expenses' };
            case '/reports': return { title: 'Profit & Loss Report', subtitle: 'Financial Overview' };
            case '/users': return { title: 'User Management', subtitle: 'User Management' };
            case '/customers': return { title: 'Customer Management', subtitle: 'Customer Management' };
            case '/vouchers': return { title: 'Voucher Management', subtitle: 'Voucher Management' };
            default: return { title: 'Dashboard', subtitle: 'Dashboard' };
        }
    };

    const { title, subtitle } = getPageTitle(location.pathname);

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <motion.div
                initial={false}
                animate={{ width: isSidebarHovered ? 256 : 80 }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 1
                }}
                onMouseEnter={() => setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
                className="fixed left-0 top-0 h-full z-50 overflow-visible"
            >
                <Sidebar isHoveredExternally={isSidebarHovered} />
            </motion.div>
            <motion.div
                animate={{ marginLeft: isSidebarHovered ? 256 : 80 }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 1
                }}
                className="flex-1 flex flex-col max-h-screen overflow-hidden"
            >
                <Header title={title} subtitle={subtitle} action={action} />
                <main className="p-8 flex-1 overflow-auto">
                    <Outlet />
                </main>
            </motion.div>
        </div>
    );
};

export default MainLayout;
