const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10; // For bcrypt hashing
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-very-secret-key'; // Use environment variable in production

// --- File Paths ---
const groceriesFilePath = path.join(__dirname, 'data', 'groceries.json');
const usersFilePath = path.join(__dirname, 'data', 'users.json');
const orderHistoryFilePath = path.join(__dirname, 'data', 'order_history.json');
const inventoryHistoryFilePath = path.join(__dirname, 'data', 'inventory_history.json'); // Inventory history file path
const deletedGroceriesFilePath = path.join(__dirname, 'data', 'deleted_groceries.json'); // Deleted groceries file path

// --- Helper Functions ---

// Generic function to read JSON data
const readJsonFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const jsonData = fs.readFileSync(filePath);
            // Handle empty file case gracefully
            return jsonData.length > 0 ? JSON.parse(jsonData) : [];
        }
        console.warn(`File not found: ${filePath}. Returning empty array.`);
        return [];
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return []; // Return empty array on error
    }
};

// Generic function to write JSON data
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
};

// Specific read/write functions using the generic helpers
const readGroceries = () => readJsonFile(groceriesFilePath);
const writeGroceries = (data) => writeJsonFile(groceriesFilePath, data);
const readUsers = () => readJsonFile(usersFilePath);
const writeUsers = (data) => writeJsonFile(usersFilePath, data);
const readOrderHistory = () => readJsonFile(orderHistoryFilePath);
const writeOrderHistory = (data) => writeJsonFile(orderHistoryFilePath, data);
const readInventoryHistory = () => readJsonFile(inventoryHistoryFilePath); // Read inventory history
const writeInventoryHistory = (data) => writeJsonFile(inventoryHistoryFilePath, data); // Write inventory history
const readDeletedGroceries = () => readJsonFile(deletedGroceriesFilePath); // Read deleted groceries
const writeDeletedGroceries = (data) => writeJsonFile(deletedGroceriesFilePath, data); // Write deleted groceries


// Helper function to read data from JSON file - DEPRECATED, use readGroceries
const readData = () => {
    // This function is kept for backward compatibility if needed, but prefer readGroceries
    return readGroceries();
};

// Helper function to write data to JSON file - DEPRECATED, use writeGroceries
const writeData = (data) => {
    // This function is kept for backward compatibility if needed, but prefer writeGroceries
    return writeGroceries(data);
};

// Helper function to read orders from JSON file - DEPRECATED, use readOrderHistory
const readOrders = () => {
    // This function is kept for backward compatibility if needed, but prefer readOrderHistory
    return readOrderHistory();
};

// Helper function to write orders to JSON file - DEPRECATED, use writeOrderHistory
const writeOrders = (orders) => {
    // This function is kept for backward compatibility if needed, but prefer writeOrderHistory
    return writeOrderHistory(orders);
};


// --- Load initial data (less critical now as we read fresh on requests) ---
let groceryItems = readGroceries(); // Keep for potential reference if needed elsewhere
let nextId = groceryItems.length > 0 ? Math.max(...groceryItems.map(item => parseInt(item.id) || 0)) + 1 : 1; // Ensure IDs are numbers for max()

// --- Middleware setup ---
app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from frontend dev server
    credentials: true // Allow cookies to be sent/received
}));
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser(COOKIE_SECRET)); // Parse cookies, use secret for signing

// --- Authentication Middleware ---
const requireAuth = (req, res, next) => {
    const userId = req.signedCookies.userId; // Use signed cookies
    if (!userId) {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt to ${req.path}`);
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    // Attach user ID to request for later use in route handlers
    req.userId = userId;
    console.log(`[${new Date().toISOString()}] Authenticated access by user ${userId} to ${req.path}`);
    next();
};

// --- User Type Middleware ---
const requireCustomer = (req, res, next) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.userId);
    if (user && user.type === 'customer') {
        next(); // User is a customer, proceed
    } else {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt by user ${req.userId} (not customer) to ${req.path}`);
        res.status(403).json({ message: 'Unauthorized: Customers only.' });
    }
};

const requireOwner = (req, res, next) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.userId);
    if (user && user.type === 'owner') {
        next(); // User is an owner, proceed
    } else {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt by user ${req.userId} (not owner) to ${req.path}`);
        res.status(403).json({ message: 'Unauthorized: Owners only.' });
    }
};


// --- API Endpoints ---

// --- User Authentication Endpoints ---

// POST /api/register - Register a new user
app.post('/api/register', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/register - Body:`, req.body);
    const { username, password, email } = req.body;

    // Basic validation
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required.' });
    }
    if (password.length < 6) { // Example: enforce minimum password length
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const users = readUsers();

    // Check for existing user
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        const conflictField = existingUser.username === username ? 'Username' : 'Email';
        console.warn(`[${new Date().toISOString()}] Registration failed: ${conflictField} already exists.`);
        return res.status(409).json({ message: `${conflictField} already exists.` });
    }

    try {
        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user
        const newUser = {
            id: uuidv4(), // Generate unique ID
            username,
            email,
            passwordHash, // Store the hash, not the plain password
            type: 'customer' // Default user type is customer
        };

        users.push(newUser);

        // Save updated user list
        const writeSuccess = writeUsers(users);
        if (writeSuccess) {
            console.log(`[${new Date().toISOString()}] User registered successfully: ${username} (ID: ${newUser.id})`);
            // Exclude password hash from the response
            const { passwordHash: _, ...userResponse } = newUser;
            res.status(201).json({ message: 'User registered successfully.', user: userResponse });
        } else {
            console.error(`[${new Date().toISOString()}] FAILED TO SAVE new user ${username} TO FILE.`);
            res.status(500).json({ message: 'Failed to save user data. Please try again.' });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during registration for ${username}:`, error);
        res.status(500).json({ message: 'An internal server error occurred during registration.' });
    }
});

// POST /api/login - Log in a user
app.post('/api/login', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/login - Body:`, req.body);
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        console.warn(`[${new Date().toISOString()}] Login failed: User not found - ${username}`);
        return res.status(401).json({ message: 'Invalid username or password.' }); // Generic message for security
    }

    try {
        // Compare provided password with stored hash
        const match = await bcrypt.compare(password, user.passwordHash);

        if (match) {
            console.log(`[${new Date().toISOString()}] Login successful for user: ${username} (ID: ${user.id})`);
            // Set a signed, HTTP-only cookie for session management
            res.cookie('userId', user.id, {
                httpOnly: true, // Prevents client-side JS access
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
                signed: true, // Sign the cookie to prevent tampering
                maxAge: 24 * 60 * 60 * 1000 // Example: Cookie expires in 1 day
                // sameSite: 'Lax' // Or 'Strict' depending on requirements
            });

            // Return user info (excluding password hash and type)
            const { passwordHash: _, type: __, ...userResponse } = user;
            res.status(200).json({ message: 'Login successful.', user: { ...userResponse, type: user.type } });
        } else {
            console.warn(`[${new Date().toISOString()}] Login failed: Invalid password for user - ${username}`);
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during login for ${username}:`, error);
        res.status(500).json({ message: 'An internal server error occurred during login.' });
    }
});

// POST /api/logout - Log out a user
app.post('/api/logout', (req, res) => {
    const userId = req.signedCookies.userId;
    console.log(`[${new Date().toISOString()}] POST /api/logout - User: ${userId || 'N/A'}`);
    // Clear the cookie
    res.clearCookie('userId');
    res.status(200).json({ message: 'Logout successful.' });
});

// GET /api/session - Check current login status
app.get('/api/session', requireAuth, (req, res) => {
    // requireAuth middleware already validated the cookie and attached req.userId
    console.log(`[${new Date().toISOString()}] GET /api/session - User: ${req.userId}`);
    const users = readUsers();
    const user = users.find(u => u.id === req.userId);

    if (user) {
        // Return user info (excluding password hash and type)
        const { passwordHash: _, type: __, ...userResponse } = user;
        res.status(200).json({ user: { ...userResponse, type: user.type } });
    } else {
        // This case should ideally not happen if requireAuth works correctly
        console.error(`[${new Date().toISOString()}] Session check failed: User ID ${req.userId} from cookie not found in database.`);
        res.clearCookie('userId'); // Clear invalid cookie
        res.status(404).json({ message: 'User session data not found.' });
    }
});


// --- Grocery Endpoints ---

// GET /api/groceries - Retrieve all grocery items (No auth needed for browsing)
app.get('/api/groceries',  (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/groceries`);
    const currentGroceries = readGroceries();
    res.json(currentGroceries);
});

// POST /api/groceries - Add a new grocery item (Owners only)
app.post('/api/groceries', requireAuth, requireOwner, (req, res) => { // Added requireOwner middleware
    console.log(`[${new Date().toISOString()}] POST /api/groceries - Body:`, req.body);
    // Destructure category as well, make it optional
    const { name, price, quantityAvailable, category } = req.body;
    let currentGroceries = readGroceries(); // Read fresh data

    // --- Input Validation ---
    let errors = [];
    // (Validation logic remains largely the same)
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

    // Determine next ID based on current data
    const currentMaxId = currentGroceries.length > 0 ? Math.max(...currentGroceries.map(item => parseInt(item.id) || 0)) : 0;
    const newId = currentMaxId + 1;

    // --- Create and Add Item ---
    const newItem = {
        id: newId.toString(), // Keep IDs as strings for consistency
        name: name.trim(),
        price: price,
        quantityAvailable: quantityAvailable,
        // Add category, trim whitespace, default to 'Uncategorized' if empty
        category: category ? category.trim() : 'Uncategorized'
    };

    currentGroceries.push(newItem);

    // --- Persist Data ---
    const writeSuccess = writeGroceries(currentGroceries);

    if (writeSuccess) {
        groceryItems = currentGroceries; // Update in-memory cache if needed
        console.log(`[${new Date().toISOString()}] Added new item (ID: ${newItem.id}) and saved to file.`);
        res.status(201).json(newItem); // Return the newly created item
    } else {
        console.error(`[${new Date().toISOString()}] FAILED TO SAVE new item (ID: ${newItem.id}) TO FILE.`);
        res.status(500).json({ message: 'Failed to save the new item persistently. Please try again.' });
    }
});

// GET /api/groceries/:id - Retrieve a single grocery item by ID (No auth needed)
app.get('/api/groceries/:id', (req, res) => {
    const itemId = req.params.id; // Keep as string or parse depending on data format
    console.log(`[${new Date().toISOString()}] GET /api/groceries/${itemId}`);

    // Basic validation if parsing ID
    // if (isNaN(parseInt(itemId, 10))) {
    //     return res.status(400).json({ message: 'Invalid item ID provided.' });
    // }

    const currentGroceries = readGroceries();
    // Adjust find logic if IDs are stored as numbers vs strings
    const item = currentGroceries.find(g => g.id.toString() === itemId);

    if (item) {
        res.json(item);
    } else {
        console.warn(`[${new Date().toISOString()}] GET /api/groceries/${itemId} - Item not found.`);
        res.status(404).json({ message: `Item with ID ${itemId} not found.` });
    }
});

// PUT /api/groceries/:id - Update an existing grocery item (Owners only)
app.put('/api/groceries/:id', requireAuth, requireOwner, (req, res) => {
    const itemId = req.params.id;
    const { name, price, category } = req.body;
    const userId = req.userId; // Get owner ID from authenticated request

    console.log(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Owner: ${userId}, Body:`, req.body);

    // --- Input Validation ---
    let errors = [];
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        errors.push('Invalid item name (must be a non-empty string if provided)');
    }
    if (price !== undefined) {
        const priceNum = Number(price);
        if (typeof priceNum !== 'number' || priceNum <= 0 || !Number.isFinite(priceNum)) {
            errors.push('Price must be a positive number if provided');
        }
    }
    // Category can be an empty string or null, but should be a string if provided
    if (category !== undefined && typeof category !== 'string') {
         errors.push('Category must be a string if provided');
    }

    if (errors.length > 0) {
        console.warn(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Validation failed:`, errors);
        return res.status(400).json({ message: 'Validation errors occurred', errors });
    }

    // --- Read current data ---
    let currentGroceries = readGroceries();
    const itemIndex = currentGroceries.findIndex(item => item.id.toString() === itemId.toString());

    if (itemIndex === -1) {
        console.warn(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Item not found.`);
        return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
    }

    // --- Apply Updates ---
    const itemToUpdate = { ...currentGroceries[itemIndex] }; // Create a copy to modify
    let updated = false;

    if (name !== undefined && itemToUpdate.name !== name.trim()) {
        itemToUpdate.name = name.trim();
        updated = true;
    }
    if (price !== undefined && itemToUpdate.price !== parseFloat(price)) {
        itemToUpdate.price = parseFloat(price);
        updated = true;
    }
    const newCategory = category !== undefined ? (category.trim() || 'Uncategorized') : itemToUpdate.category;
    if (itemToUpdate.category !== newCategory) {
        itemToUpdate.category = newCategory;
        updated = true;
    }

    if (!updated) {
        console.log(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - No changes detected.`);
        // Return the original item or a 304 Not Modified? For simplicity, return original with 200.
        return res.status(200).json(itemToUpdate);
    }

    // Replace the old item with the updated one
    currentGroceries[itemIndex] = itemToUpdate;

    // --- Persist Data ---
    const writeSuccess = writeGroceries(currentGroceries);

    if (writeSuccess) {
        groceryItems = currentGroceries; // Update cache if needed
        console.log(`[${new Date().toISOString()}] Updated item (ID: ${itemId}) by owner ${userId}. Saved to file.`);
        // Optional: Log this change to inventory history? Maybe not for simple edits.
        res.status(200).json(itemToUpdate); // Return the updated item
    } else {
        console.error(`[${new Date().toISOString()}] FAILED TO SAVE updated item (ID: ${itemId}) TO FILE.`);
        res.status(500).json({ message: 'Failed to save the updated item persistently. Please try again.' });
    }
});


// --- Order Processing Endpoint (Requires Customer Authentication) ---

// POST /api/buy - Process a purchase request (Customers only)
app.post('/api/buy', requireAuth, requireCustomer, (req, res) => { // Added requireCustomer middleware
    const userId = req.userId; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] POST /api/buy - User: ${userId}, Body:`, req.body);
    const itemsToBuy = req.body; // Expecting an array: [{ id: string/number, quantity: number, name: string, price: number }, ...]

    // --- Basic Request Validation ---
    if (!Array.isArray(itemsToBuy)) {
        return res.status(400).json({ message: 'Invalid request body: Expected an array of items.' });
    }
    if (itemsToBuy.length === 0) {
        return res.status(400).json({ message: 'Cannot process empty purchase request.' });
    }

    // --- Read current data (critical for stock check) ---
    let currentGroceries = readGroceries();
    let validationErrors = [];
    let stockUpdates = []; // Store intended updates: { index: number, quantityToDeduct: number, name: string }
    let orderTotal = 0; // Calculate total for the order

    // --- Validate each item and check stock atomically ---
    for (const itemToBuy of itemsToBuy) {
        // Validate item format in the request
        if (!itemToBuy || itemToBuy.id == null || typeof itemToBuy.quantity !== 'number' || itemToBuy.quantity <= 0 || !Number.isInteger(itemToBuy.quantity) || typeof itemToBuy.price !== 'number' || typeof itemToBuy.name !== 'string') {
            validationErrors.push(`Invalid item format or quantity/price/name for item ID ${itemToBuy?.id || 'unknown'}.`);
            continue;
        }

        // Find item, handling potential string/number ID differences
        const groceryItemIndex = currentGroceries.findIndex(item => item.id.toString() === itemToBuy.id.toString());

        if (groceryItemIndex === -1) {
            validationErrors.push(`Item with ID ${itemToBuy.id} not found.`);
            continue;
        }

        const groceryItem = currentGroceries[groceryItemIndex];

        if (groceryItem.quantityAvailable < itemToBuy.quantity) {
            validationErrors.push(`Insufficient stock for item ID ${itemToBuy.id} (${groceryItem.name}). Requested: ${itemToBuy.quantity}, Available: ${groceryItem.quantityAvailable}.`);
        } else {
            stockUpdates.push({
                index: groceryItemIndex,
                quantityToDeduct: itemToBuy.quantity,
                name: groceryItem.name
            });
            orderTotal += itemToBuy.price * itemToBuy.quantity;
        }
    }

    if (validationErrors.length > 0) {
        console.warn(`[${new Date().toISOString()}] POST /api/buy - Validation failed for user ${userId}:`, validationErrors);
        const statusCode = validationErrors.some(err => err.includes('Insufficient stock')) ? 409 : 400;
        return res.status(statusCode).json({ message: 'Purchase validation failed.', errors: validationErrors });
    }

    // --- Apply stock updates ---
    stockUpdates.forEach(update => {
        currentGroceries[update.index].quantityAvailable -= update.quantityToDeduct;
        console.log(`[${new Date().toISOString()}] User ${userId} buying: Reducing stock for ${update.name} (ID: ${currentGroceries[update.index].id}) by ${update.quantityToDeduct}. New stock: ${currentGroceries[update.index].quantityAvailable}`);
    });

    // --- Persist the updated grocery data ---
    const groceryWriteSuccess = writeGroceries(currentGroceries);

    if (groceryWriteSuccess) {
        groceryItems = currentGroceries; // Update cache if needed
        console.log(`[${new Date().toISOString()}] Purchase by user ${userId} successful. Updated stock saved.`);

        // --- Create and Save Order History ---
        const newOrder = {
            orderId: uuidv4(), // Generate unique order ID
            userId: userId, // Link order to the logged-in user
            date: new Date().toISOString(),
            items: itemsToBuy.map(item => ({ // Store details of items bought
                id: item.id.toString(), // Ensure consistent ID format
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            total: parseFloat(orderTotal.toFixed(2)) // Store calculated total
        };

        let currentOrderHistory = readOrderHistory();
        currentOrderHistory.push(newOrder);
        const orderWriteSuccess = writeOrderHistory(currentOrderHistory);

        if (orderWriteSuccess) {
            console.log(`[${new Date().toISOString()}] Order (ID: ${newOrder.orderId}) for user ${userId} saved successfully.`);
            res.status(200).json({ message: 'Purchase successful and order saved!', orderId: newOrder.orderId });
        } else {
            // CRITICAL: Stock was updated, but order failed to save. This requires careful handling/logging.
            console.error(`[${new Date().toISOString()}] CRITICAL: Purchase by user ${userId} successful BUT FAILED TO SAVE order (ID: ${newOrder.orderId}) TO FILE.`);
            // Maybe attempt to roll back stock changes? Complex. For now, inform user.
            res.status(207).json({ message: 'Purchase successful, but failed to save order history. Please contact support.', purchaseStatus: 'success', orderStatus: 'failed' });
        }
    } else {
        console.error(`[${new Date().toISOString()}] Purchase by user ${userId} processed BUT FAILED TO SAVE updated stock TO FILE.`);
        // Don't proceed to save order if stock update failed
        res.status(500).json({ message: 'Purchase processed but failed to save updated stock persistently. Order not created.' });
    }
});


// --- Stock Update Endpoint (Owners only, Requires Authentication) ---

// PATCH /api/groceries/:id/stock - Update stock for a specific item (Owners only)
app.patch('/api/groceries/:id/stock', requireAuth, requireOwner, async (req, res) => { // Added requireOwner and requireAuth middleware
    const itemId = req.params.id;
    const { quantityChange } = req.body;
    const userId = req.userId; // Get user ID from authenticated request

    console.log(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - User: ${userId}, Body:`, req.body);

    // --- Input Validation ---
    // (Keep existing validation for itemId format if needed)
    if (quantityChange == null || typeof quantityChange !== 'number' || !Number.isInteger(quantityChange)) {
        return res.status(400).json({ message: 'Invalid quantityChange provided. Must be an integer.' });
    }
    if (quantityChange === 0) {
        return res.status(400).json({ message: 'Quantity change cannot be zero.' });
    }

    // --- Read current data ---
    let currentGroceries = readGroceries();
    const itemIndex = currentGroceries.findIndex(item => item.id.toString() === itemId.toString());

    if (itemIndex === -1) {
        console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Item not found.`);
        return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
    }

    const itemToUpdate = currentGroceries[itemIndex];
    const originalQuantity = itemToUpdate.quantityAvailable;
    const newQuantity = originalQuantity + quantityChange;

    if (newQuantity < 0) {
        console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Cannot remove ${Math.abs(quantityChange)}. Only ${originalQuantity} available.`);
        return res.status(409).json({ message: `Cannot remove ${Math.abs(quantityChange)} of ${itemToUpdate.name}. Only ${originalQuantity} available.` });
    }

    // --- Apply the update ---
    currentGroceries[itemIndex].quantityAvailable = newQuantity;
    console.log(`[${new Date().toISOString()}] Updating stock for ${itemToUpdate.name} (ID: ${itemId}) from ${originalQuantity} to ${newQuantity}.`);

    // --- Persist the updated data ---
    const writeSuccess = writeGroceries(currentGroceries);

    if (writeSuccess) {
        groceryItems = currentGroceries; // Update cache if needed
        console.log(`[${new Date().toISOString()}] Stock update successful for item ID ${itemId}. Saved to file.`);

        // --- Log to inventory history ---
        const historyEntry = {
            itemId: itemId,
            quantityChange: quantityChange,
            timestamp: new Date().toISOString(),
            userId: userId // Logged-in user ID
        };
        let currentInventoryHistory = readInventoryHistory();
        currentInventoryHistory.push(historyEntry);
        const historyWriteSuccess = writeInventoryHistory(currentInventoryHistory); // Save history

        if (historyWriteSuccess) {
            console.log(`[${new Date().toISOString()}] Inventory history updated for item ID ${itemId}.`);
            res.status(200).json(currentGroceries[itemIndex]); // Return the updated item
        } else {
            console.error(`[${new Date().toISOString()}] Stock updated, but FAILED TO SAVE inventory history for item ID ${itemId}.`);
            res.status(207).json({ message: 'Stock updated successfully, but failed to save inventory history.', stockUpdateStatus: 'success', historyStatus: 'failed' });
        }


    } else {
        // Roll back in-memory change if write failed
        currentGroceries[itemIndex].quantityAvailable = originalQuantity;
        console.error(`[${new Date().toISOString()}] Stock update processed BUT FAILED TO SAVE updated stock TO FILE for item ID ${itemId}.`);
        res.status(500).json({ message: 'Stock update processed but failed to save persistently. Please check server logs.' });
    }
});


// --- Order History Endpoint (Requires Authentication) ---

// GET /api/orders - Retrieve order history for the logged-in user
app.get('/api/orders', requireAuth, (req, res) => {
    const userId = req.userId;
    console.log(`[${new Date().toISOString()}] GET /api/orders - User: ${userId}`);

    const allOrderHistory = readOrderHistory();
    // Filter orders to return only those belonging to the logged-in user
    const userOrderHistory = allOrderHistory.filter(order => order.userId === userId);

    console.log(`[${new Date().toISOString()}] Found ${userOrderHistory.length} orders for user ${userId}.`);
    res.json(userOrderHistory);
});


// --- Grocery Deletion Endpoint (Owners only, Requires Authentication) ---

// DELETE /api/groceries/delete/:id - Delete a grocery item (move to deleted_groceries.json)
app.delete('/api/groceries/delete/:id', requireAuth, requireOwner, (req, res) => {
    const itemIdToDelete = req.params.id;
    const userId = req.userId; // Get user ID from authenticated request

    console.log(`[${new Date().toISOString()}] DELETE /api/groceries/delete/${itemIdToDelete} - Owner: ${userId}`);

    let currentGroceries = readGroceries();
    const itemIndex = currentGroceries.findIndex(item => item.id.toString() === itemIdToDelete.toString());

    if (itemIndex === -1) {
        console.warn(`[${new Date().toISOString()}] DELETE /api/groceries/delete/${itemIdToDelete} - Item not found.`);
        return res.status(404).json({ message: `Item with ID ${itemIdToDelete} not found.` });
    }

    const itemToDelete = currentGroceries[itemIndex];

    // Prepare the entry for deleted items
    const deletedItemEntry = {
        ...itemToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: userId // Optional: track who deleted it
    };

    // Read current deleted items
    let currentDeletedGroceries = readDeletedGroceries();
    currentDeletedGroceries.push(deletedItemEntry);

    // Remove item from the main groceries list
    currentGroceries.splice(itemIndex, 1);

    // Write both files
    const writeGroceriesSuccess = writeGroceries(currentGroceries);
    const writeDeletedSuccess = writeDeletedGroceries(currentDeletedGroceries);

    if (writeGroceriesSuccess && writeDeletedSuccess) {
        groceryItems = currentGroceries; // Update cache if needed
        console.log(`[${new Date().toISOString()}] Item ID ${itemIdToDelete} deleted by owner ${userId} and moved to deleted items.`);
        res.status(200).json({ message: `Item '${itemToDelete.name}' deleted successfully.` });
    } else {
        // Attempt to roll back if possible (tricky with file writes)
        // For simplicity, log the error and return a server error
        console.error(`[${new Date().toISOString()}] FAILED TO WRITE FILES during delete operation for item ID ${itemIdToDelete}. Groceries write: ${writeGroceriesSuccess}, Deleted write: ${writeDeletedSuccess}`);
        // If one write succeeded and the other failed, the data is inconsistent.
        res.status(500).json({ message: 'Failed to complete delete operation due to a server error. Data might be inconsistent.' });
    }
});


// --- Deleted Groceries Endpoint (Owners only, Requires Authentication) ---

// GET /api/deleted-groceries - Retrieve all deleted grocery items
app.get('/api/deleted-groceries', requireAuth, requireOwner, (req, res) => {
    const userId = req.userId; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/deleted-groceries - Owner: ${userId}`);

    try {
        const deletedGroceries = readDeletedGroceries();
        console.log(`[${new Date().toISOString()}] Retrieved ${deletedGroceries.length} deleted grocery records for owner ${userId}.`);
        res.status(200).json(deletedGroceries);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading deleted groceries for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve deleted groceries.' });
    }
});

// POST /api/deleted-groceries/restore/:id - Restore a deleted grocery item
app.post('/api/deleted-groceries/restore/:id', requireAuth, requireOwner, (req, res) => {
    const itemIdToRestore = req.params.id;
    const userId = req.userId;

    console.log(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Owner: ${userId}`);

    let currentDeletedGroceries = readDeletedGroceries();
    const itemIndex = currentDeletedGroceries.findIndex(item => item.id.toString() === itemIdToRestore.toString());

    if (itemIndex === -1) {
        console.warn(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Item not found in deleted items.`);
        return res.status(404).json({ message: `Item with ID ${itemIdToRestore} not found in deleted items.` });
    }

    const itemToRestore = currentDeletedGroceries[itemIndex];

    // Remove metadata added during deletion
    const { deletedAt, deletedBy, ...restoredItemData } = itemToRestore;

    // Read current active groceries
    let currentGroceries = readGroceries();

    // Check if an item with the same ID already exists in the active list (edge case)
    const existingActiveItem = currentGroceries.find(item => item.id.toString() === restoredItemData.id.toString());
    if (existingActiveItem) {
        console.warn(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Item with ID ${restoredItemData.id} already exists in active groceries. Cannot restore duplicate.`);
        // Decide how to handle: overwrite? return error? For now, return error.
        return res.status(409).json({ message: `Cannot restore item '${restoredItemData.name}'. An item with ID ${restoredItemData.id} already exists in the active list.` });
    }

    // Add the item back to the active list
    currentGroceries.push(restoredItemData);

    // Remove the item from the deleted list
    currentDeletedGroceries.splice(itemIndex, 1);

    // Write both files
    const writeGroceriesSuccess = writeGroceries(currentGroceries);
    const writeDeletedSuccess = writeDeletedGroceries(currentDeletedGroceries);

    if (writeGroceriesSuccess && writeDeletedSuccess) {
        groceryItems = currentGroceries; // Update cache if needed
        console.log(`[${new Date().toISOString()}] Item ID ${itemIdToRestore} restored by owner ${userId}.`);
        // Also need to update the main grocery list state in App.jsx after successful restore
        // The frontend will need to handle this based on the response
        res.status(200).json({ message: `Item '${restoredItemData.name}' restored successfully.`, restoredItem: restoredItemData });
    } else {
        console.error(`[${new Date().toISOString()}] FAILED TO WRITE FILES during restore operation for item ID ${itemIdToRestore}. Groceries write: ${writeGroceriesSuccess}, Deleted write: ${writeDeletedSuccess}`);
        res.status(500).json({ message: 'Failed to complete restore operation due to a server error. Data might be inconsistent.' });
    }
});


// --- Inventory History Endpoint (Owners only, Requires Authentication) ---

// GET /api/inventory-history - Retrieve all inventory history records
app.get('/api/inventory-history', requireAuth, requireOwner, (req, res) => {
    const userId = req.userId; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/inventory-history - Owner: ${userId}`);

    try {
        const inventoryHistory = readInventoryHistory();
        // Optional: Enhance history data (e.g., add item names if needed, though might be slow)
        // For now, just return the raw history
        console.log(`[${new Date().toISOString()}] Retrieved ${inventoryHistory.length} inventory history records for owner ${userId}.`);
        res.status(200).json(inventoryHistory);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading inventory history for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve inventory history.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    console.log(`Groceries file path: ${groceriesFilePath}`);
    console.log(`Users file path: ${usersFilePath}`);
    console.log(`Order History file path: ${orderHistoryFilePath}`);
    console.log(`Inventory History file path: ${inventoryHistoryFilePath}`); // Log inventory history file path
    console.log(`Deleted Groceries file path: ${deletedGroceriesFilePath}`); // Log deleted groceries file path
});
