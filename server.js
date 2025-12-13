import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection
mongoose.connect('mongodb+srv://mrtaha09876_db_user:larkana222@pharmacy-pos.kykzsbc.mongodb.net/medkit-pos?retryWrites=true&w=majority&appName=Pharmacy-POS')
    .then(() => console.log('MongoDB Atlas Connected Successfully'))
    .catch(err => console.log('MongoDB Connection Error:', err));

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
    inInventory: { type: Boolean, default: false },
    barcodes: [{
        code: String,
        unit: String,
        packSize: { type: Number, default: 1 }
    }]
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
    type: { type: String, enum: ['Sale', 'Return'], default: 'Sale' },
    status: { type: String, enum: ['Posted', 'Voided'], default: 'Posted' }, // Added status
    voidReason: String,
    voidedAt: Date,
    voidedBy: String,
    originalTransactionId: String, // For returns linked to sales
    customer: {
        id: String,
        name: { type: String, required: true },
        email: String,
        phone: String
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
    notes: String,
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
    openingBalance: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Supplier = mongoose.model('Supplier', supplierSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['Cash', 'Bank Transfer', 'Check'], default: 'Cash' },
    note: String,
    createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

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
                currentStock: med ? med.stock : 0,
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
            notes,
            category,
            description,
            price, // Selling Price
            unit,
            netContent,
            minStock
        } = req.body;

        // 1. Create Supply Record
        // We'll link it to a medicineId after we find/create the medicine
        // For now, let's just prepare the object

        // 2. Update or Create Medicine in Inventory
        let medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        let medicineId = null;

        if (medicine) {
            // Update existing medicine
            console.log(`Supply: Found existing medicine ${name}. InInventory: ${medicine.inInventory}, Old Stock: ${medicine.stock}`);

            // FIX: If medicine was NOT in inventory (effectively deleted/inactive), treat this as a fresh start.
            // Reset stock to the new quantity instead of adding to old (possibly negative/stale) stock.
            if (!medicine.inInventory) {
                medicine.stock = parseInt(quantity);
                console.log(`Supply: Reactivating item. Reset stock to ${medicine.stock}`);
            } else {
                medicine.stock = (medicine.stock || 0) + parseInt(quantity);
            }

            medicine.costPrice = purchaseCost;
            medicine.supplier = supplierName;
            medicine.expiryDate = expiryDate;
            // Update other fields if provided (optional, but good to keep fresh)
            if (price) medicine.price = price;
            if (category) medicine.category = category;
            if (description) medicine.description = description;

            medicine.inInventory = true; // Ensure it's active in inventory

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
                price: price || 0,
                stock: parseInt(quantity),
                unit: unit || 'Piece',
                netContent: netContent || '',
                expiryDate,
                costPrice: purchaseCost,
                minStock: minStock || 10,
                supplier: supplierName,
                note: notes,
                inInventory: true
            });
            await medicine.save();
            medicineId = nextId;
            console.log(`Supply: Created new medicine ${name}. Stock: ${quantity}`);
        }

        // 3. Check if Supply with same Invoice + Batch already exists
        const existingSupply = await Supply.findOne({
            purchaseInvoiceNumber,
            batchNumber
        });

        let savedSupply;
        let quantityAdded = parseInt(quantity);
        let costAdded = purchaseCost;

        if (existingSupply) {
            // Update existing supply - merge quantities
            console.log(`Supply: Found existing supply with Invoice ${purchaseInvoiceNumber} and Batch ${batchNumber}. Merging...`);

            const oldQuantity = existingSupply.quantity;
            const oldCost = existingSupply.purchaseCost;

            existingSupply.quantity += quantityAdded;
            existingSupply.purchaseCost += costAdded;

            // Update other fields to latest values
            existingSupply.name = name;
            existingSupply.supplierName = supplierName;
            existingSupply.manufacturingDate = manufacturingDate;
            existingSupply.expiryDate = expiryDate;
            existingSupply.notes = notes;
            existingSupply.medicineId = medicineId.toString();

            savedSupply = await existingSupply.save();

            console.log(`Supply: Merged. Old Qty: ${oldQuantity}, Added: ${quantityAdded}, New Qty: ${existingSupply.quantity}`);
            console.log(`Supply: Merged. Old Cost: ${oldCost}, Added: ${costAdded}, New Cost: ${existingSupply.purchaseCost}`);
        } else {
            // Create new supply record
            const newSupply = new Supply({
                medicineId: medicineId.toString(),
                name,
                batchNumber,
                supplierName,
                purchaseCost,
                purchaseInvoiceNumber,
                manufacturingDate,
                expiryDate,
                quantity,
                notes
            });

            savedSupply = await newSupply.save();
            console.log(`Supply: Created new supply record for Invoice ${purchaseInvoiceNumber}`);
        }

        // 4. Update Supplier Balance (only add the new cost, not total)
        if (supplierName) {
            const supplier = await Supplier.findOne({ name: { $regex: new RegExp(`^${supplierName}$`, 'i') } });
            if (supplier) {
                supplier.totalPayable += costAdded;
                await supplier.save();
                console.log(`Supply: Updated Supplier ${supplier.name} balance. New Payable: ${supplier.totalPayable}`);
            }
        }

        res.status(201).json(savedSupply);

    } catch (err) {
        console.error("Supply Error:", err);
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

        // Cascade delete: Remove associated Medicine
        if (supply.medicineId) {
            await Medicine.findOneAndDelete({
                $or: [
                    { id: parseInt(supply.medicineId) },
                    { _id: supply.medicineId }
                ]
            });
            console.log(`Cascade Delete: Removed Medicine linked to Supply ${supply.name}`);
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

// Update a supply record (and associated medicine)
app.put('/api/supplies/:id', async (req, res) => {
    console.log(`[PUT] /api/supplies/${req.params.id} called`);

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
            notes,
            category,
            description,
            price,
            unit,
            netContent,
            stock
        } = req.body;

        const supply = await Supply.findById(req.params.id);
        if (!supply) return res.status(404).json({ message: 'Supply not found' });

        const supplyUpdateData = {
            name,
            batchNumber,
            supplierName,
            purchaseInvoiceNumber,
            manufacturingDate: manufacturingDate || null,
            expiryDate: expiryDate || null,
            notes
        };

        if (quantity !== undefined && quantity !== null && quantity !== '') {
            supplyUpdateData.quantity = quantity;
        }

        if (purchaseCost !== undefined && purchaseCost !== null && purchaseCost !== '') {
            supplyUpdateData.purchaseCost = purchaseCost;
        }

        const updatedSupply = await Supply.findByIdAndUpdate(
            req.params.id,
            supplyUpdateData,
            { new: true, runValidators: true }
        );

        // Update Medicine
        const medicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (medicine) {
            if (category) medicine.category = category;
            if (description) medicine.description = description;
            if (price) medicine.price = price;
            if (unit) medicine.unit = unit;
            if (netContent) medicine.netContent = netContent;
            if (purchaseCost) medicine.costPrice = purchaseCost;
            if (supplierName) medicine.supplier = supplierName;
            if (expiryDate) medicine.expiryDate = expiryDate;
            if (stock !== undefined && stock !== null && stock !== '') {
                medicine.stock = parseInt(stock);
            }
            await medicine.save();
        }

        // Simple Balance Update Logic (Difference)
        const oldCost = supply.purchaseCost || 0;
        const newCostVal = (purchaseCost !== undefined && purchaseCost !== null && purchaseCost !== '') ? parseFloat(purchaseCost) : oldCost;

        if (oldCost !== newCostVal && supply.supplierName) {
            const diff = newCostVal - oldCost;
            const escapedName = supply.supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const sup = await Supplier.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
            if (sup) {
                sup.totalPayable += diff;
                await sup.save();
            }
        }

        res.json(updatedSupply);
    } catch (err) {
        console.error('Update Supply Error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Get all medicines
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
        const updatedMedicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
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
            // Note: joinDate is stored as string, need to convert for comparison
            const customers = await Customer.find();

            const filtered = customers.filter(customer => {
                if (!customer.joinDate) return true; // Include customers without join date

                // Parse the joinDate string (format: "MMM DD, YYYY")
                const joinDateObj = new Date(customer.joinDate);

                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    return joinDateObj >= start && joinDateObj <= end;
                } else if (startDate) {
                    const start = new Date(startDate);
                    return joinDateObj >= start;
                } else if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    return joinDateObj <= end;
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
        voucher.status = voucher.status === 'Active' ? 'Inactive' : 'Active';
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

        const newTransaction = new Transaction({
            ...req.body,
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
                    medicine.stock += item.quantity;
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
                        // Note: totalPurchases usually tracks # of visits, so we might still incr or leave it.
                        // Let's increment it as an "activity" but reduce totalSpent.
                        $inc: {
                            totalPurchases: 1,
                            totalSpent: finalTotal // finalTotal is negative
                        }
                    }
                );
            }

        } else {
            // NORMAL SALE Logic
            // Update customer statistics if customer is provided
            if (customer && customer.id) {
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
                    // Ensure we don't go below zero (optional, but good practice)
                    // For now, we allow negative stock or just simple subtraction as per requirement
                    medicine.stock -= item.quantity;
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
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json(suppliers);
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

// Get Supplier Details (with Ledger)
app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // Fetch related Supplies
        const supplies = await Supply.find({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        }).sort({ createdAt: -1 });

        // Fetch Payments
        const payments = await Payment.find({ supplierId: supplier._id }).sort({ date: -1 });

        // Combine into ledger
        let ledger = [];

        // 1. Opening Balance
        if (supplier.openingBalance !== 0 && supplier.openingBalance !== undefined) {
            ledger.push({
                id: 'opening',
                date: supplier.createdAt,
                type: 'Opening Balance',
                ref: '-',
                amount: Math.abs(supplier.openingBalance),
                status: 'Posted',
                isDebit: supplier.openingBalance < 0,
                isCredit: supplier.openingBalance > 0
            });
        }

        const supplyEntries = supplies.map(s => ({
            id: s._id,
            date: s.createdAt,
            type: 'Purchase',
            ref: s.purchaseInvoiceNumber || 'N/A',
            amount: (s.quantity || 0) * (s.purchaseCost || 0),
            status: 'Posted',
            isCredit: true,
            // Include item details for invoice modal
            name: s.name,
            batchNumber: s.batchNumber,
            quantity: s.quantity,
            unitCost: s.purchaseCost || 0,
            totalCost: (s.quantity || 0) * (s.purchaseCost || 0),
            manufacturingDate: s.manufacturingDate,
            expiryDate: s.expiryDate,
            notes: s.notes
        }));

        const paymentEntries = payments.map(p => ({
            id: p._id,
            date: p.date,
            type: 'Payment',
            ref: p.method,
            amount: p.amount,
            status: 'Posted',
            isDebit: true,
            note: p.note
        }));

        ledger = [...ledger, ...supplyEntries, ...paymentEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalPurchased = supplies.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.purchaseCost || 0)), 0);
        const totalPaid = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const balance = totalPurchased - totalPaid;

        res.json({
            supplier,
            ledger,
            stats: {
                totalPurchased,
                totalPaid,
                balance
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Record Payment
app.post('/api/suppliers/:id/pay', async (req, res) => {
    try {
        const { amount, date, method, note } = req.body;
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const newPayment = new Payment({
            supplierId: supplier._id,
            amount,
            date: date || new Date(),
            method,
            note
        });

        await newPayment.save();

        // Update Supplier Balance
        supplier.totalPayable -= amount;
        await supplier.save();

        res.status(201).json(newPayment);

    } catch (err) {
        res.status(400).json({ message: err.message });
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

        // Check if supplier has any supplies
        const suppliesCount = await Supply.countDocuments({
            supplierName: { $regex: new RegExp(`^${supplier.name}$`, 'i') }
        });

        if (suppliesCount > 0) {
            return res.status(400).json({
                message: `Cannot delete supplier with ${suppliesCount} associated supply records. Please delete supplies first.`
            });
        }

        // Check if supplier has any payments
        const paymentsCount = await Payment.countDocuments({ supplierId: supplier._id });

        if (paymentsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete supplier with ${paymentsCount} payment records. Please remove payments first.`
            });
        }

        await Supplier.findByIdAndDelete(req.params.id);
        res.json({ message: 'Supplier deleted successfully' });

    } catch (err) {
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
                { 'customer.name': { $regex: searchQuery, $options: 'i' } }
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
                { 'customer.name': { $regex: searchQuery, $options: 'i' } }
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
        let billsCount = transactions.length;
        let cashSales = 0;
        let cardSales = 0;
        let creditSales = 0; // On-account

        transactions.forEach(t => {
            // Skip voided transactions for main stats, OR handle them separately?
            // "Net Sales" should definitely exclude voided.
            if (t.status === 'Voided') return;

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
                grossSales += (t.subtotal || amount); // Gross usually before discount/tax? Or Subtotal + Discount?
                // If subtotal is stored: Subtotal = (Price * Qty). Total = Subtotal - Discount + Tax.
                // Gross Sales = Sum of Subtotals (List Price Volume).

                // Let's assume t.subtotal is the sum of line items.
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
    amount: { type: Number, required: true },
    description: String,
    date: { type: Date, required: true },
    paymentMethod: { type: String, default: 'Cash' },
    recordedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', expenseSchema);

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
            Supply.find({}) // For inventory risk checks (all time generally, or strictly filtering?) 
            // Inventory risks are usually "current state", not historical. 
            // So we usually ignore date filters for "Current Low Stock". 
        ]);

        // Cost Map (ID -> Cost)
        // Try to match by number ID, string ID, and Name to be safe
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
                    // Find Cost
                    let cost = costMap[item.id] || costMap[item.name] || 0;
                    // If item.id is integer in DB but string in item
                    if (!cost && !isNaN(item.id)) cost = costMap[parseInt(item.id)] || 0;

                    const itemTotalCost = cost * (item.quantity || 0);

                    if (item.condition === 'Damaged') {
                        // Write-off: We lost the revenue AND the item cost (it's trash now)
                        // Actually, wait.
                        // Initial Sale: +Revenue, -COGS.
                        // Return: -Revenue (Refund).
                        // If Damaged: We explicitly ADD "Write-off" cost.
                        // Logic: Net Profit = (Sales - Returns) - Net COGS - Expenses - WriteOffs
                        // Net COGS = COGS_Sold. (In this case we DON'T reverse COGS because it wasn't restocked?
                        // If we don't reverse COGS, then "COGS_Sold" covers the cost of the item.
                        // So we effectively made a loss equal to the cost.
                        // Example: Cost 10, Price 15.
                        // Sale: Profit 5. (15 - 10).
                        // Return (Damaged): Refund 15.
                        // Net Cash: 0.
                        // Inventory: -1 Item.
                        // Total P&L should be -10.
                        // Formula: (15 - 15) - 10 - 0 - 0 = -10.
                        // So if we include the original COGS in "COGS_Sold", and we DO NOT deduct it from COGS (i.e. do not add to cogsRestocked),
                        // then we are fine. We don't need a separate "WriteOff" term unless we want to display it.
                        // BUT the user ASKED for "- Write-offs".
                        // So to satisfy the specific formula: `... - COGS - WriteOffs ...`
                        // We must ensure COGS reflects ONLY items that were sold and STAYED sold.
                        // OR we define COGS as "Cost of all items that left the shelf".
                        // Standard: COGS is for sales. Write-off is for losses.
                        // Let's count it as WriteOff and NOT as COGS?
                        // Actually easier: COGS works for the sale. Write-off is an expense.
                        // Let's track `writeOffs` separately.
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
                    cogsSold += (cost * (item.quantity || 0));
                });
            }
        });

        // 3. Expenses & Purchase Returns
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const purchaseReturns = payments
            .filter(p => p.method === 'Debit Note')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // 4. Final Calculations
        // Net COGS = Cost of goods that were sold and NOT returned to stock.
        // Wait, if I use the user's formula: `... - COGS - WriteOffs ...`
        // If I keep the damaged item in COGS (because it was sold), and ALSO subtract WriteOffs, I double count the loss.
        // Cost 10. Sale. COGS = 10.
        // Return Damaged. WriteOff = 10.
        // Result: -10 (COGS) - 10 (WriteOff) = -20.
        // Incorrect. I only lost 10.
        // CORRECT LOGIC for User's Formula:
        // COGS should be "Cost of Goods Sold (Net)". i.e. Original COGS - Cost of ALL Returns (whether damaged or not).
        // Then we Add back "Write-off" as a negative? Or just subtract Write-off?
        // Let's do:
        // COGS = cogsSold - (cogsRestocked + writeOffs). (So COGS is zero for the returned item).
        // Then we subtract Write-offs (10).
        // Result: 0 (Net Sales) - 0 (Net COGS) - 10 (Write-off) = -10. Correct.
        const netCOGS = cogsSold - cogsRestocked - writeOffs; // Strictly cost of items currently in customer hands.

        const netSales = grossSales - salesReturns;
        const netProfit = netSales - netCOGS - totalExpenses - writeOffs + purchaseReturns;

        // 5. Inventory Stats (Snapshot - Date filters usually don't apply to "Current Stock" alerts, but good to know)
        // If date filter is active, these stats might be less relevant, but we return current state.
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        // Filter to only include medicines that have at least one supply record (active inventory)
        // This matches the strict filter applied on the Inventory page
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
            return (m.stock <= (m.minStock || 10));
        });

        const expiryValueAtRisk = expiringDocs.reduce((sum, m) => sum + (m.costPrice * m.stock), 0);

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
                formula: '(Sales - Returns) - NetCOGS - Expenses - WriteOffs + PurchaseReturns'
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes: /api/medicines, /api/customers registered.');
});
