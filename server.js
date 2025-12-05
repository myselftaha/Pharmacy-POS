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
    expiryDate: Date
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
        subtotal: Number
    }],
    subtotal: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
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

// Routes


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
        const newMedicine = new Medicine(req.body);
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

// Transaction Routes

// Create transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const newTransaction = new Transaction(req.body);
        const savedTransaction = await newTransaction.save();

        // Update customer statistics if customer is provided
        if (req.body.customer && req.body.customer.id) {
            await Customer.findByIdAndUpdate(
                req.body.customer.id,
                {
                    $inc: {
                        totalPurchases: 1,
                        totalSpent: req.body.total
                    }
                }
            );
        }

        // Update voucher usage if voucher was used
        if (req.body.voucher && req.body.voucher.id) {
            await Voucher.findByIdAndUpdate(
                req.body.voucher.id,
                { $inc: { usedCount: 1 } }
            );
        }

        res.status(201).json(savedTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get transactions with optional date filtering
app.get('/api/transactions', async (req, res) => {
    try {
        const { startDate, endDate, searchQuery } = req.query;
        let query = {};

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the entire end date
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

        const transactions = await Transaction.find(query).sort({ createdAt: -1 });
        res.json(transactions);
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
app.get('/api/transactions/stats/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
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

        const transactions = await Transaction.find(query);
        const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
        const totalTransactions = transactions.length;
        const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        res.json({
            totalSales,
            totalTransactions,
            averageTransaction
        });
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
