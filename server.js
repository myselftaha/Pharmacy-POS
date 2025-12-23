import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "*"
}));
app.use(express.json());

// Debug Middleware
app.use(async (req, res, next) => {
    // Ensure DB is connected for every request (Serverless pattern)
    if (process.env.VERCEL) {
        await connectDB();
    }
    console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
    next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'medkit-pos-secure-secret-2025';

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: ['Admin', 'Pharmacist', 'Salesman / Counter Staff', 'Cashier', 'Store Keeper', 'Delivery Rider', 'Super Admin'],
        required: true
    },
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Auth & Security Middlewares
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Authentication required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

// MongoDB Connection
// MongoDB Connection Strategy for Serverless
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Important for serverless
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
            console.log('MongoDB Atlas Connected Successfully');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Call connectDB immediately for standard server, but in serverless it will be reused
// connectDB() call removed to prevent early connection


// Medicine Schema
const medicineSchema = new mongoose.Schema({
    id: Number,
    name: String,
    description: String,
    price: Number,
    stock: Number,
    unit: String,
    netContent: String,
    category: String,
    image: String,
    expiryDate: Date,
    costPrice: Number,
    minStock: Number,
    supplier: String,
    note: String,
    formulaCode: String, // Formula/Generic code for searching
    genericName: String, // Alternative to formula code
    shelfLocation: String, // Added for location tracking
    inInventory: { type: Boolean, default: false },
    status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] },
    sku: { type: String, unique: true, sparse: true },
    lastUpdated: { type: Date, default: Date.now },
    // Low Stock Intelligence Fields
    reorderLevel: { type: Number, default: 20 },
    reorderQuantity: { type: Number, default: 50 },
    preferredSupplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    lastPurchasePrice: Number,
    leadTimeDays: { type: Number, default: 7 },
    salesVelocity: { type: String, enum: ['Fast', 'Normal', 'Slow'], default: 'Normal' },
    averageDailySales: { type: Number, default: 0 },
    lastSalesCalculation: Date,
    barcodes: [{
        code: String,
        unit: String,
        packSize: { type: Number, default: 1 }
    }],
    packSize: { type: Number, default: 1 }, // Items per pack
    pricePerUnit: { type: Number, default: 0 }, // Selling price per single tablet
    // Advanced Supply Fields
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    boxNumber: String,
    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    igstPercentage: { type: Number, default: 0 }
});

const Medicine = mongoose.model('Medicine', medicineSchema);

// Customer Schema
const customerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    joinDate: String,
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0.0 },
    status: { type: String, default: 'Active' }
});

const Customer = mongoose.model('Customer', customerSchema);

// Voucher Schema
const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['Percentage', 'Fixed'], required: true },
    discountValue: { type: Number, required: true },
    minPurchase: { type: Number, default: 0 },
    maxDiscount: Number,
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usedCount: { type: Number, default: 0 },
    maxUses: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
    createdAt: { type: Date, default: Date.now }
});

const Voucher = mongoose.model('Voucher', voucherSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    billNumber: { type: Number, unique: true },
    type: { type: String, enum: ['Sale', 'Return'], default: 'Sale' },
    status: { type: String, enum: ['Posted', 'Voided'], default: 'Posted' }, // Added status
    voidReason: String,
    voidedAt: Date,
    voidedBy: String,
    originalTransactionId: String, // For returns linked to sales
    originalBillNumber: Number, // For returns linked to sales
    customer: {
        id: String,
        name: { type: String, required: true },
        email: String,
        phone: String,
        doctorName: String,
        billDate: String
    },
    items: [{
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        subtotal: Number,
        restock: { type: Boolean, default: true } // For returns: true = restock, false = write-off
    }],
    subtotal: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }, // Added Tax
    total: { type: Number, required: true },
    voucher: {
        code: String,
        discountType: String,
        discountValue: Number
    },
    paymentMethod: { type: String, default: 'Cash' },
    processedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Supply Schema (Purchase Record)
const supplySchema = new mongoose.Schema({
    medicineId: { type: String, required: true }, // Links to Medicine
    name: { type: String, required: true },
    batchNumber: { type: String, required: true },
    supplierName: { type: String, required: true },
    purchaseCost: { type: Number, required: true },
    purchaseInvoiceNumber: { type: String },
    manufacturingDate: Date,
    expiryDate: Date,
    quantity: { type: Number, required: true },
    freeQuantity: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    purchaseCost: { type: Number, required: true }, // Cost per Qty
    sellingPrice: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    itemAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgstPercentage: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstPercentage: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    payableAmount: { type: Number, default: 0 },
    boxNumber: String,
    notes: String,
    // Item-level payment tracking
    paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
    paidAmount: { type: Number, default: 0 },
    invoiceDueDate: Date, // Added Due Date
    addedDate: { type: Date, default: Date.now }, // Explicit date when added to invoice
    createdAt: { type: Date, default: Date.now }
});

const Supply = mongoose.model('Supply', supplySchema);

// Supplier Schema
const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactPerson: String,
    phone: String,
    email: String,
    address: String,
    totalPayable: { type: Number, default: 0 },
    creditBalance: { type: Number, default: 0 }, // Separated Credit Store
    createdAt: { type: Date, default: Date.now }
});

const Supplier = mongoose.model('Supplier', supplierSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['Cash', 'Bank Transfer', 'Check', 'Debit Note', 'Credit Adjustment', 'Supplier Credit', 'Cash Refund'], default: 'Cash' },
    note: String,
    createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// ItemPayment Schema - Track payments allocated to specific supply items
const itemPaymentSchema = new mongoose.Schema({
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supply', required: true },
    amount: { type: Number, required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    date: { type: Date, default: Date.now },
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

const ItemPayment = mongoose.model('ItemPayment', itemPaymentSchema);

// Batch Schema - Track individual batches with their own expiry, quantity, and status
const batchSchema = new mongoose.Schema({
    batchNumber: { type: String, required: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: String, // Denormalized for faster queries
    quantity: { type: Number, required: true, default: 0 },
    purchasedQuantity: Number, // Original quantity purchased
    expiryDate: { type: Date, required: true },
    purchaseDate: { type: Date, default: Date.now },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: String, // Denormalized
    costPrice: Number,
    sellingPrice: Number,
    status: {
        type: String,
        enum: ['Active', 'Blocked', 'Expired', 'Returned', 'WrittenOff'],
        default: 'Active'
    },
    discountPercentage: { type: Number, default: 0 }, // For expiring items
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound indexes for efficient queries
batchSchema.index({ medicineId: 1, expiryDate: 1 });
batchSchema.index({ status: 1, expiryDate: 1 });
batchSchema.index({ batchNumber: 1 });

const Batch = mongoose.model('Batch', batchSchema);

// Inventory Settings Schema - Global thresholds and configuration
const inventorySettingsSchema = new mongoose.Schema({
    globalMinStock: { type: Number, default: 10 },
    globalReorderLevel: { type: Number, default: 20 },
    globalReorderQuantity: { type: Number, default: 50 },
    salesVelocityPeriodDays: { type: Number, default: 30 },
    fastMovingThreshold: { type: Number, default: 10 }, // items/day
    slowMovingThreshold: { type: Number, default: 1 }, // items/day
    updatedAt: { type: Date, default: Date.now }
});

const InventorySettings = mongoose.model('InventorySettings', inventorySettingsSchema);

// System Settings Schema - Track one-time setup
const systemSettingSchema = new mongoose.Schema({
    isSetupCompleted: { type: Boolean, default: false },
    setupAt: Date,
    ownerName: String
});

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

// --- USER MANAGEMENT ROUTES ---

// System Status - Check if setup is completed
app.get('/api/system/status', async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = new SystemSetting({ isSetupCompleted: false });
            await settings.save();
        }
        console.log(`[DEBUG] System Setup Status: ${settings.isSetupCompleted}`);
        res.json({ isSetupCompleted: settings.isSetupCompleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// One-Time Owner Setup
app.post('/api/system/setup', async (req, res) => {
    try {
        const settings = await SystemSetting.findOne();
        if (settings && settings.isSetupCompleted) {
            return res.status(403).json({ message: 'System setup already completed' });
        }

        const { ownerName, username, password } = req.body;

        // Create Super Admin
        const passwordHash = await bcrypt.hash(password, 10);
        const owner = new User({
            username,
            passwordHash,
            role: 'Super Admin',
            permissions: ['all'],
            status: 'Active'
        });
        await owner.save();

        // Mark setup as completed
        if (settings) {
            settings.isSetupCompleted = true;
            settings.setupAt = new Date();
            settings.ownerName = ownerName;
            await settings.save();
        } else {
            const newSettings = new SystemSetting({
                isSetupCompleted: true,
                setupAt: new Date(),
                ownerName
            });
            await newSettings.save();
        }

        res.status(201).json({ message: 'Owner setup successful' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Login
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || user.status === 'Deactivated') {
            return res.status(401).json({ message: 'Invalid credentials or account deactivated' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        user.lastLogin = new Date();
        await user.save();

        res.json({
            token,
            user: { id: user._id, username: user.username, role: user.role, permissions: user.permissions }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// List Users
app.get('/api/users', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
    try {
        const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add User
app.post('/api/users', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
    try {
        const { username, password, role, permissions } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: 'Username already taken' });

        if (role === 'Super Admin' && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'Only Super Admin can create other Super Admins' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, passwordHash, role, permissions, status: 'Active' });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update User
app.put('/api/users/:id', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
    try {
        const { role, permissions, status } = req.body;
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

        // Security Rules: Admin cannot modify Super Admin
        if (userToUpdate.role === 'Super Admin' && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'Only Super Admin can modify other Super Admins' });
        }

        if (role) {
            // Only Super Admin can promote/demote or create other Super Admins
            if (role === 'Super Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({ message: 'Only Super Admin can assign Super Admin role' });
            }
            userToUpdate.role = role;
        }
        if (permissions) userToUpdate.permissions = permissions;
        if (status) {
            // Hard Lock: Cannot deactivate Super Admin
            if (userToUpdate.role === 'Super Admin' && status === 'Deactivated') {
                return res.status(403).json({ message: 'Super Admin account cannot be deactivated' });
            }
            userToUpdate.status = status;
        }

        await userToUpdate.save();
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Reset Password
app.patch('/api/users/:id/reset-password', authenticateToken, authorizeRoles('Admin', 'Super Admin'), async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

        if (userToUpdate.role === 'Super Admin' && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'Only Super Admin can reset Super Admin passwords' });
        }

        userToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
        await userToUpdate.save();
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Supply Routes

// Get all supplies
app.get('/api/supplies', async (req, res) => {
    try {
        const supplies = await Supply.find().sort({ createdAt: -1 });
        // Fetch more fields to support editing from the Supplies page
        const medicines = await Medicine.find({}, 'id stock name description price unit netContent category');

        const enhancedSupplies = supplies.map(supply => {
            const med = medicines.find(m => {
                // Robust matching for both Number IDs and ObjectId strings
                if (!supply.medicineId) return false;
                const supplyMedId = supply.medicineId.toString();

                // Check custom ID (Number)
                if (m.id && m.id.toString() === supplyMedId) return true;

                // Check MongoDB _id (ObjectId)
                if (m._id && m._id.toString() === supplyMedId) return true;

                return false;
            });
            return {
                ...supply.toObject(),
                currentStock: med ? (med.stock / (parseFloat(med.netContent) || 1)) : 0,
                // Merging medicine details for the UI
                description: med ? med.description : '',
                price: med ? med.price : 0,
                unit: med ? med.unit : '',
                netContent: med ? med.netContent : '',
                category: med ? med.category : ''
            };
        });

        res.json(enhancedSupplies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new supply (and update inventory)
app.post('/api/supplies', async (req, res) => {
    try {
        const {
            name,
            batchNumber,
            supplierName,
            purchaseCost,
            purchaseInvoiceNumber,
            manufacturingDate,
            expiryDate,
            quantity,
            freeQuantity,
            mrp,
            sellingPrice,
            discountPercentage,
            discountAmount,
            itemAmount,
            taxableAmount,
            cgstPercentage,
            cgstAmount,
            sgstPercentage,
            sgstAmount,
            igstPercentage,
            igstAmount,
            totalGst,
            payableAmount,
            boxNumber,
            notes,
            category,
            description,
            unit,
            netContent,
            minStock,
            formulaCode,
            invoiceDate,
            invoiceDueDate
        } = req.body;

        // Ensure supplierName is a string (handle potential object from frontend)
        const finalSupplierName = (typeof supplierName === 'object' && supplierName !== null)
            ? supplierName.name || ''
            : supplierName || '';

        // 1. Create Supply Record
        // We'll link it to a medicineId after we find/create the medicine
        // For now, let's just prepare the object

        // 2. Update or Create Medicine in Inventory
        let medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        let medicineId = null;

        const effectivePackSize = parseInt(netContent) || 1;
        const stockIncrease = parseInt(quantity) * effectivePackSize;

        if (medicine) {
            // Update existing medicine
            console.log(`Supply: Found existing medicine ${name}. InInventory: ${medicine.inInventory}, Old Stock: ${medicine.stock}`);

            // FIX: If medicine was NOT in inventory (effectively deleted/inactive), treat this as a fresh start.
            // Reset stock to the new quantity instead of adding to old (possibly negative/stale) stock.
            if (!medicine.inInventory) {
                medicine.stock = stockIncrease;
                console.log(`Supply: Reactivating item. Reset stock to ${medicine.stock}`);
            } else {
                medicine.stock = (medicine.stock || 0) + stockIncrease;
            }

            medicine.costPrice = purchaseCost;
            medicine.supplier = finalSupplierName;
            medicine.expiryDate = expiryDate;
            medicine.packSize = effectivePackSize;
            medicine.pricePerUnit = (sellingPrice || medicine.price || 0) / effectivePackSize;

            // Updated Advanced Fields
            medicine.mrp = mrp || medicine.mrp;
            medicine.sellingPrice = sellingPrice || medicine.sellingPrice;
            medicine.price = sellingPrice || medicine.price; // Sync with existing price field
            medicine.discountPercentage = discountPercentage || medicine.discountPercentage;
            medicine.boxNumber = boxNumber || medicine.boxNumber;
            medicine.cgstPercentage = cgstPercentage || medicine.cgstPercentage;
            medicine.sgstPercentage = sgstPercentage || medicine.sgstPercentage;
            medicine.igstPercentage = igstPercentage || medicine.igstPercentage;

            // Update other fields if provided (optional, but good to keep fresh)
            if (category) medicine.category = category;
            if (description) medicine.description = description;
            if (formulaCode) {
                medicine.formulaCode = formulaCode;
                medicine.genericName = formulaCode; // Update generic name as well
            }

            medicine.inInventory = true; // Ensure it's active in inventory
            medicine.lastUpdated = new Date();

            await medicine.save();
            medicineId = medicine.id || medicine._id; // Store ID for reference
            console.log(`Supply: Updated stock for ${name}. New Stock: ${medicine.stock}`);
        } else {
            // Create new medicine
            const lastMedicine = await Medicine.findOne().sort({ id: -1 });
            const nextId = lastMedicine && lastMedicine.id ? lastMedicine.id + 1 : 1;

            medicine = new Medicine({
                id: nextId,
                name,
                category: category || 'General',
                description: description || '',
                price: sellingPrice || 0,
                sellingPrice: sellingPrice || 0,
                mrp: mrp || 0,
                stock: (parseInt(quantity) + (parseInt(freeQuantity) || 0)) * effectivePackSize, // Stock is in single units
                unit: unit || 'Piece',
                netContent: netContent || '',
                packSize: effectivePackSize,
                pricePerUnit: (sellingPrice || 0) / effectivePackSize,
                expiryDate,
                costPrice: purchaseCost,
                minStock: minStock || 10,
                supplier: finalSupplierName,
                note: notes,
                formulaCode,
                genericName: formulaCode || '', // Use formula code as generic name fallback
                inInventory: true,
                boxNumber: boxNumber || '',
                cgstPercentage: cgstPercentage || 0,
                sgstPercentage: sgstPercentage || 0,
                igstPercentage: igstPercentage || 0,
                status: 'Active'
            });
            await medicine.save();
            medicineId = nextId;
            console.log(`Supply: Created new medicine ${name} with stock ${medicine.stock}`);
        }

        // 3. Create Supply Entry
        const newSupply = new Supply({
            medicineId,
            name,
            batchNumber,
            supplierName: finalSupplierName,
            purchaseCost,
            purchaseInvoiceNumber,
            manufacturingDate,
            expiryDate,
            quantity: parseInt(quantity),
            freeQuantity: parseInt(freeQuantity) || 0,
            mrp: parseFloat(mrp) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            discountPercentage: parseFloat(discountPercentage) || 0,
            discountAmount: parseFloat(discountAmount) || 0,
            itemAmount: parseFloat(itemAmount) || 0,
            taxableAmount: parseFloat(taxableAmount) || 0,
            cgstPercentage: parseFloat(cgstPercentage) || 0,
            cgstAmount: parseFloat(cgstAmount) || 0,
            sgstPercentage: parseFloat(sgstPercentage) || 0,
            sgstAmount: parseFloat(sgstAmount) || 0,
            igstPercentage: parseFloat(igstPercentage) || 0,
            igstAmount: parseFloat(igstAmount) || 0,
            totalGst: parseFloat(totalGst) || 0,
            payableAmount: parseFloat(payableAmount) || 0,
            boxNumber,
            notes,
            invoiceDate,
            invoiceDueDate,
            addedDate: invoiceDate || new Date()
        });

        await newSupply.save();

        // 4. Check for Existing Credit (Advance Payment)
        let initialPaidAmount = 0;
        let initialPaymentStatus = 'Unpaid';
        const totalSupplyCost = parseFloat(payableAmount) || (purchaseCost * quantity);

        if (finalSupplierName) {
            const supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${finalSupplierName}$`, 'i') } });
            if (supplier && supplier.totalPayable < 0) {
                const creditAvailable = Math.abs(supplier.totalPayable);

                if (creditAvailable >= totalSupplyCost) {
                    initialPaidAmount = totalSupplyCost;
                    initialPaymentStatus = 'Paid';
                    console.log(`Supply: Fully paid using credit.`);
                } else {
                    initialPaidAmount = creditAvailable;
                    initialPaymentStatus = 'Partial';
                    console.log(`Supply: Partially paid using credit. Amount: ${initialPaidAmount}`);
                }
            }
        }

        // 4. Update Supplier Balance (Outstanding Debt)
        // Only increase Payable by the amount that was NOT paid (by Cash or Credit)
        if (finalSupplierName) {
            const supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${finalSupplierName}$`, 'i') } });
            if (supplier) {
                const totalCost = parseFloat(payableAmount) || (purchaseCost * quantity);
                const unpaidAmount = totalCost - initialPaidAmount;

                if (unpaidAmount > 0) {
                    supplier.totalPayable += unpaidAmount;
                    await supplier.save();
                }

                console.log(`Supply: Updated Supplier ${supplier.name} balance. New Payable: ${supplier.totalPayable}`);
            }
        }

        // Update the payment fields on the already saved supply record
        // Return the updated supply record
        let finalSupply = newSupply;
        if (initialPaidAmount > 0) {
            finalSupply = await Supply.findByIdAndUpdate(newSupply._id, {
                paymentStatus: initialPaymentStatus,
                paidAmount: initialPaidAmount
            }, { new: true });
        }
        res.status(201).json(finalSupply);

    } catch (err) {
        console.error("Supply Error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Update a supply record (and sync with inventory)
app.put('/api/supplies/:id', async (req, res) => {
    try {
        let {
            name,
            batchNumber,
            supplierName,
            purchaseCost,
            purchaseInvoiceNumber,
            manufacturingDate,
            expiryDate,
            quantity,
            freeQuantity,
            mrp,
            sellingPrice,
            discountPercentage,
            discountAmount,
            itemAmount,
            taxableAmount,
            cgstPercentage,
            cgstAmount,
            sgstPercentage,
            sgstAmount,
            igstPercentage,
            igstAmount,
            totalGst,
            payableAmount,
            boxNumber,
            notes,
            paymentStatus,
            paidAmount,
            invoiceDueDate,
            netContent
        } = req.body;

        // Ensure supplierName is a string (handle potential object from frontend)
        if (typeof supplierName === 'object' && supplierName !== null) {
            supplierName = supplierName.name || '';
        }

        const supply = await Supply.findById(req.params.id);
        if (!supply) return res.status(404).json({ message: 'Supply not found' });

        const oldQuantity = supply.quantity || 0;
        const newQuantity = parseInt(quantity);
        const effectivePackSize = parseInt(netContent) || parseInt(supply.netContent) || 1;

        // Update Supply Fields
        supply.name = name;
        supply.batchNumber = batchNumber;
        supply.supplierName = supplierName;
        supply.purchaseCost = purchaseCost;
        supply.purchaseInvoiceNumber = purchaseInvoiceNumber;
        supply.manufacturingDate = manufacturingDate;
        supply.expiryDate = expiryDate;
        supply.quantity = newQuantity;
        supply.freeQuantity = parseInt(freeQuantity) || 0;
        supply.mrp = parseFloat(mrp) || 0;
        supply.sellingPrice = parseFloat(sellingPrice) || 0;
        supply.discountPercentage = parseFloat(discountPercentage) || 0;
        supply.discountAmount = parseFloat(discountAmount) || 0;
        supply.itemAmount = parseFloat(itemAmount) || 0;
        supply.taxableAmount = parseFloat(taxableAmount) || 0;
        supply.cgstPercentage = parseFloat(cgstPercentage) || 0;
        supply.cgstAmount = parseFloat(cgstAmount) || 0;
        supply.sgstPercentage = parseFloat(sgstPercentage) || 0;
        supply.sgstAmount = parseFloat(sgstAmount) || 0;
        supply.igstPercentage = parseFloat(igstPercentage) || 0;
        supply.igstAmount = parseFloat(igstAmount) || 0;
        supply.totalGst = parseFloat(totalGst) || 0;
        supply.payableAmount = parseFloat(payableAmount) || 0;
        supply.boxNumber = boxNumber;
        supply.notes = notes;
        supply.paymentStatus = paymentStatus;
        supply.paidAmount = paidAmount;
        supply.invoiceDueDate = invoiceDueDate;
        if (netContent) supply.netContent = netContent;

        await supply.save();

        // Sync with Medicine
        if (supply.medicineId) {
            const medicineIdStr = supply.medicineId.toString();
            let medicine = null;

            // Check if it's a valid ObjectId (24 hex characters)
            if (/^[0-9a-fA-F]{24}$/.test(medicineIdStr)) {
                // Valid ObjectId - search by _id
                medicine = await Medicine.findById(supply.medicineId);
            } else {
                // Number - search by custom id field
                medicine = await Medicine.findOne({ id: parseInt(medicineIdStr, 10) });
            }

            if (medicine) {
                const stockDiff = (newQuantity * effectivePackSize) - (oldQuantity * effectivePackSize);
                medicine.stock = (medicine.stock || 0) + stockDiff;
                medicine.packSize = effectivePackSize;
                medicine.netContent = effectivePackSize.toString();

                // Sync all relevant fields
                if (name) medicine.name = name;
                if (purchaseCost) medicine.costPrice = purchaseCost;
                if (expiryDate) medicine.expiryDate = expiryDate;
                if (mrp) medicine.mrp = mrp;
                if (sellingPrice) {
                    medicine.sellingPrice = sellingPrice;
                    medicine.price = sellingPrice;
                }
                if (discountPercentage) medicine.discountPercentage = discountPercentage;
                if (boxNumber) medicine.boxNumber = boxNumber;
                if (cgstPercentage) medicine.cgstPercentage = cgstPercentage;
                if (sgstPercentage) medicine.sgstPercentage = sgstPercentage;
                if (igstPercentage) medicine.igstPercentage = igstPercentage;

                // Track supplier name in medicine model too
                medicine.supplier = supplierName;

                if (medicine.stock > 0) medicine.inInventory = true;

                medicine.lastUpdated = new Date();
                await medicine.save();
                console.log(`Supply Update: Synced Medicine ${medicine.name}. New Stock: ${medicine.stock} units (${newQuantity} packs)`);
            }
        }

        res.json(supply);

    } catch (err) {
        console.error("Supply Update Error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Delete a supply record
app.delete('/api/supplies/:id', async (req, res) => {
    try {
        const supply = await Supply.findByIdAndDelete(req.params.id);
        if (!supply) {
            return res.status(404).json({ message: 'Supply not found' });
        }

        // Sync with Medicine (Reduce Stock instead of hard delete)
        if (supply.medicineId) {
            const medicineIdStr = supply.medicineId.toString();
            let medicine = null;

            if (/^[0-9a-fA-F]{24}$/.test(medicineIdStr)) {
                medicine = await Medicine.findById(supply.medicineId);
            } else {
                medicine = await Medicine.findOne({ id: parseInt(medicineIdStr, 10) });
            }

            if (medicine) {
                const packSize = parseInt(supply.netContent) || 1;
                const totalUnitsEntered = (parseInt(supply.quantity) || 0) * packSize;

                medicine.stock = (medicine.stock || 0) - totalUnitsEntered;
                if (medicine.stock <= 0) {
                    medicine.stock = 0;
                    medicine.inInventory = false;
                }
                await medicine.save();
                console.log(`Cascade Delete: Reduced Stock for ${medicine.name}. Removed ${totalUnitsEntered} units.`);
            }
        }

        // UPDATE SUPPLIER BALANCE
        // Since we treated all added supplies as "active", we reverse the effect on delete.
        if (supply.supplierName) {
            const escapedName = supply.supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
            if (supplier) {
                // Ensure purchaseCost is treated as number
                const cost = supply.purchaseCost || 0;
                supplier.totalPayable -= cost;
                await supplier.save();
                console.log(`Cascade Delete: Updated Supplier Balance (Reduced by ${cost})`);
            }
        }

        res.json({ message: 'Supply deleted successfully', supply });
    } catch (err) {
        console.error("Delete Supply Error:", err);
        res.status(500).json({ message: err.message });
    }
});


// Get Low Stock Medicines (Enriched with Forecasts & Supplier Info)
app.get('/api/medicines/low-stock', async (req, res) => {
    try {
        console.log("Fetching Low Stock Medicines...");
        // 1. Fetch all active medicines with populate
        const medicines = await Medicine.find({ status: 'Active', inInventory: true })
            .populate('preferredSupplierId');

        // 2. Filter for Low Stock
        const lowStockDocs = medicines.filter(m => (m.stock || 0) <= (m.minStock || 10));

        // 3. Enrich Data
        const enrichedItems = await Promise.all(lowStockDocs.map(async (doc) => {
            // Convert to Plain Object first to allow arbitrary property assignment
            const item = doc.toObject();

            // FIX: Supply the missing link if preferredSupplierId is null
            if (!item.preferredSupplierId && item.supplier) {
                // Try exact match first, then regex
                let sup = await Supplier.findOne({ name: item.supplier });
                if (!sup) {
                    sup = await Supplier.findOne({ name: { $regex: new RegExp(`^${item.supplier}$`, 'i') } });
                }

                if (sup) {
                    console.log(`[LowStock] Linked '${item.name}' to Supplier '${sup.name}'`);
                    item.preferredSupplierId = sup; // Attach full supplier object

                    // Persist the link for future efficiency
                    await Medicine.findByIdAndUpdate(item._id, { preferredSupplierId: sup._id });
                } else {
                    console.log(`[LowStock] No supplier found for '${item.name}' with name '${item.supplier}'`);
                }
            }

            // Calculation Logic
            const dailySales = item.averageDailySales || (Math.random() * 5);
            const stock = item.stock || 0;
            const daysRemaining = dailySales > 0 ? Math.floor(stock / dailySales) : 999;

            // Forecasts
            const forecasts = {
                days7: { forecastedStock: Math.max(0, Math.floor(stock - (dailySales * 7))), willStockOut: (stock - (dailySales * 7)) <= 0 },
                days15: { forecastedStock: Math.max(0, Math.floor(stock - (dailySales * 15))), willStockOut: (stock - (dailySales * 15)) <= 0 },
                days30: { forecastedStock: Math.max(0, Math.floor(stock - (dailySales * 30))), willStockOut: (stock - (dailySales * 30)) <= 0 }
            };

            // Reorder Suggestion
            const leadTime = item.leadTimeDays || 7;
            const safetyStock = (dailySales * leadTime) * 1.5;
            const suggestedQty = Math.ceil(Math.max(0, (item.reorderLevel || 20) + safetyStock - stock));

            let urgency = 'Warning';
            if (daysRemaining <= leadTime) urgency = 'Critical';

            return {
                ...item,
                reorderSuggestion: {
                    urgency,
                    estimatedDaysRemaining: daysRemaining,
                    suggestedQuantity: suggestedQty
                },
                forecasts
            };
        }));

        res.json(enrichedItems);
    } catch (err) {
        console.error("Low Stock API Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Search medicines (Server-side search for POS)
app.get('/api/medicines/search', async (req, res) => {
    try {
        const { q, category, page = 1, limit = 50 } = req.query;
        let baseQuery = { status: 'Active', inInventory: true }; // Only show sellable items

        if (category && category !== 'All') {
            baseQuery.category = category;
        }

        // Strict Filter: Must exist in Supplies
        const supplyMedicineIds = await Supply.distinct('medicineId');

        // Classify supply IDs
        const validNumericIds = [];
        const validObjectIds = [];

        supplyMedicineIds.forEach(sid => {
            if (!sid) return;
            const strId = sid.toString();
            if (!isNaN(strId) && !/^[0-9a-fA-F]{24}$/.test(strId)) {
                validNumericIds.push(parseInt(strId, 10));
            } else if (mongoose.Types.ObjectId.isValid(strId)) {
                validObjectIds.push(new mongoose.Types.ObjectId(strId));
            }
        });

        const supplyExistenceFilter = {
            $or: [
                { id: { $in: validNumericIds } },
                { _id: { $in: validObjectIds } }
            ]
        };

        let finalQuery = {
            $and: [
                baseQuery,
                supplyExistenceFilter
            ]
        };

        if (q) {
            const searchRegex = new RegExp(q, 'i');
            const searchConditions = [
                { name: searchRegex },
                { genericName: searchRegex },
                { formulaCode: searchRegex },
                { sku: searchRegex },
                { 'barcodes.code': searchRegex }
            ];

            if (!isNaN(q)) {
                searchConditions.push({ id: parseInt(q) });
                searchConditions.push({ boxNumber: searchRegex });
            }

            finalQuery.$and.push({ $or: searchConditions });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [medicines, total] = await Promise.all([
            Medicine.find(finalQuery)
                .sort({ name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Medicine.countDocuments(finalQuery)
        ]);

        res.json({
            medicines,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all medicines (Legacy / Inventory usage)
app.get('/api/medicines', async (req, res) => {
    try {
        const medicines = await Medicine.find();
        res.json(medicines);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new medicine
app.post('/api/medicines', async (req, res) => {
    try {
        const lastMedicine = await Medicine.findOne().sort({ id: -1 });
        const nextId = lastMedicine && lastMedicine.id ? lastMedicine.id + 1 : 1;

        const newMedicine = new Medicine({
            ...req.body,
            id: nextId
        });
        const savedMedicine = await newMedicine.save();
        res.status(201).json(savedMedicine);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update medicine
app.put('/api/medicines/:id', async (req, res) => {
    try {
        const updateData = { ...req.body, lastUpdated: new Date() };

        // If stock is being updated, treat it as Strips/Packs and convert to Units
        if (updateData.stock !== undefined) {
            const packSize = parseInt(updateData.packSize) || 1;
            updateData.stock = parseFloat(updateData.stock) * packSize;
        }

        const updatedMedicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!updatedMedicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json(updatedMedicine);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete medicine
app.delete('/api/medicines/:id', async (req, res) => {
    try {
        const deletedMedicine = await Medicine.findByIdAndDelete(req.params.id);
        if (!deletedMedicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json({ message: 'Medicine deleted successfully', medicine: deletedMedicine });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Map a barcode to a medicine
app.post('/api/medicines/map-barcode', async (req, res) => {
    try {
        const { medicineId, barcode, unit, packSize } = req.body;

        if (!medicineId || !barcode) {
            return res.status(400).json({ message: 'Medicine ID and Barcode are required' });
        }

        // Check if barcode already exists on ANY medicine
        const existingMap = await Medicine.findOne({ 'barcodes.code': barcode });
        if (existingMap) {
            // If mapped to the SAME medicine, just update/return success
            if (existingMap.id === medicineId || existingMap._id.toString() === medicineId) {
                return res.json({ message: 'Barcode already mapped to this medicine', medicine: existingMap });
            }
            return res.status(400).json({ message: 'Barcode is already assigned to another product: ' + existingMap.name });
        }

        // Add to medicine
        let medicine;
        // Try precise ID match
        if (typeof medicineId === 'number' || !isNaN(medicineId)) {
            medicine = await Medicine.findOne({ id: medicineId });
        }
        if (!medicine && mongoose.Types.ObjectId.isValid(medicineId)) {
            medicine = await Medicine.findById(medicineId);
        }

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        medicine.barcodes.push({
            code: barcode,
            unit: unit || medicine.unit,
            packSize: packSize || 1
        });

        await medicine.save();
        res.json({ message: 'Barcode mapped successfully', medicine });

    } catch (err) {
        console.error('Barcode Map Error:', err);
        res.status(500).json({ message: err.message });
    }
});


// Get all customers with optional date filtering
app.get('/api/customers', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // Date filtering based on joinDate
        if (startDate || endDate) {
            // Note: joinDate is stored as string "MMM DD, YYYY"
            const customers = await Customer.find();

            const filtered = customers.filter(customer => {
                if (!customer.joinDate) return true; // Include customers without join date

                // Parse the joinDate string
                const joinDateObj = new Date(customer.joinDate);

                // Check for invalid date
                if (isNaN(joinDateObj.getTime())) return false;

                // Format to YYYY-MM-DD using local components to match the stored date's intent
                const year = joinDateObj.getFullYear();
                const month = String(joinDateObj.getMonth() + 1).padStart(2, '0');
                const day = String(joinDateObj.getDate()).padStart(2, '0');
                const joinDateStr = `${year}-${month}-${day}`;

                if (startDate && endDate) {
                    return joinDateStr >= startDate && joinDateStr <= endDate;
                } else if (startDate) {
                    return joinDateStr >= startDate;
                } else if (endDate) {
                    return joinDateStr <= endDate;
                }
                return true;
            });

            return res.json(filtered);
        }

        const customers = await Customer.find();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new customer
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer({
            ...req.body,
            joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            totalPurchases: 0,
            totalSpent: 0,
            status: 'Active'
        });
        const savedCustomer = await newCustomer.save();
        res.status(201).json(savedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Voucher Routes

// Get currently active voucher
app.get('/api/vouchers/active', async (req, res) => {
    try {
        const voucher = await Voucher.findOne({ status: 'Active' });
        res.json(voucher || null);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all vouchers
app.get('/api/vouchers', async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create voucher
app.post('/api/vouchers', async (req, res) => {
    try {
        if (req.body.status === 'Active') {
            await Voucher.updateMany({}, { status: 'Inactive' });
        }
        const newVoucher = new Voucher(req.body);
        const savedVoucher = await newVoucher.save();
        res.status(201).json(savedVoucher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Voucher code already exists' });
        }
        res.status(400).json({ message: err.message });
    }
});

// Update voucher
app.put('/api/vouchers/:id', async (req, res) => {
    try {
        if (req.body.status === 'Active') {
            await Voucher.updateMany({ _id: { $ne: req.params.id } }, { status: 'Inactive' });
        }
        const updatedVoucher = await Voucher.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updatedVoucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        res.json(updatedVoucher);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Toggle voucher status
app.put('/api/vouchers/:id/toggle-status', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }

        const newStatus = voucher.status === 'Active' ? 'Inactive' : 'Active';

        if (newStatus === 'Active') {
            await Voucher.updateMany({ _id: { $ne: req.params.id } }, { status: 'Inactive' });
        }

        voucher.status = newStatus;
        await voucher.save();
        res.json(voucher);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete voucher
app.delete('/api/vouchers/:id', async (req, res) => {
    try {
        const deletedVoucher = await Voucher.findByIdAndDelete(req.params.id);
        if (!deletedVoucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        res.json({ message: 'Voucher deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Validate voucher
app.post('/api/vouchers/validate', async (req, res) => {
    try {
        const { code, purchaseAmount } = req.body;
        const voucher = await Voucher.findOne({ code: code.toUpperCase() });

        if (!voucher) {
            return res.status(404).json({ valid: false, message: 'Voucher not found' });
        }

        const now = new Date();
        if (now < new Date(voucher.validFrom) || now > new Date(voucher.validUntil)) {
            return res.status(400).json({ valid: false, message: 'Voucher has expired or not yet valid' });
        }

        if (voucher.status !== 'Active') {
            return res.status(400).json({ valid: false, message: 'Voucher is not active' });
        }

        if (voucher.usedCount >= voucher.maxUses) {
            return res.status(400).json({ valid: false, message: 'Voucher usage limit reached' });
        }

        if (purchaseAmount < voucher.minPurchase) {
            return res.status(400).json({
                valid: false,
                message: `Minimum purchase of $${voucher.minPurchase} required`
            });
        }

        let discountAmount = 0;
        if (voucher.discountType === 'Percentage') {
            discountAmount = (purchaseAmount * voucher.discountValue) / 100;
            if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        } else {
            discountAmount = voucher.discountValue;
        }

        res.json({
            valid: true,
            voucher: voucher,
            discountAmount: discountAmount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Use voucher (increment usage)
app.put('/api/vouchers/:id/use', async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        voucher.usedCount += 1;
        await voucher.save();
        res.json(voucher);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Create transaction (Sale or Return)
app.post('/api/transactions', async (req, res) => {
    try {
        const { type, items, total, customer, voucher } = req.body;

        // If it's a return, ensure totals are negative if not already
        const isReturn = type === 'Return';
        const finalTotal = isReturn && total > 0 ? -total : total;

        // Auto-increment billNumber
        const lastTransaction = await Transaction.findOne({}).sort({ billNumber: -1 });
        const nextBillNumber = (lastTransaction && lastTransaction.billNumber) ? lastTransaction.billNumber + 1 : 1001;

        // If it's a return, try to find the original bill number
        let originalBillNumber = null;
        if (isReturn && req.body.originalTransactionId) {
            const originalTx = await Transaction.findOne({ transactionId: req.body.originalTransactionId });
            if (originalTx) originalBillNumber = originalTx.billNumber;
        }

        const newTransaction = new Transaction({
            ...req.body,
            billNumber: nextBillNumber,
            originalBillNumber,
            total: finalTotal,
            type: type || 'Sale'
        });

        const savedTransaction = await newTransaction.save();

        if (isReturn) {
            // RESTOCK Logic for Returns
            for (const item of items) {
                // Find medicine primarily by ID (number) or fallback to name if ID structure differs
                let medicine = null;
                const itemId = item.id;

                // 1. Try finding by custom numeric id first if it looks like a number
                if (typeof itemId === 'number' || (typeof itemId === 'string' && itemId.match(/^\d+$/))) {
                    console.log(`Return Restock: Looking up by numeric id: ${itemId}`);
                    medicine = await Medicine.findOne({ id: parseInt(itemId) });
                }

                // 2. If not found, try finding by MongoDB _id (if it looks like one)
                if (!medicine && typeof itemId === 'string' && itemId.match(/^[0-9a-fA-F]{24}$/)) {
                    console.log(`Return Restock: Looking up by _id: ${itemId}`);
                    medicine = await Medicine.findById(itemId);
                }

                // 3. Last resort: check _id property of item if it exists
                if (!medicine && item._id) {
                    console.log(`Return Restock: Looking up by item._id: ${item._id}`);
                    medicine = await Medicine.findById(item._id);
                }

                if (medicine) {
                    console.log(`Return: Medicine found: ${medicine.name}. Old Stock: ${medicine.stock}`);

                    const packSize = medicine.packSize || 1;
                    const isPack = item.saleType === 'Pack';
                    const restockAmount = isPack ? (item.quantity * packSize) : item.quantity;

                    console.log(`Return Restock: Type=${item.saleType}, PackSize=${packSize}, Qty=${item.quantity} => TotalRestock=${restockAmount}`);

                    medicine.stock += restockAmount;
                    await medicine.save();
                    console.log(`Return: Medicine updated: ${medicine.name}. New Stock: ${medicine.stock}`);
                } else {
                    console.log(`❌ Return: Medicine NOT found for item:`, item);
                }
            }

            // Update customer stats for Return (decreases spent)
            if (customer && customer.id) {
                await Customer.findByIdAndUpdate(
                    customer.id,
                    {

                        $inc: {
                            totalPurchases: 1,
                            totalSpent: finalTotal // finalTotal is negative
                        }
                    }
                );
            }

        } else {
            // NORMAL SALE Logic
            let finalCustomer = customer;

            // Handle Customer Logic: If phone provided, find or create
            if (customer && customer.phone) {
                let existingCustomer = await Customer.findOne({ phone: customer.phone });

                if (existingCustomer) {
                    // Update existing customer stats
                    existingCustomer.totalPurchases += 1;
                    existingCustomer.totalSpent += total;
                    // Optionally update name/email if they were blank before
                    if (!existingCustomer.name || existingCustomer.name === 'Walk-in') existingCustomer.name = customer.name;
                    if (!existingCustomer.email && customer.email) existingCustomer.email = customer.email;

                    await existingCustomer.save();
                    finalCustomer.id = existingCustomer._id;
                } else if (customer.name && customer.name !== 'Walk-in') {
                    // Create newline customer
                    const newCustomer = new Customer({
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email || '',
                        address: 'POS Entry',
                        joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                        totalPurchases: 1,
                        totalSpent: total,
                        status: 'Active'
                    });
                    const savedCustomer = await newCustomer.save();
                    finalCustomer.id = savedCustomer._id;
                }
            } else if (customer && customer.id) {
                // If only ID was provided (legacy or direct selection)
                await Customer.findByIdAndUpdate(
                    customer.id,
                    {
                        $inc: {
                            totalPurchases: 1,
                            totalSpent: total
                        }
                    }
                );
            }

            // Update transaction doc with found/created customer ID
            await Transaction.findByIdAndUpdate(savedTransaction._id, { 'customer.id': finalCustomer.id });

            // Update voucher usage if voucher was used
            if (voucher && voucher.id) {
                await Voucher.findByIdAndUpdate(
                    voucher.id,
                    { $inc: { usedCount: 1 } }
                );
            }

            // DEDUCT STOCK Logic for Sales
            console.log("Processing stock deduction for items:", items);
            for (const item of items) {
                // Find medicine primarily by ID (number) or fallback to name if ID structure differs
                console.log(`Checking stock for item: ID=${item.id}, _id=${item._id}, Qty=${item.quantity}`);

                let medicine = null;
                const itemId = item.id;

                // 1. Try finding by custom numeric id first if it looks like a number
                if (typeof itemId === 'number' || (typeof itemId === 'string' && itemId.match(/^\d+$/))) {
                    console.log(`Looking up by numeric id: ${itemId}`);
                    medicine = await Medicine.findOne({ id: parseInt(itemId) });
                }

                // 2. If not found, try finding by MongoDB _id (if it looks like one)
                if (!medicine && typeof itemId === 'string' && itemId.match(/^[0-9a-fA-F]{24}$/)) {
                    console.log(`Looking up by _id: ${itemId}`);
                    medicine = await Medicine.findById(itemId);
                }

                // 3. Last resort: check _id property of item if it exists
                if (!medicine && item._id) {
                    console.log(`Looking up by item._id: ${item._id}`);
                    medicine = await Medicine.findById(item._id);
                }

                if (medicine) {
                    console.log(`Medicine found: ${medicine.name}. Old Stock: ${medicine.stock}`);

                    // Logic for Pack vs Single Unit deduction
                    const packSize = medicine.packSize || 1;
                    const isPack = item.saleType === 'Pack';
                    const deduction = isPack ? (item.quantity * packSize) : item.quantity;

                    console.log(`Stock Deduction: Type=${item.saleType}, PackSize=${packSize}, Qty=${item.quantity} => TotalDeduction=${deduction}`);

                    // Ensure we don't go below zero (optional, but good practice)
                    medicine.stock = Math.max(0, (medicine.stock || 0) - deduction);
                    await medicine.save();
                    console.log(`Medicine updated: ${medicine.name}. New Stock: ${medicine.stock}`);
                } else {
                    console.log(`❌ Medicine NOT found for item:`, item);
                }
            }
        }


        res.status(201).json(savedTransaction);
    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Supplier & Payment Routes

// Get all suppliers
// Get all suppliers
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        let updated = false;



        for (const supplier of suppliers) {
            if (supplier.totalPayable < 0) {
                const creditAmount = Math.abs(supplier.totalPayable);
                supplier.creditBalance = (supplier.creditBalance || 0) + creditAmount;
                supplier.totalPayable = 0;
                await supplier.save();
                updated = true;
                console.log(`[Migration] Supplier ${supplier.name}: Converted negative payable ${-creditAmount} to Credit Balance.`);
            }
        }

        // Re-fetch if updates occurred to ensure consistency (optional but safer)
        const finalSuppliers = updated ? await Supplier.find().sort({ name: 1 }) : suppliers;

        // Add payment status to each supplier
        const suppliersWithStatus = finalSuppliers.map(supplier => {
            // "Due" if positive payable. "Paid" if 0. (Negative shouldn't happen after migration)
            const paymentStatus = (supplier.totalPayable || 0) > 0 ? 'Due' : 'Paid';
            const dueAmount = supplier.totalPayable || 0;
            const creditBalance = supplier.creditBalance || 0;

            return {
                ...supplier.toObject(),
                paymentStatus,
                dueAmount,
                creditBalance // Explicitly return this
            };
        });

        res.json(suppliersWithStatus);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new supplier
app.post('/api/suppliers', async (req, res) => {
    try {
        const newSupplier = new Supplier(req.body);
        const savedSupplier = await newSupplier.save();
        res.status(201).json(savedSupplier);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get Supplier Details (with Ledger & Enhanced Stats)
app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Lazy Migration: Normalized Negative Payable to Credit Balance
        if (supplier.totalPayable < 0) {
            const creditAmount = Math.abs(supplier.totalPayable);
            supplier.creditBalance = (supplier.creditBalance || 0) + creditAmount;
            supplier.totalPayable = 0;
            await supplier.save();
            console.log(`[Migration-Detail] Supplier ${supplier.name}: Converted negative payable ${-creditAmount} to Credit Balance.`);
        }

        // Fetch related Supplies
        const supplies = await Supply.find({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        }).sort({ createdAt: 1 });

        // Fetch Payments
        const payments = await Payment.find({ supplierId: supplier._id }).sort({ date: 1 });

        // --- 1. Ledger Construction with Running Balance ---
        let ledger = [];

        // No more opening balance - start fresh with only actual transactions

        const supplyEntries = supplies.map(s => {
            const totalCost = (s.quantity || 0) * (s.purchaseCost || 0);
            const paidAmount = s.paidAmount || 0;
            const dueAmount = totalCost - paidAmount;

            return {
                id: s._id,
                date: s.addedDate || s.createdAt,
                type: 'Invoice', // Changed from 'Purchase' to 'Invoice' for consistency
                ref: s.purchaseInvoiceNumber || 'N/A',
                amount: totalCost,
                status: s.paymentStatus === 'Paid' ? 'Settled' : (s.paymentStatus === 'Partial' ? 'Partial' : 'Posted'),
                isCredit: true, // We OWE money for purchases

                // Item details
                name: s.name,
                itemName: s.name, // Explicit for UI
                batchNumber: s.batchNumber,
                quantity: s.quantity,
                unitCost: s.purchaseCost || 0,
                totalCost: totalCost,
                expiryDate: s.expiryDate,

                // Payment & Due Date
                paymentStatus: s.paymentStatus || 'Unpaid',
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                dueDate: s.invoiceDueDate || null, // Include Due Date

                addedDate: s.addedDate || s.createdAt
            };
        });

        const paymentEntries = payments.map(p => {

            const isRefund = p.method === 'Cash Refund';

            return {
                id: p._id,
                date: p.date,
                type: isRefund ? 'Cash Refund' : (p.method === 'Debit Note' ? 'Debit Note' : 'Payment'),
                ref: p.method,
                amount: p.amount,
                status: 'Posted',
                isCredit: isRefund, // Refund increases Payable (reduces negative balance)
                isDebit: !isRefund, // Payment reduces Payable
                note: p.note
            };
        });

        // Merge and Sort by Date Ascending for Running Balance Calculation
        let allEntries = [...ledger, ...supplyEntries, ...paymentEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentBalance = 0; // Starts at 0, builds up from actual transactions only

        allEntries = allEntries.map(entry => {
            if (entry.isCredit) {
                // Invoice increases Payable
                currentBalance += (entry.amount || 0);
            } else if (entry.isDebit) {
                // Payment reduces Payable
                currentBalance -= (entry.amount || 0);
            }
            return {
                ...entry,
                runningBalance: currentBalance
            };
        });

        // --- 2. Advanced Stats ---

        // A. Top 5 Products (by Quantity Purchased)
        const productStats = {};
        supplies.forEach(s => {
            if (!productStats[s.name]) {
                productStats[s.name] = {
                    name: s.name,
                    totalQty: 0,
                    purchaseCount: 0,
                    lastPrice: 0,
                    lastDate: new Date(0) // Epoch
                };
            }
            productStats[s.name].totalQty += (s.quantity || 0);
            productStats[s.name].purchaseCount += 1;

            // Update last price if this record is newer
            const supplyDate = new Date(s.addedDate || s.createdAt);
            if (supplyDate > productStats[s.name].lastDate) {
                productStats[s.name].lastDate = supplyDate;
                productStats[s.name].lastPrice = s.purchaseCost;
            }
        });

        const topProducts = Object.values(productStats)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);

        // B. Total SKUs and Quantity
        const totalSKUs = Object.keys(productStats).length;
        const totalQuantity = supplies.reduce((acc, s) => acc + (s.quantity || 0), 0);

        // C. Payment Aging (FIFO Simulation for Accuracy)
        const globalBalance = allEntries.length > 0 ? allEntries[allEntries.length - 1].runningBalance : 0;
        const today = new Date();
        const fifteenDaysFromNow = new Date();
        fifteenDaysFromNow.setDate(today.getDate() + 15);

        let overdueAmount = 0;
        let dueIn15Days = 0;

        if (globalBalance > 0) {
            // We assume the global debt applies to the NEWEST invoices (as old ones are PAID first)
            const sortedSuppliesDesc = [...supplies].sort((a, b) => new Date(b.addedDate || b.createdAt) - new Date(a.addedDate || a.createdAt));
            let remainingDebt = globalBalance;

            for (const s of sortedSuppliesDesc) {
                if (remainingDebt <= 0) break;

                const invCost = (s.quantity || 0) * (s.purchaseCost || 0);
                const debtOnThis = Math.min(invCost, remainingDebt);

                if (debtOnThis > 0 && s.invoiceDueDate) {
                    const due = new Date(s.invoiceDueDate);
                    if (due < today) overdueAmount += debtOnThis;
                    else if (due <= fifteenDaysFromNow) dueIn15Days += debtOnThis;
                }
                remainingDebt -= debtOnThis;
            }
        }

        const grossPurchased = supplies.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.purchaseCost || 0)), 0);
        const totalReturns = payments
            .filter(p => p.method === 'Debit Note')
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Separate actual cash/bank payments from debit notes
        const cashBankMethods = ['Cash', 'Bank Transfer', 'Check'];
        const cashPayments = payments
            .filter(p => cashBankMethods.includes(p.method))
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Calculate Cash Refunds
        const totalRefunds = payments
            .filter(p => p.method === 'Cash Refund')
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Net Purchases = Gross Invoices - Returns
        const totalPurchased = grossPurchased - totalReturns;

        // CRITICAL: Total Paid = ONLY Cash/Bank/Check (DO NOT add returns, DO NOT subtract refunds here, treat separately)
        const totalPaid = cashPayments;

        // Balance = Net Purchases - Payments + Refunds (Refunds increase what we owe / decrease our credit asset)
        const balance = totalPurchased - totalPaid + totalRefunds;

        // If balance is negative, we have a credit with the supplier
        const supplierCredit = balance < 0 ? Math.abs(balance) : 0;

        res.json({
            supplier,
            ledger: allEntries.reverse(), // Send newest first
            stats: {
                totalPurchased,
                totalPaid,
                cashPayments,
                totalReturns,
                balance,
                balance,
                supplierCredit,
                storedCredit: supplier.creditBalance || 0, // Explicitly stored credit
                totalSKUs,
                totalQuantity,
                overdueAmount,
                dueIn15Days
            },
            topProducts
        });

    } catch (err) {
        console.error("Supplier Details Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Record Payment (Enhanced for Credit & Method)
app.post('/api/suppliers/:id/pay', async (req, res) => {
    try {
        const { amount, date, method, note } = req.body;
        const supplier = await Supplier.findById(req.params.id);

        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Handle Paying with Supplier Credit
        if (method === 'Supplier Credit') {
            if ((supplier.creditBalance || 0) < amount) {
                return res.status(400).json({ message: 'Insufficient Supplier Credit Balance' });
            }
            supplier.creditBalance -= amount;
            supplier.totalPayable -= amount; // Reduce Debt as well!
            await supplier.save();
        } else {
            // Normal Cash/Bank Payment -> Reduces Net Payable (Debt)
            supplier.totalPayable -= parseFloat(amount);
            await supplier.save();
        }

        // Record the payment transaction
        const newPayment = new Payment({
            supplierId: supplier._id,
            amount,
            date: date || new Date(),
            method, // 'Supplier Credit', 'Cash', etc.
            note
        });

        await newPayment.save();

        res.status(201).json({ message: 'Payment recorded successfully', payment: newPayment });
    } catch (err) {
        console.error("Record Payment Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Process Cash Refund (Close Credit)
app.post('/api/suppliers/refund', async (req, res) => {
    try {
        const { supplierId, amount } = req.body;

        if (!supplierId || !amount) {
            return res.status(400).json({ message: 'Supplier ID and Amount are required' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        if ((supplier.creditBalance || 0) < amount) {
            return res.status(400).json({ message: 'Insufficient Supplier Credit due for refund' });
        }

        // Reduce Credit
        supplier.creditBalance -= parseFloat(amount);


        await supplier.save();

        // Record Transaction
        const refundTx = new Payment({
            supplierId: supplier._id,
            amount: parseFloat(amount),
            date: new Date(),
            method: 'Cash Refund', // Special method
            note: 'Refund of Supplier Credit'
        });
        await refundTx.save();

        // Also add to Transaction History (Account) if needed?
        // For now just Supplier Ledger.

        res.json({ message: 'Refund processed successfully', creditBalance: supplier.creditBalance });

    } catch (err) {
        console.error("Refund Error:", err);
        res.status(500).json({ message: err.message });
    }
});



// Record Item-Level Payment (for selective payment of invoice items)
app.post('/api/suppliers/:id/pay-items', async (req, res) => {
    try {
        console.log('[PAY-ITEMS] Request received');
        console.log('[PAY-ITEMS] Supplier ID:', req.params.id);
        console.log('[PAY-ITEMS] Request body:', JSON.stringify(req.body, null, 2));

        const { items, paymentData } = req.body; // items: [{ supplyId, amount }], paymentData: { date, method, note }
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Calculate total payment amount
        let totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

        // Special handling for Credit Adjustment / Supplier Credit
        const isCreditAdjustment = paymentData.method === 'Credit Adjustment';
        const isSupplierCredit = paymentData.method === 'Supplier Credit';



        const paymentRecordAmount = isCreditAdjustment ? 0 : totalAmount;

        // 1. Create Payment Record
        const newPayment = new Payment({
            supplierId: supplier._id,
            amount: paymentRecordAmount,
            date: paymentData.date || new Date(),
            method: paymentData.method || 'Cash',
            note: paymentData.note || (isCreditAdjustment ? 'Credit Applied to Invoices' : '')
        });
        const savedPayment = await newPayment.save();

        // 2. Allocate Payment to Each Supply Item
        for (const item of items) {
            const supply = await Supply.findById(item.supplyId);
            if (!supply) continue;

            const itemPayment = new ItemPayment({
                supplierId: supplier._id,
                supplyId: item.supplyId,
                amount: item.amount,
                paymentId: savedPayment._id,
                date: paymentData.date || new Date(),
                notes: paymentData.note || (isCreditAdjustment ? 'Credit Adjustment' : '')
            });
            await itemPayment.save();

            supply.paidAmount = (supply.paidAmount || 0) + item.amount;
            const totalCost = supply.quantity * supply.purchaseCost;

            if (supply.paidAmount >= totalCost) {
                supply.paymentStatus = 'Paid';
            } else if (supply.paidAmount > 0) {
                supply.paymentStatus = 'Partial';
            }

            await supply.save();
        }

        // 3. Update Supplier Balance
        if (isSupplierCredit) {
            // Check Credit Balance
            if ((supplier.creditBalance || 0) < totalAmount) {

            }
            supplier.creditBalance = (supplier.creditBalance || 0) - totalAmount;
            supplier.totalPayable -= totalAmount; // Reduce Debt
            await supplier.save();
        } else if (!isCreditAdjustment) {
            // Cash/Bank
            supplier.totalPayable -= totalAmount;
            await supplier.save();
        }

        res.status(201).json({ payment: savedPayment, itemsUpdated: items.length });

    } catch (err) {
        console.error('Item Payment Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Process Purchase Return (Debit Note)
app.post('/api/suppliers/return', async (req, res) => {
    try {
        const { supplierId, items, reason, date } = req.body;
        console.log(`[RETURN] Processing return for Supplier ${supplierId}. Items:`, items.length);

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Calculate total debit amount
        const totalDebitAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

        const debitNote = new Payment({
            supplierId: supplier._id,
            amount: totalDebitAmount,
            date: date || new Date(),
            method: 'Debit Note',
            note: reason ? `Return (${items.length} items): ${reason}` : `Return of ${items.length} items`
        });
        const savedDebitNote = await debitNote.save();


        for (const item of items) {
            // Update ONLY Global Medicine Stock (for inventory tracking)
            let medicine = null;
            if (item.medicineId) {
                // Try finding by ID (could be number or string)
                if (mongoose.Types.ObjectId.isValid(item.medicineId)) {
                    medicine = await Medicine.findById(item.medicineId);
                } else {
                    medicine = await Medicine.findOne({ id: item.medicineId });
                }
            }

            // Fallback to name if ID fails
            if (!medicine && item.name) {
                medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${item.name}$`, 'i') } });
            }

            if (medicine) {
                if (medicine.stock < item.quantity) {
                    throw new Error(`Insufficient global stock for ${medicine.name}. Stock: ${medicine.stock}, Return: ${item.quantity}`);
                }
                console.log(`[RETURN] Reducing stock for ${medicine.name}. Old: ${medicine.stock}, Return: ${item.quantity}`);
                medicine.stock -= item.quantity;
                await medicine.save();
            } else {
                console.warn(`[RETURN] Medicine not found for return item: ${item.name} (${item.medicineId})`);
            }
        }


        supplier.totalPayable -= totalDebitAmount;
        await supplier.save();

        res.status(201).json({
            message: 'Return processed successfully',
            debitNote: savedDebitNote,
            newBalance: supplier.totalPayable
        });

    } catch (err) {
        console.error('Purchase Return Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update Supplier
app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { name, contactPerson, phone, email, address } = req.body;

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Update supplier fields
        if (name) supplier.name = name;
        if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
        if (phone !== undefined) supplier.phone = phone;
        if (email !== undefined) supplier.email = email;
        if (address !== undefined) supplier.address = address;

        const updatedSupplier = await supplier.save();
        res.json(updatedSupplier);

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete Supplier
app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const deleteStock = req.query.deleteStock === 'true';

        console.log(`[DELETE SUPPLIER] ID: ${req.params.id}, Name: ${supplier.name}, Delete Stock: ${deleteStock}`);

        // 1. Fetch associated Supplies
        const supplies = await Supply.find({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        });

        let stockReducedCount = 0;
        let suppliesRemovedCount = 0;

        // 2. Logic based on user choice
        if (deleteStock) {
            // OPTION A: Delete Supplier AND Reduce Stock (Full clean up)

            // a. Reduce Stock
            for (const supply of supplies) {
                // Find medicine
                let medicine = null;
                // Try finding by ID (could be number or string)
                if (supply.medicineId) {
                    if (mongoose.Types.ObjectId.isValid(supply.medicineId)) {
                        medicine = await Medicine.findById(supply.medicineId);
                    } else {
                        medicine = await Medicine.findOne({ id: supply.medicineId });
                    }
                }
                // Fallback to name
                if (!medicine && supply.name) {
                    medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${supply.name}$`, 'i') } });
                }

                if (medicine) {
                    // Reduce stock
                    const qtyToRemove = supply.quantity || 0;
                    medicine.stock = Math.max(0, (medicine.stock || 0) - qtyToRemove); // Prevent negative

                    // FX: If stock becomes 0, remove it from inventory/low stock lists (Deactivate)
                    if (medicine.stock === 0) {
                        medicine.inInventory = false;
                        console.log(`[Supplier Delete] Deactivated ${medicine.name} as stock reached 0.`);
                    }

                    await medicine.save();
                    stockReducedCount++;
                    console.log(`[Supplier Delete] Reduced stock for ${medicine.name} by ${qtyToRemove}. New: ${medicine.stock}`);
                }
            }

            // b. Delete Supplies
            const deletedSuppliesResult = await Supply.deleteMany({
                supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
            });
            suppliesRemovedCount = deletedSuppliesResult.deletedCount;

        } else {


            console.log(`[Supplier Delete] Preserving ${supplies.length} supply records and their stock.`);
        }



        await Payment.deleteMany({ supplierId: supplier._id });
        await ItemPayment.deleteMany({ supplierId: supplier._id });

        // 4. Finally, delete the Supplier
        await Supplier.findByIdAndDelete(req.params.id);

        res.json({
            message: deleteStock
                ? 'Supplier, stock, and history deleted successfully'
                : 'Supplier deleted successfully (Stock & History preserved)',
            details: {
                suppliesRemoved: suppliesRemovedCount,
                itemsStockReduced: stockReducedCount
            }
        });

    } catch (err) {
        console.error("Delete Supplier Error:", err);
        res.status(500).json({ message: err.message });
    }
});



// Clear Supplier History (Reset to New)
app.post('/api/suppliers/:id/clear-history', async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        console.log(`[CLEAR HISTORY] Clearing all transactions for supplier: ${supplier.name}`);

        // 1. Delete all associated Supplies
        const deletedSupplies = await Supply.deleteMany({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        });
        console.log(`[CLEAR HISTORY] Removed ${deletedSupplies.deletedCount} supplies`);

        // 2. Delete all associated Payments
        const deletedPayments = await Payment.deleteMany({ supplierId: supplier._id });
        console.log(`[CLEAR HISTORY] Removed ${deletedPayments.deletedCount} payments`);

        // 3. Delete all associated ItemPayments
        const deletedItemPayments = await ItemPayment.deleteMany({ supplierId: supplier._id });
        console.log(`[CLEAR HISTORY] Removed ${deletedItemPayments.deletedCount} item payments`);

        // 4. Reset supplier's totalPayable to 0
        supplier.totalPayable = 0;
        await supplier.save();
        console.log(`[CLEAR HISTORY] Reset supplier balance to 0`);

        res.json({
            message: `Successfully cleared all transaction history for ${supplier.name}`,
            details: {
                suppliesRemoved: deletedSupplies.deletedCount,
                paymentsRemoved: deletedPayments.deletedCount,
                itemPaymentsRemoved: deletedItemPayments.deletedCount
            }
        });

    } catch (err) {
        console.error('[CLEAR HISTORY] Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Apply Supplier Credit to Invoice
app.post('/api/suppliers/:id/apply-credit', async (req, res) => {
    try {
        const { amount, supplyIds, note } = req.body;
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Calculate current balance to verify available credit
        const supplies = await Supply.find({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        });
        const payments = await Payment.find({ supplierId: supplier._id });

        const grossPurchased = supplies.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.purchaseCost || 0)), 0);
        const totalReturns = payments.filter(p => p.method === 'Debit Note').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const cashPayments = payments.filter(p => ['Cash', 'Bank Transfer', 'Check', 'Credit Application', 'Cash Refund'].includes(p.method)).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const netPurchases = grossPurchased - totalReturns;
        const currentBalance = netPurchases - cashPayments;
        const supplierCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0;

        if (supplierCredit < amount) {
            return res.status(400).json({ message: `Insufficient credit balance. Available: Rs. ${supplierCredit.toFixed(2)}` });
        }

        console.log(`[APPLY CREDIT] Applying Rs. ${amount} credit for ${supplier.name}`);

        // Create a payment record with "Credit Application" method
        const creditPayment = new Payment({
            supplierId: supplier._id,
            amount,
            date: new Date(),
            method: 'Credit Application',
            note: note || `Credit applied to ${supplyIds ? supplyIds.length : 0} invoice(s)`
        });
        const savedPayment = await creditPayment.save();

        // If specific supplies are provided, mark them as paid
        if (supplyIds && supplyIds.length > 0) {
            for (const supplyId of supplyIds) {
                const supply = await Supply.findById(supplyId);
                if (supply) {
                    const totalCost = supply.quantity * supply.purchaseCost;
                    const remaining = totalCost - (supply.paidAmount || 0);
                    const paymentForThis = Math.min(remaining, amount);

                    supply.paidAmount = (supply.paidAmount || 0) + paymentForThis;
                    if (supply.paidAmount >= totalCost) {
                        supply.paymentStatus = 'Paid';
                    } else if (supply.paidAmount > 0) {
                        supply.paymentStatus = 'Partial';
                    }
                    await supply.save();
                }
            }
        }

        res.status(201).json({
            message: 'Credit applied successfully',
            payment: savedPayment,
            remainingCredit: supplierCredit - amount
        });

    } catch (err) {
        console.error('[APPLY CREDIT] Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Record Cash Refund from Supplier
app.post('/api/suppliers/:id/record-refund', async (req, res) => {
    try {
        const { amount, note, date } = req.body;
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Calculate current credit balance
        const supplies = await Supply.find({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        });
        const payments = await Payment.find({ supplierId: supplier._id });

        const grossPurchased = supplies.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.purchaseCost || 0)), 0);
        const totalReturns = payments.filter(p => p.method === 'Debit Note').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const cashPayments = payments.filter(p => ['Cash', 'Bank Transfer', 'Check', 'Credit Application', 'Cash Refund'].includes(p.method)).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const netPurchases = grossPurchased - totalReturns;
        const currentBalance = netPurchases - cashPayments;
        const supplierCredit = currentBalance < 0 ? Math.abs(currentBalance) : 0;

        if (supplierCredit < amount) {
            return res.status(400).json({ message: `Cannot refund more than credit balance. Available: Rs. ${supplierCredit.toFixed(2)}` });
        }

        console.log(`[CASH REFUND] Recording refund of Rs. ${amount} from ${supplier.name}`);

        // Create a "Cash Refund" payment record
        // This is a payment FROM supplier TO us, reducing our credit
        const refundPayment = new Payment({
            supplierId: supplier._id,
            amount,
            date: date || new Date(),
            method: 'Cash Refund',
            note: note || `Cash refund received from supplier`
        });
        const savedRefund = await refundPayment.save();

        res.status(201).json({
            message: 'Cash refund recorded successfully',
            refund: savedRefund,
            remainingCredit: supplierCredit - amount
        });

    } catch (err) {
        console.error('[CASH REFUND] Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get transactions with optional date filtering
// Get transactions with advanced filtering and pagination
app.get('/api/transactions', async (req, res) => {
    try {
        const {
            startDate, endDate, searchQuery,
            page = 1, limit = 50,
            paymentMethod, status, cashier, type,
            minAmount, maxAmount
        } = req.query;

        let query = {};

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search filtering
        if (searchQuery) {
            query.$or = [
                { transactionId: { $regex: searchQuery, $options: 'i' } },
                { 'customer.name': { $regex: searchQuery, $options: 'i' } },
                // If query is numeric, also search by billNumber
                ...(!isNaN(searchQuery) && searchQuery.trim() !== '' ? [{ billNumber: parseInt(searchQuery) }] : [])
            ];
        }

        // Advanced Filters
        if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod;
        if (status && status !== 'All') query.status = status;
        if (type && type !== 'All') query.type = type;
        if (cashier && cashier !== 'All') query.processedBy = cashier;

        if (minAmount || maxAmount) {
            query.total = {};
            if (minAmount) query.total.$gte = parseFloat(minAmount);
            if (maxAmount) query.total.$lte = parseFloat(maxAmount);
        }

        // Pagination options
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute query
        const totalDocs = await Transaction.countDocuments(query);
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            data: transactions,
            pagination: {
                total: totalDocs,
                page: pageNum,
                pages: Math.ceil(totalDocs / limitNum),
                limit: limitNum
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single transaction by ID
app.get('/api/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get transaction statistics
// Get transaction statistics (Summary Bar)
app.get('/api/transactions/stats/summary', async (req, res) => {
    try {
        const {
            startDate, endDate, searchQuery,
            paymentMethod, status, cashier, type,
            minAmount, maxAmount
        } = req.query;

        let query = {};

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search filtering
        if (searchQuery) {
            query.$or = [
                { transactionId: { $regex: searchQuery, $options: 'i' } },
                { 'customer.name': { $regex: searchQuery, $options: 'i' } },
                // If query is numeric, also search by billNumber
                ...(!isNaN(searchQuery) && searchQuery.trim() !== '' ? [{ billNumber: parseInt(searchQuery) }] : [])
            ];
        }

        if (paymentMethod && paymentMethod !== 'All') query.paymentMethod = paymentMethod;
        if (status && status !== 'All') query.status = status;
        if (type && type !== 'All') query.type = type;
        if (cashier && cashier !== 'All') query.processedBy = cashier;
        if (minAmount || maxAmount) {
            query.total = {};
            if (minAmount) query.total.$gte = parseFloat(minAmount);
            if (maxAmount) query.total.$lte = parseFloat(maxAmount);
        }

        const transactions = await Transaction.find(query);

        // Calculate summary stats
        // Net Sales = Gross Sales - Returns - Discounts - Tax? Usually Net Sales = Gross - Returns - Disc.
        // User Requirement: Gross, Discounts, Tax, Returns, Net Sales, Items Sold

        let grossSales = 0;
        let discounts = 0;
        let tax = 0;
        let returns = 0;
        let netSales = 0;
        let itemsSold = 0;
        let billsCount = 0;
        let cashSales = 0;
        let cardSales = 0;
        let creditSales = 0; // On-account

        transactions.forEach(t => {
            // Skip voided transactions for main stats
            if (t.status === 'Voided') return;

            billsCount++;

            const isReturn = t.type === 'Return';
            const amount = Math.abs(t.total);
            const tDiscount = t.discount || 0;
            const tTax = t.tax || 0;
            const itemCount = t.items.reduce((sum, i) => sum + (i.quantity || 0), 0);

            if (isReturn) {
                returns += amount;
                // For returns, we might technically subtract items sold? 
                // Or just track it separately. Usually Net Items = Sold - Returned.
                itemsSold -= itemCount;
            } else {
                // Gross Sales = Sum of Subtotals (List Price Volume).
                // If t.subtotal missing, use total.
                grossSales += (t.subtotal !== undefined ? t.subtotal : amount);
                itemsSold += itemCount;
            }

            discounts += tDiscount;
            tax += tTax;

            // Payment Methods breakdown
            if (!isReturn) {
                if (t.paymentMethod === 'Cash') cashSales += t.total;
                else if (t.paymentMethod === 'Card' || t.paymentMethod === 'Credit Card' || t.paymentMethod === 'Debit Card') cardSales += t.total;
                else if (t.paymentMethod === 'Credit' || t.paymentMethod === 'On Account') creditSales += t.total;
            } else {
                // Determine if we subtract returns from these buckets?
                // Z-report usually shows Net Cash.
                if (t.paymentMethod === 'Cash') cashSales -= amount;
                else if (['Card', 'Credit Card', 'Debit Card'].includes(t.paymentMethod)) cardSales -= amount;
                else if (['Credit', 'On Account'].includes(t.paymentMethod)) creditSales -= amount;
            }
        });

        netSales = grossSales - returns - discounts; // + tax? Net often means Revenue. Revenue includes Tax? No, Tax is liability.
        // Net Sales usually = Gross - Returns - Allowances - Discounts.

        res.json({
            grossSales,
            discounts,
            tax,
            returns,
            netSales,
            itemsSold,
            billsCount,
            cashSales,
            cardSales,
            creditSales
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Void Transaction
app.post('/api/transactions/:id/void', async (req, res) => {
    try {
        const { reason, voidedBy } = req.body;
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status === 'Voided') {
            return res.status(400).json({ message: 'Transaction is already voided' });
        }

        // Update Status
        transaction.status = 'Voided';
        transaction.voidReason = reason;
        transaction.voidedBy = voidedBy || 'Admin';
        transaction.voidedAt = new Date();

        await transaction.save();

        // REVERSE STOCK LOGIC
        // If it was a Sale, we usually want to put items back? 
        // User didn't specify strict Void logic, but usually "Void" means it didn't happen.
        // If it's a recent sale (e.g. same day), we put stock back.
        // If we are voiding history from 2 years ago, do we put stock back? Probably yes, 
        // assuming it was an error and stock wasn't actually sold.

        // However, if we void a Return, we might take stock back OUT?
        // Let's keep it simple: Only handle Sale Void -> Restock for now to be safe.

        if (transaction.type === 'Sale') {
            for (const item of transaction.items) {
                let medicine = null;
                const itemId = item.id;
                // Lookup similar to transaction creation
                if (typeof itemId === 'number' || (typeof itemId === 'string' && itemId.match(/^\d+$/))) {
                    medicine = await Medicine.findOne({ id: parseInt(itemId) });
                }
                if (!medicine && typeof itemId === 'string' && itemId.match(/^[0-9a-fA-F]{24}$/)) {
                    medicine = await Medicine.findById(itemId);
                }
                if (!medicine && item._id) {
                    medicine = await Medicine.findById(item._id);
                }

                if (medicine) {
                    console.log(`Void: Restocking ${medicine.name} (Qty: ${item.quantity})`);
                    medicine.stock += item.quantity;
                    await medicine.save();
                }
            }

            // Reverse Customer Stats
            if (transaction.customer && transaction.customer.id) {
                await Customer.findByIdAndUpdate(transaction.customer.id, {
                    $inc: { totalPurchases: -1, totalSpent: -transaction.total }
                });
            }
        }

        res.json({ message: 'Transaction voided successfully', transaction });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
    category: { type: String, required: true }, // Rent, Electricity, Salary, Maintenance, Other
    subCategory: String, // Sub-category under main category
    amount: { type: Number, required: true },
    description: String,
    date: { type: Date, required: true },
    paymentMethod: { type: String, default: 'Cash' },
    vendor: String, // Vendor/Supplier name
    isRecurring: { type: Boolean, default: false },
    recurrenceType: { type: String, enum: ['Monthly', 'Weekly'], default: 'Monthly' },
    attachment: String, // File path or URL
    verified: { type: Boolean, default: false },
    recordedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

// Staff Management Schemas (salary-driven)
const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    cnic: String,
    role: {
        type: String,
        enum: [
            'Pharmacist',
            'Assistant Pharmacist',
            'Salesman',
            'Cashier',
            'Store Keeper',
            'Delivery Rider',
            'Admin'
        ],
        default: 'Salesman'
    },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
    joiningDate: { type: Date, default: Date.now },

    // Salary configuration
    salaryType: {
        type: String,
        enum: ['Monthly', 'Daily', 'Commission', 'Hybrid'],
        default: 'Monthly'
    },
    baseSalary: { type: Number, default: 0 },
    salaryCycle: {
        type: String,
        enum: ['Monthly', 'Weekly'],
        default: 'Monthly'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank', 'EasyPaisa', 'JazzCash'],
        default: 'Cash'
    },

    // Commission / incentives
    salesCommissionPercent: { type: Number, default: 0 },
    monthlyTarget: { type: Number, default: 0 },
    monthlyBonus: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

staffSchema.index({ role: 1 });

const Staff = mongoose.model('Staff', staffSchema);

// Staff permissions (discount, medicine control, access)
const staffPermissionSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    canSellControlledMedicines: { type: Boolean, default: false },
    canOverridePrescription: { type: Boolean, default: false },
    canApproveReturns: { type: Boolean, default: false },
    canOverrideExpiry: { type: Boolean, default: false },

    // Discount controls
    maxDiscountPercent: { type: Number, default: 0 },
    approvalRequiredAbove: { type: Number, default: 0 }, // above this %, admin approval required

    // Access flags (future use)
    canViewReports: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canEditInventory: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

const StaffPermission = mongoose.model('StaffPermission', staffPermissionSchema);

// Salary advances
const salaryAdvanceSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now, index: true },
    note: String,
    settledInPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryPayment' }, // optional
    createdAt: { type: Date, default: Date.now }
});

const SalaryAdvance = mongoose.model('SalaryAdvance', salaryAdvanceSchema);

// Salary payments
const salaryPaymentSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true, index: true },

    // Attendance inputs (for transparency)
    paidDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    paidLeave: { type: Number, default: 0 },
    unpaidLeave: { type: Number, default: 0 },

    // Breakdown
    baseSalary: { type: Number, default: 0 },
    unpaidDeduction: { type: Number, default: 0 },
    advancesDeducted: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    incentiveAmount: { type: Number, default: 0 },
    finalPayable: { type: Number, default: 0 },

    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank', 'EasyPaisa', 'JazzCash'],
        default: 'Cash'
    },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Paid' },
    paymentDate: { type: Date, default: Date.now, index: true },

    createdAt: { type: Date, default: Date.now }
});

salaryPaymentSchema.index({ staffId: 1, paymentDate: -1 });

const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema);

// Simple audit log for immutable tracking
const staffAuditLogSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    action: {
        type: String,
        enum: ['SALARY_EDIT', 'ADVANCE_ADDED', 'DISCOUNT_APPROVAL', 'ROLE_CHANGED', 'STAFF_DEACTIVATED'],
        required: true
    },
    details: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

const StaffAuditLog = mongoose.model('StaffAuditLog', staffAuditLogSchema);

// Expense Routes
// Get all expenses
app.get('/api/expenses', async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        let query = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        const expenses = await Expense.find(query).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Staff API Routes

// List all staff with optional status filter
app.get('/api/staff', async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status && status !== 'All') {
            query.status = status;
        }
        const staff = await Staff.find(query).sort({ createdAt: -1 });

        const staffIds = staff.map((s) => s._id);

        // Pending salary per staff
        const pendingAgg = await SalaryPayment.aggregate([
            { $match: { staffId: { $in: staffIds }, status: 'Pending' } },
            {
                $group: {
                    _id: '$staffId',
                    pendingAmount: { $sum: '$finalPayable' }
                }
            }
        ]);
        const pendingMap = new Map(pendingAgg.map((p) => [String(p._id), p.pendingAmount]));

        // Last paid salary per staff
        const lastPaid = await SalaryPayment.aggregate([
            { $match: { staffId: { $in: staffIds }, status: 'Paid' } },
            { $sort: { paymentDate: -1 } },
            {
                $group: {
                    _id: '$staffId',
                    lastPaymentDate: { $first: '$paymentDate' }
                }
            }
        ]);
        const lastPaidMap = new Map(lastPaid.map((p) => [String(p._id), p.lastPaymentDate]));

        // Unsettled advances (advance balance)
        const advancesAgg = await SalaryAdvance.aggregate([
            {
                $match: {
                    staffId: { $in: staffIds },
                    settledInPaymentId: { $exists: false }
                }
            },
            {
                $group: {
                    _id: '$staffId',
                    advanceBalance: { $sum: '$amount' }
                }
            }
        ]);
        const advanceMap = new Map(
            advancesAgg.map((a) => [String(a._id), a.advanceBalance])
        );

        const result = staff.map((s) => {
            const idStr = String(s._id);
            const pending = pendingMap.get(idStr) || 0;
            const lastPaidDate = lastPaidMap.get(idStr) || null;
            const advanceBalance = advanceMap.get(idStr) || 0;

            let salaryStatus = 'Paid';
            if (pending > 0 && lastPaidDate) {
                salaryStatus = 'Partially Paid';
            } else if (pending > 0 && !lastPaidDate) {
                salaryStatus = 'Unpaid';
            }

            return {
                ...s.toObject(),
                pendingSalary: pending,
                salaryStatus,
                advanceBalance,
                lastSalaryPaidOn: lastPaidDate
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single staff profile (with permissions)
app.get('/api/staff/:id', async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        const permissions = await StaffPermission.findOne({ staffId: staff._id });
        res.json({ staff, permissions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create staff + default permissions
app.post('/api/staff', async (req, res) => {
    try {
        const staff = new Staff(req.body);
        const saved = await staff.save();

        // Create default permissions record
        const perm = new StaffPermission({
            staffId: saved._id,
            maxDiscountPercent: 0,
            approvalRequiredAbove: 0
        });
        await perm.save();

        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update staff profile / salary config
app.put('/api/staff/:id', async (req, res) => {
    try {
        const updated = await Staff.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Staff not found' });
        }
        await StaffAuditLog.create({
            staffId: updated._id,
            action: 'SALARY_EDIT',
            details: { updatedFields: req.body }
        });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Deactivate / activate staff
app.patch('/api/staff/:id/status', async (req, res) => {
    try {
        const updated = await Staff.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Staff not found' });

        await StaffAuditLog.create({
            staffId: updated._id,
            action: 'STAFF_DEACTIVATED',
            details: { status: req.body.status }
        });

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete staff + cascading delete of all related data
app.delete('/api/staff/:id', async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        // CASCADE DELETE: Remove all associated data
        await Promise.all([
            StaffPermission.deleteMany({ staffId: staff._id }),
            SalaryAdvance.deleteMany({ staffId: staff._id }),
            SalaryPayment.deleteMany({ staffId: staff._id }),
            StaffAuditLog.deleteMany({ staffId: staff._id }),
            Staff.findByIdAndDelete(req.params.id)
        ]);

        console.log(`Cascade Delete: Removed staff ${staff.name} and all associated records.`);
        res.json({ message: 'Staff and all historical data deleted successfully' });
    } catch (err) {
        console.error('Delete Staff Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update permissions (discount / medicine control)
app.put('/api/staff/:id/permissions', async (req, res) => {
    try {
        const permissions = await StaffPermission.findOneAndUpdate(
            { staffId: req.params.id },
            req.body,
            { new: true, upsert: true }
        );
        await StaffAuditLog.create({
            staffId: req.params.id,
            action: 'ROLE_CHANGED',
            details: { permissions: req.body }
        });
        res.json(permissions);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add advance salary
app.post('/api/staff/:id/advances', async (req, res) => {
    try {
        const advance = new SalaryAdvance({
            staffId: req.params.id,
            amount: req.body.amount,
            date: req.body.date || new Date(),
            note: req.body.note || ''
        });
        const saved = await advance.save();
        await StaffAuditLog.create({
            staffId: req.params.id,
            action: 'ADVANCE_ADDED',
            details: { amount: req.body.amount, date: saved.date }
        });
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// List advances for staff
app.get('/api/staff/:id/advances', async (req, res) => {
    try {
        const advances = await SalaryAdvance.find({ staffId: req.params.id }).sort({ date: -1 });
        res.json(advances);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Calculate and pay salary for a period
app.post('/api/staff/:id/payments', async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        const {
            periodStart,
            periodEnd,
            paidDays = 0,
            unpaidDays = 0,
            halfDays = 0,
            paidLeave = 0,
            unpaidLeave = 0
        } = req.body;

        const start = new Date(periodStart);
        const end = new Date(periodEnd);

        // Find all unsettled advances up to this period
        const advances = await SalaryAdvance.find({
            staffId: staff._id,
            date: { $lte: end },
            settledInPaymentId: { $exists: false }
        });
        const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0);

        // Basic unpaid deduction: assume 30 working days for monthly salary
        const daysInCycle = staff.salaryCycle === 'Weekly' ? 7 : 30;
        const perDay = staff.baseSalary / daysInCycle;
        const totalUnpaid = Number(unpaidDays) + Number(unpaidLeave);
        const unpaidDeduction = perDay * totalUnpaid;

        // Commission based on sales in this period (by processedBy name)
        let commissionAmount = 0;
        if (staff.salesCommissionPercent > 0) {
            const salesAgg = await Transaction.aggregate([
                {
                    $match: {
                        type: 'Sale',
                        createdAt: { $gte: start, $lte: end },
                        processedBy: staff.name
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$total' }
                    }
                }
            ]);
            const totalSales = salesAgg[0]?.totalSales || 0;
            commissionAmount = (totalSales * staff.salesCommissionPercent) / 100;
        }

        const incentiveAmount = staff.monthlyBonus || 0;
        const baseSalary = staff.baseSalary;
        const finalPayable = baseSalary - unpaidDeduction - advancesTotal + commissionAmount + incentiveAmount;

        const payment = new SalaryPayment({
            staffId: staff._id,
            periodStart: start,
            periodEnd: end,
            paidDays,
            unpaidDays,
            halfDays,
            paidLeave,
            unpaidLeave,
            baseSalary,
            unpaidDeduction,
            advancesDeducted: advancesTotal,
            commissionAmount,
            incentiveAmount,
            finalPayable,
            paymentMethod: req.body.paymentMethod || staff.paymentMethod || 'Cash',
            status: 'Paid'
        });

        const savedPayment = await payment.save();

        // Mark advances as settled in this payment
        await SalaryAdvance.updateMany(
            { _id: { $in: advances.map(a => a._id) } },
            { $set: { settledInPaymentId: savedPayment._id } }
        );

        await StaffAuditLog.create({
            staffId: staff._id,
            action: 'SALARY_EDIT',
            details: { paymentId: savedPayment._id, finalPayable }
        });

        res.status(201).json(savedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// List salary payments for staff
app.get('/api/staff/:id/payments', async (req, res) => {
    try {
        const payments = await SalaryPayment.find({ staffId: req.params.id }).sort({ paymentDate: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Staff audit logs
app.get('/api/staff/:id/audit-logs', async (req, res) => {
    try {
        const logs = await StaffAuditLog.find({ staffId: req.params.id }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add expense
app.post('/api/expenses', async (req, res) => {
    try {
        const newExpense = new Expense(req.body);
        const savedExpense = await newExpense.save();
        res.status(201).json(savedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedExpense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Seed data
app.post('/api/seed', async (req, res) => {
    try {
        await Medicine.deleteMany({});
        await Customer.deleteMany({});

        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        const twoMonths = new Date(today);
        twoMonths.setMonth(today.getMonth() + 2);
        const fourMonths = new Date(today);
        fourMonths.setMonth(today.getMonth() + 4);

        const seedData = [
            {
                id: 1,
                name: 'Adhesive Bandages',
                description: 'Flexible bandages for cuts and scrapes.',
                price: 3.00,
                stock: 71,
                unit: 'Box',
                netContent: '50 assorted',
                category: 'First Aid',
                image: 'https://placehold.co/100x100?text=Bandages',
                expiryDate: fourMonths // Safe
            },
            {
                id: 2,
                name: 'Allergy Relief Tabs',
                description: 'Non-drowsy relief from allergy symptoms like sneezing...',
                price: 8.99,
                stock: 26,
                unit: 'Box',
                netContent: '20 tablets',
                category: 'Antihistamines',
                image: 'https://placehold.co/100x100?text=Allergy',
                expiryDate: nextMonth // Expiring soon
            },
            {
                id: 3,
                name: 'Amoxicillin 250mg',
                description: 'Antibiotic for bacterial infections (prescription required).',
                price: 12.00,
                stock: 19,
                unit: 'Strip',
                netContent: '10 capsules',
                category: 'Antibiotics',
                image: 'https://placehold.co/100x100?text=Amoxicillin',
                expiryDate: twoMonths // Expiring soon
            },
            {
                id: 4,
                name: 'Cefalaxin',
                description: 'Best for infections',
                price: 13.00,
                stock: 94,
                unit: 'Box',
                netContent: '15',
                category: 'Antibiotics',
                image: 'https://placehold.co/100x100?text=Cefalaxin',
                expiryDate: nextMonth // Expiring soon
            },
            {
                id: 5,
                name: 'Cough Suppressant',
                description: 'Relieves dry and irritating coughs.',
                price: 6.20,
                stock: 37,
                unit: 'Bottle',
                netContent: '100ml',
                category: 'Pain Relief',
                image: 'https://placehold.co/100x100?text=Cough',
                expiryDate: fourMonths // Safe
            },
            {
                id: 6,
                name: 'Vitamin C 1000mg',
                description: 'Immune system support.',
                price: 9.50,
                stock: 45,
                unit: 'Bottle',
                netContent: '60 tablets',
                category: 'Vitamins',
                image: 'https://placehold.co/100x100?text=Vitamin+C',
                expiryDate: fourMonths // Safe
            }
        ];

        // Seed Customers
        const seedCustomers = [
            {
                name: 'John Doe',
                email: 'john.doe@email.com',
                phone: '+1 234 567 8900',
                address: '123 Main St, City',
                joinDate: 'Jan 15, 2024',
                totalPurchases: 15,
                totalSpent: 450.00,
                status: 'Active'
            },
            {
                name: 'Jane Smith',
                email: 'jane.smith@email.com',
                phone: '+1 234 567 8901',
                address: '456 Oak Ave, Town',
                joinDate: 'Feb 20, 2024',
                totalPurchases: 8,
                totalSpent: 280.00,
                status: 'Active'
            }
        ];

        await Medicine.insertMany(seedData);
        await Customer.insertMany(seedCustomers);
        res.json({ message: 'Database seeded successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Dashboard Stats Endpoint
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateQuery = {};

        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = end;
            }
        }

        // 1. Fetch Data
        const [transactions, expenses, payments, medicines, supplies] = await Promise.all([
            Transaction.find(dateQuery),
            Expense.find(startDate || endDate ? {
                date: {
                    ...(startDate && { $gte: new Date(startDate) }),
                    ...(endDate && { $lte: new Date(endDate + 'T23:59:59') })
                }
            } : {}),
            Payment.find(startDate || endDate ? {
                date: {
                    ...(startDate && { $gte: new Date(startDate) }),
                    ...(endDate && { $lte: new Date(endDate + 'T23:59:59') })
                }
            } : {}),
            Medicine.find({}),
            Supply.find({})
        ]);


        const costMap = {};
        medicines.forEach(m => {
            if (m.id) costMap[m.id] = m.costPrice || 0;
            if (m._id) costMap[m._id.toString()] = m.costPrice || 0;
            costMap[m.name] = m.costPrice || 0;
        });

        // 2. Calculate Transaction Stats (Sales, Returns, COGS, Write-offs)
        let grossSales = 0;
        let salesReturns = 0;
        let cogsSold = 0;
        let cogsRestocked = 0; // COGS reversed because we got the item back
        let writeOffs = 0; // COGS lost because item damaged/expired
        let txCount = 0;
        let returnCount = 0;

        transactions.forEach(tx => {
            if (tx.type === 'Return' || tx.total < 0) {
                // Return Transaction
                returnCount++;
                salesReturns += Math.abs(tx.total);

                tx.items.forEach(item => {
                    let cost = costMap[item.id] || costMap[item.name] || 0;
                    if (!cost && !isNaN(item.id)) cost = costMap[parseInt(item.id)] || 0;
                    const packSize = item.packSize || 1;
                    const qty = Math.abs(item.quantity || 0);
                    const itemTotalCost = cost * (qty / packSize);

                    if (item.condition === 'Damaged') {
                        writeOffs += itemTotalCost;
                    } else {
                        // Restocked
                        // We reversed the sale effectively. So we reverse the COGS.
                        cogsRestocked += itemTotalCost;
                    }
                });

            } else {
                // Sale Transaction
                txCount++;
                grossSales += tx.total;
                tx.items.forEach(item => {
                    let cost = costMap[item.id] || costMap[item.name] || 0;
                    if (!cost && !isNaN(item.id)) cost = costMap[parseInt(item.id)] || 0;
                    const packSize = item.packSize || 1;
                    const qty = Math.abs(item.quantity || 0);
                    cogsSold += (cost * (qty / packSize));
                });
            }
        });

        // 3. Expenses & Purchase Returns
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const purchaseReturns = payments
            .filter(p => p.method === 'Debit Note')
            .reduce((sum, p) => sum + (p.amount || 0), 0);


        const netSales = grossSales - salesReturns;
        const netCOGS = cogsSold - cogsRestocked; // All item costs that didn't come back to shelf
        const netProfit = netSales - netCOGS - totalExpenses + purchaseReturns;


        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);


        const activeMedicineIds = new Set();
        supplies.forEach(s => {
            if (s.medicineId) activeMedicineIds.add(s.medicineId.toString());
        });

        const activeMedicines = medicines.filter(m => {
            if (!m.inInventory) return false;
            // Check by ID or _id
            const hasSupply = (m.id && activeMedicineIds.has(m.id.toString())) ||
                (m._id && activeMedicineIds.has(m._id.toString()));
            return hasSupply;
        });

        const expiringDocs = activeMedicines.filter(m => {
            if (!m.expiryDate) return false;
            return new Date(m.expiryDate) <= threeMonthsFromNow;
        });

        const lowStockDocs = activeMedicines.filter(m => {
            const packSize = m.packSize || 1;
            const strips = m.stock / packSize;
            return (strips <= (m.minStock || 10));
        });

        const expiryValueAtRisk = expiringDocs.reduce((sum, m) => {
            const packSize = m.packSize || 1;
            const strips = m.stock / packSize;
            return sum + ((m.costPrice || 0) * strips);
        }, 0);

        // Payables
        const suppliersList = await Supplier.find({}); // Need all suppliers for totals
        const totalPayables = suppliersList.reduce((sum, s) => sum + (s.totalPayable > 0 ? s.totalPayable : 0), 0);

        res.json({
            sales: {
                gross: grossSales,
                net: netSales,
                count: txCount
            },
            returns: {
                total: salesReturns,
                count: returnCount,
                writeOffs: writeOffs
            },
            cogs: {
                sold: cogsSold,
                net: netCOGS
            },
            expenses: {
                total: totalExpenses
            },
            purchaseReturns: {
                total: purchaseReturns
            },
            profit: {
                total: netProfit,
                formula: 'NetSales (Gross - Returns) - NetCOGS (Sold - Restocked) - Expenses + PurchaseReturns'
            },
            payables: {
                total: totalPayables
            },
            inventory: {
                expiryCount: expiringDocs.length,
                expiryValueAtRisk: expiryValueAtRisk,
                lowStockCount: lowStockDocs.length
            }
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// ==================== BATCH API ROUTES ====================

// Get all batches with optional filtering
app.get('/api/batches', async (req, res) => {
    try {
        const { medicineId, status, expiryRange, days, from, to } = req.query;

        let query = {};

        // Filter by medicine
        if (medicineId) {
            query.medicineId = medicineId;
        }

        // Filter by status
        if (status && status !== 'All') {
            query.status = status;
        }

        // Filter by expiry range
        if (expiryRange || days || (from && to)) {
            const today = new Date();
            let expiryQuery = {};

            if (expiryRange === 'expired') {
                expiryQuery = { $lt: today };
            } else if (days) {
                const futureDate = new Date();
                futureDate.setDate(today.getDate() + parseInt(days));
                expiryQuery = { $gte: today, $lte: futureDate };
            } else if (from && to) {
                expiryQuery = { $gte: new Date(from), $lte: new Date(to) };
            }

            if (Object.keys(expiryQuery).length > 0) {
                query.expiryDate = expiryQuery;
            }
        }

        const batches = await Batch.find(query)
            .populate('medicineId', 'name category unit')
            .populate('supplierId', 'name')
            .sort({ expiryDate: 1, createdAt: -1 });

        res.json(batches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get batches for a specific medicine
app.get('/api/batches/medicine/:medicineId', async (req, res) => {
    try {
        const batches = await Batch.find({ medicineId: req.params.medicineId })
            .populate('supplierId', 'name')
            .sort({ expiryDate: 1 });
        res.json(batches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get specific batch by ID
app.get('/api/batches/:id', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id)
            .populate('medicineId')
            .populate('supplierId');
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(batch);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new batch
app.post('/api/batches', async (req, res) => {
    try {
        const {
            batchNumber,
            medicineId,
            medicineName,
            quantity,
            expiryDate,
            purchaseDate,
            supplierId,
            supplierName,
            costPrice,
            sellingPrice,
            notes
        } = req.body;

        const batch = new Batch({
            batchNumber,
            medicineId,
            medicineName,
            quantity,
            purchasedQuantity: quantity,
            expiryDate,
            purchaseDate,
            supplierId,
            supplierName,
            costPrice,
            sellingPrice,
            notes,
            status: 'Active'
        });

        const savedBatch = await batch.save();

        // Update medicine stock (aggregate from all active batches)
        await updateMedicineStockFromBatches(medicineId);

        res.status(201).json(savedBatch);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update batch
app.put('/api/batches/:id', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Update allowed fields
        const allowedUpdates = ['quantity', 'status', 'discountPercentage', 'notes', 'sellingPrice'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                batch[field] = req.body[field];
            }
        });

        batch.updatedAt = new Date();
        const updatedBatch = await batch.save();

        // Update medicine stock
        await updateMedicineStockFromBatches(batch.medicineId);

        res.json(updatedBatch);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete batch
app.delete('/api/batches/:id', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const medicineId = batch.medicineId;
        await Batch.findByIdAndDelete(req.params.id);

        // Update medicine stock
        await updateMedicineStockFromBatches(medicineId);

        res.json({ message: 'Batch deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Batch action: Mark as expired
app.post('/api/batches/:id/mark-expired', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.status = 'Expired';
        batch.updatedAt = new Date();
        await batch.save();

        // Update medicine stock
        await updateMedicineStockFromBatches(batch.medicineId);

        res.json({ message: 'Batch marked as expired', batch });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Batch action: Block from sale
app.post('/api/batches/:id/block', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.status = 'Blocked';
        batch.updatedAt = new Date();
        await batch.save();

        // Update medicine stock
        await updateMedicineStockFromBatches(batch.medicineId);

        res.json({ message: 'Batch blocked from sale', batch });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Batch action: Apply discount
app.post('/api/batches/:id/apply-discount', async (req, res) => {
    try {
        const { discountPercentage } = req.body;

        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.discountPercentage = discountPercentage || 0;
        batch.updatedAt = new Date();
        await batch.save();

        res.json({ message: 'Discount applied to batch', batch });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Batch action: Return to supplier
app.post('/api/batches/:id/return', async (req, res) => {
    try {
        const { notes } = req.body;

        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.status = 'Returned';
        batch.notes = notes || batch.notes;
        batch.updatedAt = new Date();
        await batch.save();

        // Update medicine stock
        await updateMedicineStockFromBatches(batch.medicineId);

        // TODO: Create credit note or adjust supplier balance

        res.json({ message: 'Batch returned to supplier', batch });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Batch action: Write off
app.post('/api/batches/:id/writeoff', async (req, res) => {
    try {
        const { notes } = req.body;

        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        batch.status = 'WrittenOff';
        batch.notes = notes || batch.notes;
        batch.updatedAt = new Date();
        await batch.save();

        // Update medicine stock
        await updateMedicineStockFromBatches(batch.medicineId);

        res.json({ message: 'Batch written off as expired loss', batch });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get expiry summary report
app.get('/api/reports/expiry/summary', async (req, res) => {
    try {
        const { month } = req.query;

        let dateQuery = {};
        if (month) {
            const [year, monthNum] = month.split('-');
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);
            dateQuery = { $gte: startDate, $lte: endDate };
        }

        const expiredBatches = await Batch.find({
            status: { $in: ['Expired', 'WrittenOff'] },
            ...(Object.keys(dateQuery).length > 0 && { updatedAt: dateQuery })
        });

        const totalQuantity = expiredBatches.reduce((sum, b) => sum + b.purchasedQuantity, 0);
        const totalValue = expiredBatches.reduce((sum, b) => sum + (b.purchasedQuantity * b.costPrice), 0);

        res.json({
            expiredBatches: expiredBatches.length,
            totalQuantity,
            totalValueLoss: totalValue,
            batches: expiredBatches
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get expiry ledger (detailed list)
app.get('/api/reports/expiry/ledger', async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = { status: { $in: ['Expired', 'WrittenOff'] } };

        if (from && to) {
            query.updatedAt = { $gte: new Date(from), $lte: new Date(to) };
        }

        const batches = await Batch.find(query)
            .populate('medicineId', 'name category')
            .populate('supplierId', 'name')
            .sort({ updatedAt: -1 });

        res.json(batches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper function to update medicine stock from active batches
async function updateMedicineStockFromBatches(medicineId) {
    try {
        const activeBatches = await Batch.find({
            medicineId,
            status: 'Active'
        });

        const totalStock = activeBatches.reduce((sum, batch) => sum + batch.quantity, 0);

        await Medicine.findByIdAndUpdate(medicineId, {
            stock: totalStock,
            lastUpdated: new Date()
        });
    } catch (err) {
        console.error('Error updating medicine stock:', err);
    }
}

// ==================== LOW STOCK INTELLIGENCE API ROUTES ====================

// Get inventory settings
app.get('/api/settings/inventory', async (req, res) => {
    try {
        let settings = await InventorySettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = await InventorySettings.create({});
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update inventory settings
app.put('/api/settings/inventory', async (req, res) => {
    try {
        let settings = await InventorySettings.findOne();
        if (!settings) {
            settings = new InventorySettings();
        }

        const allowedUpdates = [
            'globalMinStock', 'globalReorderLevel', 'globalReorderQuantity',
            'salesVelocityPeriodDays', 'fastMovingThreshold', 'slowMovingThreshold'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        });

        settings.updatedAt = new Date();
        await settings.save();

        res.json(settings);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Calculate sales velocity for a specific medicine
app.get('/api/medicines/:id/sales-velocity', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const result = await calculateSalesVelocity(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Recalculate sales velocity for all medicines
app.post('/api/medicines/calculate-all-velocity', async (req, res) => {
    try {
        const medicines = await Medicine.find({ inInventory: true });
        let updated = 0;

        for (const med of medicines) {
            try {
                await calculateSalesVelocity(med._id);
                updated++;
            } catch (err) {
                console.error(`Error calculating velocity for ${med.name}:`, err);
            }
        }

        res.json({ message: `Updated velocity for ${updated} products`, total: medicines.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get reorder suggestion for a medicine
app.get('/api/medicines/:id/reorder-suggestion', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const suggestion = calculateReorderSuggestion(medicine);
        res.json(suggestion);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get stock forecast for a medicine
app.get('/api/medicines/forecast/:id', async (req, res) => {
    try {
        const { days } = req.query;
        const forecastDays = parseInt(days) || 7;

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const forecast = calculateStockForecast(
            medicine.stock,
            medicine.averageDailySales,
            forecastDays
        );

        res.json(forecast);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get enriched low stock items
app.get('/api/medicines/low-stock', async (req, res) => {
    try {
        const medicines = await Medicine.find({
            inInventory: true,
            status: 'Active'
        }).populate('preferredSupplierId', 'name phone email');

        // Filter for low stock items
        const lowStockItems = medicines.filter(med => {
            const stock = parseInt(med.stock || 0);
            const threshold = med.reorderLevel || med.minStock || 10;
            return stock <= threshold;
        });

        // Enrich with calculations
        const enrichedItems = lowStockItems.map(med => {
            const suggestion = calculateReorderSuggestion(med);
            const forecast7 = calculateStockForecast(med.stock, med.averageDailySales, 7);
            const forecast15 = calculateStockForecast(med.stock, med.averageDailySales, 15);
            const forecast30 = calculateStockForecast(med.stock, med.averageDailySales, 30);

            return {
                ...med.toObject(),
                reorderSuggestion: suggestion,
                forecasts: {
                    days7: forecast7,
                    days15: forecast15,
                    days30: forecast30
                }
            };
        });

        // Sort by urgency: Critical first, then by days remaining
        enrichedItems.sort((a, b) => {
            if (a.reorderSuggestion.urgency === 'Critical' && b.reorderSuggestion.urgency !== 'Critical') return -1;
            if (a.reorderSuggestion.urgency !== 'Critical' && b.reorderSuggestion.urgency === 'Critical') return 1;

            const daysA = a.reorderSuggestion.estimatedDaysRemaining || 999;
            const daysB = b.reorderSuggestion.estimatedDaysRemaining || 999;
            return daysA - daysB;
        });

        res.json(enrichedItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get supplier info for a medicine
app.get('/api/medicines/:id/supplier-info', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id)
            .populate('preferredSupplierId');

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        res.json({
            medicine: {
                name: medicine.name,
                lastPurchasePrice: medicine.lastPurchasePrice,
                leadTimeDays: medicine.leadTimeDays
            },
            supplier: medicine.preferredSupplierId || null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper function: Calculate sales velocity
async function calculateSalesVelocity(medicineId) {
    const settings = await InventorySettings.findOne() || {};
    const periodDays = settings.salesVelocityPeriodDays || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get transactions in period
    const transactions = await Transaction.find({
        type: 'Sale',
        status: 'Posted',
        createdAt: { $gte: startDate }
    });

    // Sum quantities sold for this medicine
    let totalSold = 0;
    transactions.forEach(tx => {
        tx.items.forEach(item => {
            // Match by both Number ID and ObjectId
            if (item.id && item.id.toString() === medicineId.toString()) {
                totalSold += item.quantity || 0;
            }
        });
    });

    const averageDailySales = totalSold / periodDays;

    // Classify velocity
    let velocity = 'Normal';
    if (averageDailySales >= (settings.fastMovingThreshold || 10)) {
        velocity = 'Fast';
    } else if (averageDailySales <= (settings.slowMovingThreshold || 1)) {
        velocity = 'Slow';
    }

    // Update medicine
    await Medicine.findByIdAndUpdate(medicineId, {
        salesVelocity: velocity,
        averageDailySales,
        lastSalesCalculation: new Date()
    });

    return { velocity, averageDailySales, periodDays, totalSold };
}

// Helper function: Calculate stock forecast
function calculateStockForecast(currentStock, averageDailySales, days) {
    const projectedSales = averageDailySales * days;
    const forecastedStock = currentStock - projectedSales;

    let stockOutDate = null;
    if (forecastedStock <= 0 && averageDailySales > 0) {
        const daysUntilStockOut = currentStock / averageDailySales;
        stockOutDate = new Date(Date.now() + daysUntilStockOut * 24 * 60 * 60 * 1000);
    }

    return {
        currentStock,
        dailySales: averageDailySales,
        forecastDays: days,
        projectedSales: Math.round(projectedSales),
        forecastedStock: Math.round(forecastedStock),
        willStockOut: forecastedStock <= 0,
        stockOutDate
    };
}

// Helper function: Calculate reorder suggestion
function calculateReorderSuggestion(medicine) {
    const {
        stock,
        minStock,
        reorderLevel,
        reorderQuantity,
        averageDailySales,
        leadTimeDays
    } = medicine;

    const effectiveMinStock = minStock || 10;
    const effectiveReorderLevel = reorderLevel || effectiveMinStock;
    const effectiveLeadTime = leadTimeDays || 7;

    // Calculate based on lead time and buffer
    const leadTimeConsumption = averageDailySales * effectiveLeadTime;
    const targetStock = leadTimeConsumption + effectiveMinStock;

    const suggestedQuantity = Math.max(
        Math.round(targetStock - stock),
        reorderQuantity || 50
    );

    let estimatedDaysRemaining = null;
    if (averageDailySales > 0) {
        estimatedDaysRemaining = Math.round(stock / averageDailySales);
    }

    return {
        shouldReorder: stock <= effectiveReorderLevel,
        suggestedQuantity: suggestedQuantity > 0 ? suggestedQuantity : 0,
        urgency: stock <= effectiveMinStock ? 'Critical' : 'Warning',
        estimatedDaysRemaining
    };
}

const migrateBillNumbers = async () => {
    try {
        const count = await Transaction.countDocuments({ billNumber: { $exists: false } });
        if (count > 0) {
            console.log(`[Migration] Found ${count} transactions without billNumber. Backfilling...`);
            const transactions = await Transaction.find({ billNumber: { $exists: false } }).sort({ createdAt: 1 });

            // Determine start number. If we have some bill numbers, start after max. Else 1001.
            let nextNum = 1001;
            const lastTx = await Transaction.findOne({ billNumber: { $exists: true } }).sort({ billNumber: -1 });
            if (lastTx && lastTx.billNumber) {
                nextNum = lastTx.billNumber + 1;
            }

            for (const tx of transactions) {
                tx.billNumber = nextNum++;
                await tx.save();
            }
            console.log(`[Migration] Successfully added billNumbers to ${count} transactions.`);
        }
    } catch (err) {
        console.error('[Migration] Error backfilling billNumbers:', err);
    }
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    // Basic local connection for standalone run
    connectDB()
        .then(async () => {
            console.log('MongoDB Connected (Local Wrapper)');
            await migrateBillNumbers();
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
                console.log('Routes: /api/medicines, /api/customers registered.');
            });
        })
        .catch(err => console.error('MongoDB Connection Error:', err));
}

export default app;
