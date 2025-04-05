const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const dataFilePath = path.join(__dirname, 'data', 'groceries.json');
const ordersFilePath = path.join(__dirname, 'data', 'orders.json'); // Path for orders

// Helper function to read data from JSON file
const readData = () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const jsonData = fs.readFileSync(dataFilePath);
            return JSON.parse(jsonData);
        }
        console.warn("Data file not found, returning empty array.");
        return []; // Return empty array if file doesn't exist
    } catch (error) {
        console.error("Error reading data file:", error);
        // In case of read error (e.g., corrupted JSON), return empty array or handle appropriately
        return [];
    }
};

// Helper function to write data to JSON file
const writeData = (data) => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        return true; // Indicate success
    } catch (error) {
        console.error("Error writing data file:", error);
        return false; // Indicate failure
    }
};

// Helper function to read orders from JSON file
const readOrders = () => {
    try {
        if (fs.existsSync(ordersFilePath)) {
            const jsonData = fs.readFileSync(ordersFilePath);
            // Handle empty file case
            return jsonData.length > 0 ? JSON.parse(jsonData) : [];
        }
        console.warn("Orders file not found, returning empty array.");
        return []; // Return empty array if file doesn't exist
    } catch (error) {
        console.error("Error reading orders file:", error);
        return [];
    }
};

// Helper function to write orders to JSON file
const writeOrders = (orders) => {
    try {
        fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
        return true; // Indicate success
    } catch (error) {
        console.error("Error writing orders file:", error);
        return false; // Indicate failure
    }
};

// Load initial data and determine next ID
let groceryItems = readData();
let nextId = groceryItems.length > 0 ? Math.max(...groceryItems.map(item => item.id)) + 1 : 1;
// Load orders to determine next order ID
let orders = readOrders();
let nextOrderId = orders.length > 0 ? Math.max(...orders.map(order => order.id)) + 1 : 1;

// Middleware setup
app.use(cors({ origin: 'http://localhost:5173' })); // Allow requests from frontend dev server
app.use(express.json()); // Parse JSON request bodies

// --- API Endpoints ---

// GET /api/groceries - Retrieve all grocery items
app.get('/api/groceries', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/groceries`);
    // Read data fresh each time to ensure consistency if multiple requests happen
    const currentGroceries = readData();
    res.json(currentGroceries);
});

// POST /api/groceries - Add a new grocery item
app.post('/api/groceries', (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/groceries - Body:`, req.body);
    const { name, price, quantityAvailable } = req.body;

    // --- Input Validation ---
    let errors = [];
    if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push('Missing or invalid item name (must be a non-empty string)');
    }
    if (price == null) {
        errors.push('Missing price');
    } else if (typeof price !== 'number' || price <= 0 || !Number.isFinite(price)) {
        errors.push('Price must be a positive number');
    }
    if (quantityAvailable == null) {
         errors.push('Missing quantityAvailable');
    } else if (typeof quantityAvailable !== 'number' || !Number.isInteger(quantityAvailable) || quantityAvailable < 0) {
        errors.push('Quantity Available must be a non-negative integer');
    }

    if (errors.length > 0) {
         console.warn(`[${new Date().toISOString()}] POST /api/groceries - Validation failed:`, errors);
        return res.status(400).json({ message: 'Validation errors occurred', errors });
    }

    // --- Create and Add Item ---
    const newItem = {
        id: nextId++, // Assign next available ID and increment
        name: name.trim(),
        price: price,
        quantityAvailable: quantityAvailable
    };

    // Read current data before modifying
    let currentGroceries = readData();
    currentGroceries.push(newItem);

    // --- Persist Data ---
    const writeSuccess = writeData(currentGroceries);

    if (writeSuccess) {
        // Update in-memory state ONLY if write was successful
        groceryItems = currentGroceries;
        console.log(`[${new Date().toISOString()}] Added new item (ID: ${newItem.id}) and saved to file.`);
        res.status(201).json(newItem); // Return the newly created item
    } else {
        // If write failed, roll back the ID increment and don't update in-memory state
        nextId--;
        console.error(`[${new Date().toISOString()}] FAILED TO SAVE new item (ID: ${newItem.id}) TO FILE.`);
        res.status(500).json({ message: 'Failed to save the new item persistently. Please try again.' });
    }
});

// GET /api/groceries/:id - Retrieve a single grocery item by ID
app.get('/api/groceries/:id', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    console.log(`[${new Date().toISOString()}] GET /api/groceries/${itemId}`);

    if (isNaN(itemId)) {
        return res.status(400).json({ message: 'Invalid item ID provided.' });
    }

    // Read data fresh each time
    const currentGroceries = readData();
    const item = currentGroceries.find(g => g.id === itemId);

    if (item) {
        res.json(item);
    } else {
        console.warn(`[${new Date().toISOString()}] GET /api/groceries/${itemId} - Item not found.`);
        res.status(404).json({ message: `Item with ID ${itemId} not found.` });
    }
});

// POST /api/buy - Process a purchase request
app.post('/api/buy', (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/buy - Body:`, req.body);
    const itemsToBuy = req.body; // Expecting an array: [{ id: number, quantity: number, name: string, price: number }, ...] - Frontend sends more info now

    // --- Basic Request Validation ---
    if (!Array.isArray(itemsToBuy)) {
        return res.status(400).json({ message: 'Invalid request body: Expected an array of items.' });
    }
    if (itemsToBuy.length === 0) {
        return res.status(400).json({ message: 'Cannot process empty purchase request.' });
    }

    // --- Read current data (critical for stock check) ---
    let currentGroceries = readData();
    let validationErrors = [];
    let stockUpdates = []; // Store intended updates: { index: number, quantityToDeduct: number, name: string }
    let orderTotal = 0; // Calculate total for the order

    // --- Validate each item and check stock atomically ---
    for (const itemToBuy of itemsToBuy) {
        // Validate item format in the request (ensure price and name are present for order saving)
        if (!itemToBuy || typeof itemToBuy.id !== 'number' || typeof itemToBuy.quantity !== 'number' || itemToBuy.quantity <= 0 || !Number.isInteger(itemToBuy.quantity) || typeof itemToBuy.price !== 'number' || typeof itemToBuy.name !== 'string') {
            validationErrors.push(`Invalid item format or quantity/price/name for item ID ${itemToBuy?.id || 'unknown'}.`);
            continue; // Skip to next item if format is wrong
        }

        const groceryItemIndex = currentGroceries.findIndex(item => item.id === itemToBuy.id);

        // Check if item exists in our current data
        if (groceryItemIndex === -1) {
            validationErrors.push(`Item with ID ${itemToBuy.id} not found.`);
            continue;
        }

        const groceryItem = currentGroceries[groceryItemIndex];

        // Check stock availability
        if (groceryItem.quantityAvailable < itemToBuy.quantity) {
            validationErrors.push(`Insufficient stock for item ID ${itemToBuy.id} (${groceryItem.name}). Requested: ${itemToBuy.quantity}, Available: ${groceryItem.quantityAvailable}.`);
        } else {
            // If valid so far, record the intended update
            stockUpdates.push({
                index: groceryItemIndex,
                quantityToDeduct: itemToBuy.quantity,
                name: groceryItem.name // Store name for logging/confirmation
            });
            // Add to order total
            orderTotal += itemToBuy.price * itemToBuy.quantity;
        }
    }

    // --- If any validation errors occurred during the loop, abort the purchase ---
    if (validationErrors.length > 0) {
        console.warn(`[${new Date().toISOString()}] POST /api/buy - Validation failed:`, validationErrors);
        const statusCode = validationErrors.some(err => err.includes('Insufficient stock')) ? 409 : 400;
        return res.status(statusCode).json({ message: 'Purchase validation failed.', errors: validationErrors });
    }

    // --- Apply stock updates (only if all validations passed) ---
    stockUpdates.forEach(update => {
        currentGroceries[update.index].quantityAvailable -= update.quantityToDeduct;
        console.log(`[${new Date().toISOString()}] Reducing stock for ${update.name} (ID: ${currentGroceries[update.index].id}) by ${update.quantityToDeduct}. New stock: ${currentGroceries[update.index].quantityAvailable}`);
    });

    // --- Persist the updated grocery data ---
    const writeSuccess = writeData(currentGroceries);

    if (writeSuccess) {
        // Update the main in-memory grocery state ONLY after successful write
        groceryItems = currentGroceries;
        console.log(`[${new Date().toISOString()}] Purchase successful. Updated stock saved to file.`);

        // --- Create and Save Order ---
        const newOrder = {
            id: nextOrderId++,
            timestamp: new Date().toISOString(),
            items: itemsToBuy.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: parseFloat(orderTotal.toFixed(2))
        };

        // Read current orders, add new one, write back
        let currentOrders = readOrders();
        currentOrders.push(newOrder);
        const orderWriteSuccess = writeOrders(currentOrders);

        if (orderWriteSuccess) {
            orders = currentOrders; // Update in-memory orders
            console.log(`[${new Date().toISOString()}] Order (ID: ${newOrder.id}) saved successfully.`);
            res.status(200).json({ message: 'Purchase and order saving successful!', orderId: newOrder.id });
        } else {
            nextOrderId--; // Rollback order ID
            console.error(`[${new Date().toISOString()}] CRITICAL: Purchase successful BUT FAILED TO SAVE order (ID: ${newOrder.id}) TO FILE.`);
            res.status(207).json({ message: 'Purchase successful, but failed to save order history. Please contact support.', purchaseStatus: 'success', orderStatus: 'failed' });
        }
    } else {
        console.error(`[${new Date().toISOString()}] Purchase processed BUT FAILED TO SAVE updated stock TO FILE.`);
        res.status(500).json({ message: 'Purchase processed but failed to save updated stock persistently. Please check server logs.' });
    }
});

// PATCH /api/groceries/:id/stock - Update stock for a specific item
app.patch('/api/groceries/:id/stock', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    const { quantityChange } = req.body; // Can be positive (add) or negative (remove)

    console.log(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Body:`, req.body);

    // --- Input Validation ---
    if (isNaN(itemId)) {
        return res.status(400).json({ message: 'Invalid item ID provided.' });
    }
    if (quantityChange == null || typeof quantityChange !== 'number' || !Number.isInteger(quantityChange)) {
        return res.status(400).json({ message: 'Invalid quantityChange provided. Must be an integer.' });
    }
    if (quantityChange === 0) {
        return res.status(400).json({ message: 'Quantity change cannot be zero.' });
    }

    // --- Read current data ---
    let currentGroceries = readData();
    const itemIndex = currentGroceries.findIndex(item => item.id === itemId);

    // --- Check if item exists ---
    if (itemIndex === -1) {
        console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Item not found.`);
        return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
    }

    const itemToUpdate = currentGroceries[itemIndex];
    const originalQuantity = itemToUpdate.quantityAvailable;
    const newQuantity = originalQuantity + quantityChange;

    // --- Validate stock level for removal ---
    if (newQuantity < 0) {
        console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Cannot remove ${Math.abs(quantityChange)}. Only ${originalQuantity} available.`);
        return res.status(409).json({ message: `Cannot remove ${Math.abs(quantityChange)} of ${itemToUpdate.name}. Only ${originalQuantity} available.` });
    }

    // --- Apply the update ---
    currentGroceries[itemIndex].quantityAvailable = newQuantity;
    console.log(`[${new Date().toISOString()}] Updating stock for ${itemToUpdate.name} (ID: ${itemId}) from ${originalQuantity} to ${newQuantity}.`);

    // --- Persist the updated data ---
    const writeSuccess = writeData(currentGroceries);

    if (writeSuccess) {
        // Update the main in-memory state ONLY after successful write
        groceryItems = currentGroceries;
        console.log(`[${new Date().toISOString()}] Stock update successful for item ID ${itemId}. Saved to file.`);
        res.status(200).json(currentGroceries[itemIndex]); // Return the updated item
    } else {
        // CRITICAL: If write fails, roll back the in-memory change before responding
        currentGroceries[itemIndex].quantityAvailable = originalQuantity; // Revert change
        console.error(`[${new Date().toISOString()}] Stock update processed BUT FAILED TO SAVE updated stock TO FILE for item ID ${itemId}.`);
        res.status(500).json({ message: 'Stock update processed but failed to save persistently. Please check server logs.' });
    }
});

// GET /api/orders - Retrieve all past orders
app.get('/api/orders', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/orders`);
    // Read orders fresh each time
    const currentOrders = readOrders();
    res.json(currentOrders);
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    console.log(`Data file path: ${dataFilePath}`);
});
