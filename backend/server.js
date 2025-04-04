const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const dataFilePath = path.join(__dirname, 'data', 'groceries.json');

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

// Load initial data and determine next ID
let groceryItems = readData();
let nextId = groceryItems.length > 0 ? Math.max(...groceryItems.map(item => item.id)) + 1 : 1;

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

// POST /api/buy - Process a purchase request
app.post('/api/buy', (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/buy - Body:`, req.body);
    const itemsToBuy = req.body; // Expecting an array: [{ id: number, quantity: number }, ...]

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

    // --- Validate each item and check stock atomically ---
    for (const itemToBuy of itemsToBuy) {
        // Validate item format in the request
        if (!itemToBuy || typeof itemToBuy.id !== 'number' || typeof itemToBuy.quantity !== 'number' || itemToBuy.quantity <= 0 || !Number.isInteger(itemToBuy.quantity)) {
            validationErrors.push(`Invalid item format or quantity for item ID ${itemToBuy?.id || 'unknown'}. Quantity must be a positive integer.`);
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
        }
    }

    // --- If any validation errors occurred during the loop, abort the purchase ---
    if (validationErrors.length > 0) {
        console.warn(`[${new Date().toISOString()}] POST /api/buy - Validation failed:`, validationErrors);
        // Use 409 Conflict if it's specifically a stock issue, otherwise 400 for general validation errors
        const statusCode = validationErrors.some(err => err.includes('Insufficient stock')) ? 409 : 400;
        return res.status(statusCode).json({ message: 'Purchase validation failed.', errors: validationErrors });
    }

    // --- Apply stock updates (only if all validations passed) ---
    // Modify the 'currentGroceries' array directly
    stockUpdates.forEach(update => {
        currentGroceries[update.index].quantityAvailable -= update.quantityToDeduct;
        console.log(`[${new Date().toISOString()}] Reducing stock for ${update.name} (ID: ${currentGroceries[update.index].id}) by ${update.quantityToDeduct}. New stock: ${currentGroceries[update.index].quantityAvailable}`);
    });

    // --- Persist the updated data ---
    const writeSuccess = writeData(currentGroceries);

    if (writeSuccess) {
        // Update the main in-memory state ONLY after successful write
        groceryItems = currentGroceries;
        console.log(`[${new Date().toISOString()}] Purchase successful. Updated stock saved to file.`);
        res.status(200).json({ message: 'Purchase successful!', updatedItemsCount: stockUpdates.length });
    } else {
        // CRITICAL: If write fails, we should ideally roll back the changes or at least report a server error.
        // Since we modified 'currentGroceries' in memory before writing, the state is now inconsistent
        // between memory (if not reverted) and the (failed) file write.
        // For simplicity here, we report the error but the in-memory 'groceryItems' might not be updated.
        // A more robust solution would involve transactions or restoring 'currentGroceries' from a backup before modification.
        console.error(`[${new Date().toISOString()}] Purchase processed BUT FAILED TO SAVE updated stock TO FILE.`);
        res.status(500).json({ message: 'Purchase processed but failed to save updated stock persistently. Please check server logs.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    console.log(`Data file path: ${dataFilePath}`);
});
