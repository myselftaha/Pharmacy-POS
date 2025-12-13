import React, { useState } from 'react';
import {
    Building2,
    Bell,
    Shield,
    Palette,
    Database,
    Mail,
    Printer,
    Globe,
    DollarSign,
    Users,
    Save
} from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        // General Settings
        pharmacyName: 'MedKitPOS Pharmacy',
        address: '123 Healthcare Street, Medical District',
        phone: '+1 234 567 8900',
        email: 'contact@medkitpos.com',
        website: 'www.medkitpos.com',

        // Business Settings
        taxRate: 8.5,
        currency: 'USD',
        timezone: 'America/New_York',

        // Notification Settings
        emailNotifications: true,
        smsNotifications: false,
        lowStockAlerts: true,
        expiryAlerts: true,

        // Display Settings
        theme: 'light',
        language: 'English',
        dateFormat: 'MM/DD/YYYY',

        // Receipt Settings
        printReceipts: true,
        emailReceipts: true,
        showLogo: true,
        footerText: 'Thank you for your business!'
    });

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        console.log('Saving settings:', settings);
        alert('Settings saved successfully!');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                >
                    <Save size={18} />
                    <span>Save Changes</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Information */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="text-blue-600" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">General Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Pharmacy Name</label>
                            <input
                                type="text"
                                value={settings.pharmacyName}
                                onChange={(e) => handleChange('pharmacyName', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <input
                                type="text"
                                value={settings.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                                type="tel"
                                value={settings.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                            <input
                                type="url"
                                value={settings.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Business Settings */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="text-green-600" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Business Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.taxRate}
                                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                            <select
                                value={settings.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            >
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                                <option value="CAD">CAD - Canadian Dollar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                            <select
                                value={settings.timezone}
                                onChange={(e) => handleChange('timezone', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            >
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Bell className="text-purple-600" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Email Notifications</div>
                                <div className="text-sm text-gray-500">Receive notifications via email</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifications}
                                    onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">SMS Notifications</div>
                                <div className="text-sm text-gray-500">Receive notifications via SMS</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.smsNotifications}
                                    onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Low Stock Alerts</div>
                                <div className="text-sm text-gray-500">Get notified when stock is low</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.lowStockAlerts}
                                    onChange={(e) => handleChange('lowStockAlerts', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Expiry Alerts</div>
                                <div className="text-sm text-gray-500">Get notified about expiring medicines</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.expiryAlerts}
                                    onChange={(e) => handleChange('expiryAlerts', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Receipt Settings */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Printer className="text-orange-600" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Receipt Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Print Receipts</div>
                                <div className="text-sm text-gray-500">Automatically print receipts</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.printReceipts}
                                    onChange={(e) => handleChange('printReceipts', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Email Receipts</div>
                                <div className="text-sm text-gray-500">Send receipts via email</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.emailReceipts}
                                    onChange={(e) => handleChange('emailReceipts', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800">Show Logo</div>
                                <div className="text-sm text-gray-500">Display logo on receipts</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showLogo}
                                    onChange={(e) => handleChange('showLogo', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
                            <textarea
                                value={settings.footerText}
                                onChange={(e) => handleChange('footerText', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Shield className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Security & Privacy</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        Change Password
                    </button>
                    <button className="px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        Two-Factor Authentication
                    </button>
                    <button className="px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        Backup Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
