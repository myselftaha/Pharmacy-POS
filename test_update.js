


async function testUpdate() {
    try {
        // 1. Get a supply to edit
        const res = await fetch('http://localhost:5000/api/supplies');
        const supplies = await res.json();

        if (supplies.length === 0) {
            console.log('No supplies found');
            return;
        }

        const supply = supplies[0];
        console.log('Testing update on supply:', supply.name, supply._id);

        // 2. Prepare payload mimicking EditSupplyModal
        // Note: Model sends 'currentStock' as int, 'price' as float, etc.
        const payload = {
            name: supply.name,
            category: 'Antibiotics',
            description: 'Test Description',
            price: 15,
            stock: "200", // Frontend sends it as string in state, but then parseInt. Let's send what fetch sends.
            // EditSupplyModal sends: { ...formData, currentStock: 200, price: 15, purchaseCost: 10 }
            // So it includes 'stock' (string) AND 'currentStock' (number)
            currentStock: 200,
            quantity: 200, // Legacy support?
            unit: 'Piece',
            netContent: '10 Tabs',
            batchNumber: 'TEST-BATCH',
            supplierName: 'Test Supplier',
            purchaseCost: null, // Simulate parseFloat("") -> NaN -> JSON null
            purchaseInvoiceNumber: 'INV-TEST',
            manufacturingDate: '2024-11-12',
            expiryDate: '2027-07-15',
            notes: 'Test Note'
        };

        const updateRes = await fetch(`http://localhost:5000/api/supplies/${supply._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await updateRes.json();
        console.log('Status:', updateRes.status);
        console.log('Response:', data);

    } catch (err) {
        console.error('Test Error:', err);
    }
}

testUpdate();
