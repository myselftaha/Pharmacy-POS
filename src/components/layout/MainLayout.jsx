import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';

const MainLayout = ({ action }) => {
    const location = useLocation();

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/': return { title: 'Patient Waitlist', subtitle: 'Patient Waitlist' }; // Defaulting to Waitlist as per screenshot, or maybe Home?
            // Wait, Home is usually POS. Screenshot 1 shows "MyCodeSpace Patient Waitlist".
            // Screenshot 4 shows "MyCodeSpace Supplies Management".
            // Screenshot 2 shows "MyCodeSpace User Management".
            // So the title is "MyCodeSpace" and subtitle is the page name.
            case '/history': return { title: 'Sales History', subtitle: 'Sales History' };
            case '/supplies': return { title: 'Supplies Management', subtitle: 'Supplies Management' };

            case '/users': return { title: 'User Management', subtitle: 'User Management' };
            case '/customers': return { title: 'Customer Management', subtitle: 'Customer Management' };
            case '/vouchers': return { title: 'Voucher Management', subtitle: 'Voucher Management' };
            case '/prescriptions': return { title: 'Prescription Management', subtitle: 'Prescription Management' };
            case '/settings': return { title: 'System Settings', subtitle: 'System Settings' };
            case '/community': return { title: 'Community Forum', subtitle: 'Community Forum' };
            default: return { title: 'Dashboard', subtitle: 'Dashboard' };
        }
    };

    const { title, subtitle } = getPageTitle(location.pathname);

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col max-h-screen overflow-hidden">
                <Header title={title} subtitle={subtitle} action={action} />
                <main className="p-8 flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
