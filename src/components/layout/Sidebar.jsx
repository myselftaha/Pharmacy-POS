import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    ShoppingBag,
    Clock,
    Package,
    Users,
    Settings,
    LogOut,
    Stethoscope,
    Ticket,
    UserCircle,
    UsersRound,
    LayoutGrid,
    ClipboardList,
    RotateCcw,
    AlertTriangle,
    DollarSign,
    FileText
} from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        {
            section: 'MAIN MENU', items: [
                { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
                { icon: ShoppingBag, label: 'Sales', path: '/' },
                { icon: Clock, label: 'History', path: '/history' },
                { icon: Package, label: 'Supplies', path: '/supplies' },
                { icon: ClipboardList, label: 'Inventory', path: '/inventory' },
                { icon: RotateCcw, label: 'Returns', path: '/return' },
                { icon: DollarSign, label: 'Expenses', path: '/expenses' },
                { icon: FileText, label: 'Reports', path: '/reports' },
            ]
        },
        {
            section: 'GENERAL', items: [
                { icon: UserCircle, label: 'Users', path: '/users' },
                { icon: UsersRound, label: 'Customers', path: '/customers' },
                { icon: Ticket, label: 'Vouchers', path: '/vouchers' },
                { icon: Settings, label: 'Settings', path: '/settings' },
                { icon: Stethoscope, label: 'Community', path: '/community' },
            ]
        }
    ];

    return (
        <div className="w-64 h-screen bg-[#1a1f2c] text-gray-300 flex flex-col fixed left-0 top-0 overflow-y-auto">
            <div className="p-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">i</div>
                <h1 className="text-xl font-bold text-white">MedKitPOS</h1>
            </div>

            <div className="flex-1 px-4">
                {navItems.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <h2 className="text-xs font-semibold text-gray-500 mb-4 px-4">{section.section}</h2>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-[#2d3342] text-white border-l-4 border-green-500"
                                            : "hover:bg-[#2d3342] hover:text-white"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-800">
                <button className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2d3342] w-full rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span>Log out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
