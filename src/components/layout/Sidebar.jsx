import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    Clock,
    Package,
    Users,
    LogOut,
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

const Sidebar = ({ isHoveredExternally }) => {
    const navigate = useNavigate();
    const [isInternalHover, setIsInternalHover] = useState(false);
    const isHovered = isHoveredExternally !== undefined ? isHoveredExternally : isInternalHover;
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const role = user?.role;

    const navItems = [
        {
            section: 'MAIN MENU', items: [
                { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper', 'Delivery Rider'] },
                { icon: ShoppingBag, label: 'Sales', path: '/pos', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Salesman / Counter Staff', 'Cashier'] },
                { icon: UsersRound, label: 'Customers', path: '/customers', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Salesman / Counter Staff', 'Cashier'] },
                { icon: Clock, label: 'History', path: '/history', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Salesman / Counter Staff', 'Cashier'] },
                { icon: Package, label: 'Supplies', path: '/supplies', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper'] },
                { icon: ClipboardList, label: 'Inventory', path: '/inventory', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper'] },
                { icon: RotateCcw, label: 'Returns', path: '/return', allowedRoles: ['Admin', 'Super Admin', 'Pharmacist', 'Store Keeper', 'Delivery Rider'] },
            ]
        },
        {
            section: 'GENERAL', items: [
                { icon: Users, label: 'Staff', path: '/staff', requiresAdmin: true },
                { icon: UserCircle, label: 'Users', path: '/users', requiresAdmin: true },
                { icon: Ticket, label: 'Vouchers', path: '/vouchers', requiresAdmin: true },
                { icon: FileText, label: 'Reports', path: '/reports', requiresAdmin: true },
                { icon: DollarSign, label: 'Expenses', path: '/expenses', requiresAdmin: true },
            ]
        }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <motion.div
            initial={false}
            animate={{
                width: isHovered ? 256 : 80
            }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1,
                restDelta: 0.001
            }}
            onMouseEnter={() => setIsInternalHover(true)}
            onMouseLeave={() => setIsInternalHover(false)}
            className="h-screen bg-[#1a1f2c] text-gray-300 flex flex-col fixed left-0 top-0 overflow-hidden z-50 shadow-2xl border-r border-gray-800"
        >
            {/* Logo Section */}
            <div className="p-4 py-6 flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-green-500/20">i</div>
                <AnimatePresence>
                    {isHovered && (
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-xl font-bold text-white whitespace-nowrap"
                        >
                            MedKitPOS
                        </motion.h1>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-3 overflow-y-auto scrollbar-hide py-2">
                {navItems.map((section, idx) => (
                    <div key={idx} className="mb-8">
                        <AnimatePresence>
                            {isHovered && (
                                <motion.h2
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-[10px] font-bold text-gray-500 mb-3 px-3 uppercase tracking-widest whitespace-nowrap"
                                >
                                    {section.section}
                                </motion.h2>
                            )}
                        </AnimatePresence>
                        <div className="space-y-1.5">
                            {section.items.map((item) => {
                                const isAdmin = role === 'Admin' || role === 'Super Admin';
                                if (item.requiresAdmin && !isAdmin) return null;
                                if (item.allowedRoles && !item.allowedRoles.includes(role)) return null;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => clsx(
                                            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-green-500/10 text-green-500 shadow-sm"
                                                : "hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <item.icon size={24} className={clsx("flex-shrink-0 transition-transform duration-200", isHovered ? "" : "group-hover:scale-110")} />
                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="font-medium whitespace-nowrap"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>

                                        {/* Tooltip for collapsed state */}
                                        {!isHovered && (
                                            <div className="absolute left-16 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-semibold shadow-xl border border-gray-700">
                                                {item.label}
                                            </div>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Logout Section */}
            <div className="p-3 border-t border-gray-800/50 bg-[#1a1f2c]">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-4 text-red-500 hover:bg-red-500/10 w-full rounded-xl transition-all duration-200 group relative"
                >
                    <LogOut size={24} className="flex-shrink-0 group-hover:rotate-12 transition-transform" />
                    <AnimatePresence>
                        {isHovered && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="font-bold whitespace-nowrap text-sm tracking-wide uppercase"
                            >
                                Log out
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {!isHovered && (
                        <div className="absolute left-16 bg-red-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-bold shadow-xl">
                            Log out
                        </div>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default Sidebar;
