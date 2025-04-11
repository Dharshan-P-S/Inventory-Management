const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Added Mongoose
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// --- Import Mongoose Models ---
const Grocery = require('./models/Grocery');
const User = require('./models/User');
const Order = require('./models/Order');
const EditHistory = require('./models/EditHistory');
const SalesHistory = require('./models/SalesHistory');
const PendingUser = require('./models/PendingUser');
const DeletedGrocery = require('./models/DeletedGrocery');

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10; // For bcrypt hashing
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-very-secret-key'; // Use environment variable in production
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_management'; // MongoDB connection string

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err}`);
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected.');
});

// --- Helper Function (Optional - for logging edits) ---
const logEdit = async (action, userId, details) => {
    try {
        const entry = {
            action,
            userId,
            timestamp: new Date(),
            ...details
        };
        await EditHistory.create(entry);
        console.log(`[${entry.timestamp.toISOString()}] Edit logged: Action=${action}, User=${userId}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] FAILED TO LOG EDIT: Action=${action}, User=${userId}`, error);
        // Decide if you need to handle this failure more actively
    }
};

// --- Middleware setup ---
app.use(cors({
    origin: 'http://localhost:5000', // Allow requests from frontend dev server
    credentials: true // Allow cookies to be sent/received
}));
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser(COOKIE_SECRET)); // Parse cookies, use secret for signing

// --- Authentication Middleware ---
const requireAuth = async (req, res, next) => { // Made async
    const userId = req.signedCookies.userId; // Use signed cookies
    if (!userId) {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt to ${req.path} - No userId cookie`);
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    try {
        // Fetch user from DB based on cookie ID
        const user = await User.findOne({ id: userId });
        if (!user) {
            console.warn(`[${new Date().toISOString()}] Unauthorized access attempt to ${req.path} - User ID ${userId} not found in DB.`);
            res.clearCookie('userId'); // Clear invalid cookie
            return res.status(401).json({ message: 'Invalid session. Please log in again.' });
        }
        // Attach user object (or just ID and type) to request
        req.user = user; // Attach the full user document
        req.userId = user.id; // Keep userId for compatibility if needed
        console.log(`[${new Date().toISOString()}] Authenticated access by user ${user.username} (ID: ${userId}, Type: ${user.type}) to ${req.path}`);
        next();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during authentication check for user ID ${userId}:`, error);
        res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};

// --- User Type Middleware ---
// These now assume requireAuth has run and attached req.user
const requireCustomer = (req, res, next) => {
    if (req.user && req.user.type === 'customer') {
        next(); // User is a customer, proceed
    } else {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt by user ${req.user?.username || req.userId} (not customer) to ${req.path}`);
        res.status(403).json({ message: 'Unauthorized: Customers only.' });
    }
};

const requireOwner = (req, res, next) => {
    if (req.user && req.user.type === 'owner') {
        next(); // User is an owner, proceed
    } else {
        console.warn(`[${new Date().toISOString()}] Unauthorized access attempt by user ${req.user?.username || req.userId} (not owner) to ${req.path}`);
        res.status(403).json({ message: 'Unauthorized: Owners only.' });
    }
};


// --- API Endpoints ---

// --- User Authentication Endpoints ---

// POST /api/register - Register a new user
app.post('/api/register', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/register - Body:`, req.body);
    const { username, password, email, userType } = req.body; // Added userType

    // Basic validation
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    const type = userType === 'owner' ? 'owner' : 'customer'; // Default to customer

    try {
        // Check for existing user in both active and pending collections
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        const existingPendingUser = await PendingUser.findOne({ $or: [{ username }, { email }] });

        if (existingUser || existingPendingUser) {
            const conflictField = (existingUser?.username === username || existingPendingUser?.username === username) ? 'Username' : 'Email';
            console.warn(`[${new Date().toISOString()}] Registration failed: ${conflictField} already exists (in users or pending).`);
            return res.status(409).json({ message: `${conflictField} already exists.` });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create new user data
        const newUser = {
            id: uuidv4(), // Generate unique ID
            username,
            email,
            passwordHash, // Store the hash
            id: uuidv4(), // Generate unique ID
            username,
            email,
            passwordHash, // Store the hash
            type: type
        };

        if (type === 'owner') {
            // Check if there are any existing owners in the system
            const existingOwners = await User.find({ type: 'owner' });
            
            if (existingOwners.length === 0) {
                // No existing owners, add directly to users collection without approval
                const createdUser = await User.create(newUser);
                console.log(`[${new Date().toISOString()}] First owner registered successfully without approval: ${username} (ID: ${createdUser.id})`);
                // Exclude password hash from the response
                const { passwordHash: _, ...userResponse } = createdUser.toObject();
                res.status(201).json({ message: 'First owner registered successfully.', user: userResponse, pending: false });
            } else {
                // Existing owners found, add to pending users collection for approval
                const createdPendingUser = await PendingUser.create(newUser);
                console.log(`[${new Date().toISOString()}] Owner registration pending approval: ${username} (ID: ${createdPendingUser.id})`);
                // Exclude password hash from the response
                const { passwordHash: _, ...userResponse } = createdPendingUser.toObject(); // Use toObject() for plain JS object
                res.status(201).json({ message: 'Owner registration successful. Account pending approval.', user: userResponse, pending: true });
            }
        } else {
            // Add directly to users collection (customer)
            const createdUser = await User.create(newUser);
            console.log(`[${new Date().toISOString()}] Customer registered successfully: ${username} (ID: ${createdUser.id})`);
            // Exclude password hash from the response
            const { passwordHash: _, ...userResponse } = createdUser.toObject();
            res.status(201).json({ message: 'User registered successfully.', user: userResponse, pending: false });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during registration for ${username}:`, error);
        // Check for Mongoose validation errors or duplicate key errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
        }
        if (error.code === 11000) { // Duplicate key error
             return res.status(409).json({ message: 'Username or email already exists.' });
        }
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

    try {
        // Check active users first
        let user = await User.findOne({ username });
        let isPending = false;

        if (!user) {
            // If not found in active users, check pending users
            user = await PendingUser.findOne({ username });
            if (user) {
                isPending = true; // Mark as pending if found here
            }
        }

        if (!user) {
            // If not found in either list
            console.warn(`[${new Date().toISOString()}] Login failed: User not found in active or pending lists - ${username}`);
            return res.status(401).json({ message: 'Invalid username or password.' }); // Generic message
        }

        // Compare provided password with stored hash
        const match = await bcrypt.compare(password, user.passwordHash);

        if (match) {
            // Check if the user is pending approval
            if (isPending) {
                console.warn(`[${new Date().toISOString()}] Login attempt failed: Account pending approval - ${username}`);
                return res.status(403).json({ message: 'Account pending approval.' }); // Forbidden status
            }

            // Proceed with login for approved users
            console.log(`[${new Date().toISOString()}] Login successful for user: ${username} (ID: ${user.id}, Type: ${user.type})`);
            // Set a signed, HTTP-only cookie for session management
            res.cookie('userId', user.id, {
                httpOnly: true, // Prevents client-side JS access
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
                signed: true, // Sign the cookie to prevent tampering
                maxAge: 24 * 60 * 60 * 1000 // Example: Cookie expires in 1 day
                // sameSite: 'Lax' // Or 'Strict' depending on requirements
            });

            // Return user info (excluding password hash)
            const { passwordHash: _, ...userResponse } = user.toObject(); // Use toObject()
            res.status(200).json({ message: 'Login successful.', user: userResponse }); // type is already included
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
app.get('/api/session', requireAuth, (req, res) => { // requireAuth now attaches req.user
    // requireAuth middleware already validated the cookie and fetched the user
    console.log(`[${new Date().toISOString()}] GET /api/session - User: ${req.user.username} (ID: ${req.userId})`);

    // User object is already available in req.user from requireAuth
    // Return user info (excluding password hash)
    const { passwordHash: _, ...userResponse } = req.user.toObject();
    res.status(200).json({ user: userResponse });
});


// --- Grocery Endpoints ---

// GET /api/groceries - Retrieve all grocery items (No auth needed for browsing)
app.get('/api/groceries', async (req, res) => { // Made async
    console.log(`[${new Date().toISOString()}] GET /api/groceries`);
    try {
        const currentGroceries = await Grocery.find({}); // Fetch from DB
        res.json(currentGroceries);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching groceries:`, error);
        res.status(500).json({ message: 'Failed to retrieve groceries.' });
    }
});

// POST /api/groceries - Add a new grocery item (Owners only)
app.post('/api/groceries', requireAuth, requireOwner, async (req, res) => { // Made async
    console.log(`[${new Date().toISOString()}] POST /api/groceries - User: ${req.user.username}, Body:`, req.body);
    // Destructure category and description, make them optional
    const { name, price, quantityAvailable, category, description } = req.body;
    const userId = req.user.id; // Get user ID from authenticated request

    // --- Input Validation (Mongoose schema handles some validation) ---
    // You can add extra validation here if needed, but rely on Mongoose first
    // Example: Check if name already exists (though schema might enforce uniqueness if needed)
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
    // Optional: Validate description if needed (e.g., length limit)
    if (description !== undefined && typeof description !== 'string') {
        errors.push('Description must be a string if provided');
    }


    if (errors.length > 0) {
         console.warn(`[${new Date().toISOString()}] POST /api/groceries - Validation failed:`, errors);
        return res.status(400).json({ message: 'Validation errors occurred', errors });
    }

    // --- Create and Add Item ---
    try {
        const newItemData = {
            id: uuidv4(), // Use UUID for new items
            name: name?.trim(), // Use optional chaining and trim
            price: price,
            quantityAvailable: quantityAvailable,
            category: category ? category.trim() : 'Uncategorized',
            description: description ? description.trim() : ""
        };

        const newGrocery = new Grocery(newItemData);
        const savedItem = await newGrocery.save(); // Save to DB

        console.log(`[${new Date().toISOString()}] Added new item (ID: ${savedItem.id}) by user ${userId}.`);

        // Log the addition
        await logEdit('item_add', userId, {
             item: { // Log details of the added item
                id: savedItem.id,
                name: savedItem.name,
                price: savedItem.price,
                category: savedItem.category,
                description: savedItem.description
            }
        });

        res.status(201).json(savedItem); // Return the newly created item from DB

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error adding grocery item by user ${userId}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to save the new item. Please try again.' });
    }
});

// GET /api/groceries/:id - Retrieve a single grocery item by ID (No auth needed)
app.get('/api/groceries/:id', async (req, res) => { // Made async
    const itemId = req.params.id;
    console.log(`[${new Date().toISOString()}] GET /api/groceries/${itemId}`);

    try {
        const item = await Grocery.findOne({ id: itemId }); // Find by custom 'id' field

        if (item) {
            res.json(item);
        } else {
            console.warn(`[${new Date().toISOString()}] GET /api/groceries/${itemId} - Item not found.`);
            res.status(404).json({ message: `Item with ID ${itemId} not found.` });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching grocery item ${itemId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve grocery item.' });
    }
});

// PUT /api/groceries/:id - Update an existing grocery item (Owners only)
app.put('/api/groceries/:id', requireAuth, requireOwner, async (req, res) => { // Made async
    const itemId = req.params.id;
    // Include description in the destructured body
    const { name, price, category, description } = req.body;
    const userId = req.user.id; // Get owner ID from authenticated request

    console.log(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Owner: ${userId}, Body:`, req.body);

    // --- Input Validation (Mongoose handles some, add more if needed) ---
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
    // Optional: Validate description if needed (e.g., length limit)
    if (description !== undefined && typeof description !== 'string') {
        errors.push('Description must be a string if provided');
    }


    if (errors.length > 0) {
        console.warn(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Validation failed:`, errors);
        return res.status(400).json({ message: 'Validation errors occurred', errors });
    }

    // --- Find and Update Item ---
    try {
        const originalItem = await Grocery.findOne({ id: itemId });

        if (!originalItem) {
            console.warn(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Item not found.`);
            return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
        }

        // Build update object and track changes
        const updateData = {};
        const changes = {};

        if (name !== undefined && originalItem.name !== name.trim()) {
            changes.name = { old: originalItem.name, new: name.trim() };
            updateData.name = name.trim();
        }
        const newPrice = price !== undefined ? parseFloat(price) : originalItem.price;
        if (price !== undefined && originalItem.price !== newPrice) {
             // Basic validation for price
            if (typeof newPrice !== 'number' || newPrice <= 0 || !Number.isFinite(newPrice)) {
                 return res.status(400).json({ message: 'Price must be a positive number.' });
            }
            changes.price = { old: originalItem.price, new: newPrice };
            updateData.price = newPrice;
        }
        const newCategory = category !== undefined ? (category.trim() || 'Uncategorized') : originalItem.category;
        if (originalItem.category !== newCategory) {
            changes.category = { old: originalItem.category, new: newCategory };
            updateData.category = newCategory;
        }
        const newDescription = description !== undefined ? description.trim() : originalItem.description;
         if (originalItem.description !== newDescription) {
            changes.description = { old: originalItem.description, new: newDescription };
            updateData.description = newDescription;
        }


        const hasChanges = Object.keys(changes).length > 0;

        if (!hasChanges) {
            console.log(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - No changes detected.`);
            return res.status(200).json(originalItem); // Return the original item
        }

        // Perform the update
        const updatedItem = await Grocery.findOneAndUpdate(
            { id: itemId },
            { $set: updateData },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedItem) {
             // Should not happen if findOne worked, but good practice
             console.error(`[${new Date().toISOString()}] PUT /api/groceries/${itemId} - Update failed after finding item.`);
             return res.status(404).json({ message: `Item with ID ${itemId} not found during update.` });
        }

        console.log(`[${new Date().toISOString()}] Updated item (ID: ${itemId}) by owner ${userId}.`);

        // --- Log Edit to Edit History ---
        await logEdit('item_edit', userId, {
            itemId: updatedItem.id,
            itemName: updatedItem.name, // Current name for context
            changes: changes
        });

        res.status(200).json(updatedItem); // Return the updated item

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating grocery item ${itemId} by user ${userId}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update the item. Please try again.' });
    }
});


// --- Order Processing Endpoint (Requires Customer Authentication) ---

// POST /api/buy - Process a purchase request (Customers only)
// IMPORTANT: This implementation lacks proper transactionality. In a real-world scenario,
// use MongoDB transactions to ensure stock update and order creation are atomic.
app.post('/api/buy', requireAuth, requireCustomer, async (req, res) => { // Made async
    const userId = req.user.id; // Get user ID from authenticated request
    const username = req.user.username; // Get username
    console.log(`[${new Date().toISOString()}] POST /api/buy - User: ${username} (ID: ${userId}), Body:`, req.body);
    const itemsToBuy = req.body; // Expecting an array: [{ id: string, quantity: number, name: string, price: number }, ...]

    // --- Basic Request Validation ---
    if (!Array.isArray(itemsToBuy)) {
        return res.status(400).json({ message: 'Invalid request body: Expected an array of items.' });
    }
    if (itemsToBuy.length === 0) {
        return res.status(400).json({ message: 'Cannot process empty purchase request.' });
    }

    // --- Fetch items from DB and Validate Stock ---
    // This approach fetches all items at once, which is generally better than one by one.
    const itemIds = itemsToBuy.map(item => item.id);
    let validationErrors = [];
    let orderTotal = 0;
    let stockUpdateOperations = []; // For bulkWrite

    try {
        const currentGroceries = await Grocery.find({ id: { $in: itemIds } });
        const groceryMap = new Map(currentGroceries.map(item => [item.id, item])); // For easy lookup

        for (const itemToBuy of itemsToBuy) {
            // Validate item format in the request
            if (!itemToBuy || itemToBuy.id == null || typeof itemToBuy.quantity !== 'number' || itemToBuy.quantity <= 0 || !Number.isInteger(itemToBuy.quantity) || typeof itemToBuy.price !== 'number' || typeof itemToBuy.name !== 'string') {
                validationErrors.push(`Invalid item format or quantity/price/name for item ID ${itemToBuy?.id || 'unknown'}.`);
                continue;
            }

            const groceryItem = groceryMap.get(itemToBuy.id);

            if (!groceryItem) {
                validationErrors.push(`Item with ID ${itemToBuy.id} not found.`);
                continue;
            }

            // Verify price matches (optional, but good practice)
            if (groceryItem.price !== itemToBuy.price) {
                 console.warn(`[${new Date().toISOString()}] Price mismatch for item ${itemToBuy.id}. Client: ${itemToBuy.price}, Server: ${groceryItem.price}`);
                 // Decide how to handle: reject, use server price, etc. For now, reject.
                 validationErrors.push(`Price mismatch for item ID ${itemToBuy.id} (${groceryItem.name}). Please refresh and try again.`);
                 continue; // Skip stock check if price is wrong
            }


            if (groceryItem.quantityAvailable < itemToBuy.quantity) {
                validationErrors.push(`Insufficient stock for item ID ${itemToBuy.id} (${groceryItem.name}). Requested: ${itemToBuy.quantity}, Available: ${groceryItem.quantityAvailable}.`);
            } else {
                // Prepare stock update operation for bulkWrite
                stockUpdateOperations.push({
                    updateOne: {
                        filter: { id: itemToBuy.id, quantityAvailable: { $gte: itemToBuy.quantity } }, // Add quantity check for atomicity
                        update: { $inc: { quantityAvailable: -itemToBuy.quantity } }
                    }
                });
                orderTotal += itemToBuy.price * itemToBuy.quantity;
            }
        }

        if (validationErrors.length > 0) {
            console.warn(`[${new Date().toISOString()}] POST /api/buy - Validation failed for user ${userId}:`, validationErrors);
            const statusCode = validationErrors.some(err => err.includes('Insufficient stock') || err.includes('Price mismatch')) ? 409 : 400;
            return res.status(statusCode).json({ message: 'Purchase validation failed.', errors: validationErrors });
        }

        // --- Apply stock updates using bulkWrite for better atomicity ---
        if (stockUpdateOperations.length > 0) {
            const bulkResult = await Grocery.bulkWrite(stockUpdateOperations);
            console.log(`[${new Date().toISOString()}] Stock update bulkWrite result for user ${userId}:`, bulkResult);
            // Check if all updates were successful (matched and modified count should match)
            if (bulkResult.modifiedCount !== stockUpdateOperations.length) {
                 console.error(`[${new Date().toISOString()}] CRITICAL: Stock update mismatch during purchase for user ${userId}. Expected ${stockUpdateOperations.length} updates, got ${bulkResult.modifiedCount}. Potential race condition or stock changed.`);
                 // Attempt to find which items failed? Difficult without transactions.
                 // For now, fail the entire order.
                 return res.status(500).json({ message: 'Failed to update stock for all items consistently. Order cancelled. Please try again.' });
            }
        } else {
             // Should not happen if validation passed, but safeguard
             return res.status(400).json({ message: 'No valid items to purchase.' });
        }


        console.log(`[${new Date().toISOString()}] Purchase by user ${userId} successful. Updated stock saved.`);

        // --- Create and Save Order History & Sales History ---
        const newOrderData = {
            orderId: uuidv4(), // Generate unique order ID
            userId: userId,
            username: username, // Add username from authenticated user
            date: new Date(), // Use Date object, Mongoose handles conversion
            items: itemsToBuy.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            total: parseFloat(orderTotal.toFixed(2))
        };

        // Save to both collections (ideally within a transaction)
        const [savedOrder, savedSale] = await Promise.all([
            Order.create(newOrderData),
            SalesHistory.create(newOrderData) // Use the same data
        ]);

        console.log(`[${new Date().toISOString()}] Order (ID: ${savedOrder.orderId}) for user ${userId} saved to Order and Sales History.`);
        res.status(200).json({ message: 'Purchase successful and order saved!', orderId: savedOrder.orderId });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing purchase for user ${userId}:`, error);
        // Attempt to rollback stock changes would be ideal here if possible (requires transactions)
        res.status(500).json({ message: 'An internal server error occurred during purchase processing.' });
    }
});


// --- Stock Update Endpoint (Owners only, Requires Authentication) ---

// PATCH /api/groceries/:id/stock - Update stock for a specific item (Owners only)
app.patch('/api/groceries/:id/stock', requireAuth, requireOwner, async (req, res) => { // Made async
    const itemId = req.params.id;
    const { quantityChange } = req.body;
    const userId = req.user.id; // Get user ID from authenticated request

    console.log(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - User: ${userId}, Body:`, req.body);

    // --- Input Validation ---
    if (quantityChange == null || typeof quantityChange !== 'number' || !Number.isInteger(quantityChange)) {
        return res.status(400).json({ message: 'Invalid quantityChange provided. Must be an integer.' });
    }
    if (quantityChange === 0) {
        return res.status(400).json({ message: 'Quantity change cannot be zero.' });
    }

    try {
        // --- Find and Update Atomically ---
        // Use findOneAndUpdate with $inc and validation for non-negative result
        const updatedItem = await Grocery.findOneAndUpdate(
            { id: itemId, quantityAvailable: { $gte: (quantityChange < 0 ? -quantityChange : 0) } }, // Ensure enough stock if decreasing
            { $inc: { quantityAvailable: quantityChange } },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedItem) {
            // If null, either item not found OR not enough stock for decrease
            const itemExists = await Grocery.findOne({ id: itemId });
            if (!itemExists) {
                console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Item not found.`);
                return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
            } else {
                console.warn(`[${new Date().toISOString()}] PATCH /api/groceries/${itemId}/stock - Cannot remove ${Math.abs(quantityChange)}. Only ${itemExists.quantityAvailable} available.`);
                return res.status(409).json({ message: `Cannot remove ${Math.abs(quantityChange)} of ${itemExists.name}. Only ${itemExists.quantityAvailable} available.` });
            }
        }

        console.log(`[${new Date().toISOString()}] Stock update successful for item ${updatedItem.name} (ID: ${itemId}) by user ${userId}. New quantity: ${updatedItem.quantityAvailable}.`);

        // --- Log to edit history ---
        await logEdit(
            quantityChange > 0 ? 'stock_increase' : 'stock_decrease',
            userId,
            {
                item: { // Store snapshot of item details
                    id: updatedItem.id,
                    name: updatedItem.name,
                    price: updatedItem.price,
                    category: updatedItem.category,
                    description: updatedItem.description
                },
                quantityChange: quantityChange,
                newQuantity: updatedItem.quantityAvailable
            }
        );

        res.status(200).json(updatedItem); // Return the updated item

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating stock for item ${itemId} by user ${userId}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
        }
        res.status(500).json({ message: 'Stock update processed but failed to save persistently.' });
    }
});


// --- Order History Endpoint (Requires Authentication) ---

// GET /api/orders - Retrieve order history for the logged-in user
app.get('/api/orders', requireAuth, async (req, res) => { // Made async
    const userId = req.user.id; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/orders - User: ${userId}`);

    try {
        // Fetch orders for the specific user from the DB, sort by date descending
        const userOrderHistory = await Order.find({ userId: userId }).sort({ date: -1 });

        console.log(`[${new Date().toISOString()}] Found ${userOrderHistory.length} orders for user ${userId}.`);
        res.json(userOrderHistory);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching order history for user ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve order history.' });
    }
});


// --- Grocery Deletion Endpoint (Owners only, Requires Authentication) ---

// DELETE /api/groceries/delete/:id - Delete a grocery item (move to deleted_groceries collection)
app.delete('/api/groceries/delete/:id', requireAuth, requireOwner, async (req, res) => { // Made async
    const itemIdToDelete = req.params.id;
    const userId = req.user.id; // Get user ID from authenticated request

    console.log(`[${new Date().toISOString()}] DELETE /api/groceries/delete/${itemIdToDelete} - Owner: ${userId}`);

    // Ideally, use a transaction here to ensure atomicity
    try {
        // Find the item to delete
        const itemToDelete = await Grocery.findOne({ id: itemIdToDelete });

        if (!itemToDelete) {
            console.warn(`[${new Date().toISOString()}] DELETE /api/groceries/delete/${itemIdToDelete} - Item not found.`);
            return res.status(404).json({ message: `Item with ID ${itemIdToDelete} not found.` });
        }

        // Create entry for deleted items collection
        const deletedItemEntryData = {
            ...itemToDelete.toObject(), // Get plain JS object
            _id: undefined, // Remove original MongoDB _id if present
            deletedAt: new Date(),
            // deletedBy: userId // Optional: track who deleted it (add to schema if needed)
        };

        // Perform deletion from groceries and insertion into deleted_groceries
        // Using Promise.all for concurrency (though transaction is safer)
        const [deleteResult, createDeletedResult] = await Promise.all([
            Grocery.deleteOne({ id: itemIdToDelete }),
            DeletedGrocery.create(deletedItemEntryData)
        ]);

        // Check results (deleteOne result has deletedCount)
        if (deleteResult.deletedCount === 0) {
             // This shouldn't happen if findOne succeeded, but safeguard
             console.error(`[${new Date().toISOString()}] Delete failed for item ID ${itemIdToDelete} after finding it.`);
             // Attempt to remove the potentially created deletedGrocery entry? Complex without transactions.
             return res.status(500).json({ message: 'Failed to delete item from active list after finding it.' });
        }

        console.log(`[${new Date().toISOString()}] Item ID ${itemIdToDelete} deleted by owner ${userId} and moved to deleted items.`);

        // --- Log deletion to edit history ---
        await logEdit('deleted', userId, {
            item: { // Store snapshot of item details
                id: itemToDelete.id,
                name: itemToDelete.name,
                price: itemToDelete.price,
                category: itemToDelete.category,
                description: itemToDelete.description
            }
            // timestamp is added by logEdit
        });

        res.status(200).json({ message: `Item '${itemToDelete.name}' deleted successfully.` });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting item ${itemIdToDelete} by user ${userId}:`, error);
        // If error occurred, data might be inconsistent (e.g., deleted from one place but not added to other)
        res.status(500).json({ message: 'Failed to complete delete operation due to a server error.' });
    }
});


// --- Deleted Groceries Endpoint (Owners only, Requires Authentication) ---

// GET /api/deleted-groceries - Retrieve all deleted grocery items
app.get('/api/deleted-groceries', requireAuth, requireOwner, async (req, res) => { // Made async
    const userId = req.user.id; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/deleted-groceries - Owner: ${userId}`);

    try {
        // Fetch deleted items, sort by deletion date descending
        const deletedGroceries = await DeletedGrocery.find({}).sort({ deletedAt: -1 });
        console.log(`[${new Date().toISOString()}] Retrieved ${deletedGroceries.length} deleted grocery records for owner ${userId}.`);
        res.status(200).json(deletedGroceries);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading deleted groceries for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve deleted groceries.' });
    }
});

// POST /api/deleted-groceries/restore/:id - Restore a deleted grocery item
app.post('/api/deleted-groceries/restore/:id', requireAuth, requireOwner, async (req, res) => { // Made async
    const itemIdToRestore = req.params.id;
    const userId = req.user.id;

    console.log(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Owner: ${userId}`);

    // Ideally, use a transaction
    try {
        // Find the item in the deleted collection
        const itemToRestore = await DeletedGrocery.findOne({ id: itemIdToRestore });

        if (!itemToRestore) {
            console.warn(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Item not found in deleted items.`);
            return res.status(404).json({ message: `Item with ID ${itemIdToRestore} not found in deleted items.` });
        }

        // Prepare data for the active groceries collection
        const { deletedAt, deletedBy, _id, ...restoredItemData } = itemToRestore.toObject(); // Exclude Mongo _id and deletion metadata

        // Check if an item with the same ID already exists in the active list
        const existingActiveItem = await Grocery.findOne({ id: restoredItemData.id });
        if (existingActiveItem) {
            console.warn(`[${new Date().toISOString()}] POST /api/deleted-groceries/restore/${itemIdToRestore} - Item with ID ${restoredItemData.id} already exists in active groceries. Cannot restore duplicate.`);
            return res.status(409).json({ message: `Cannot restore item '${restoredItemData.name}'. An item with ID ${restoredItemData.id} already exists in the active list.` });
        }

        // Perform restoration: create in groceries, delete from deleted_groceries
        const [createdGrocery, deleteResult] = await Promise.all([
             Grocery.create(restoredItemData),
             DeletedGrocery.deleteOne({ id: itemIdToRestore })
        ]);

        if (deleteResult.deletedCount === 0) {
            // Should not happen if findOne succeeded, but safeguard
            console.error(`[${new Date().toISOString()}] Restore failed for item ID ${itemIdToRestore}: Could not remove from deleted collection after finding it.`);
            // Attempt to remove the newly created grocery item? Complex without transactions.
            await Grocery.deleteOne({ id: restoredItemData.id }); // Attempt rollback
            return res.status(500).json({ message: 'Failed to remove item from deleted list during restore.' });
        }

        console.log(`[${new Date().toISOString()}] Item ID ${itemIdToRestore} restored by owner ${userId}.`);

        // --- Log restoration to edit history ---
        await logEdit('restored', userId, {
            item: { // Store snapshot of restored item details
                id: createdGrocery.id,
                name: createdGrocery.name,
                price: createdGrocery.price,
                category: createdGrocery.category,
                description: createdGrocery.description
            }
        });

        res.status(200).json({ message: `Item '${createdGrocery.name}' restored successfully.`, restoredItem: createdGrocery });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error restoring item ${itemIdToRestore} by user ${userId}:`, error);
        res.status(500).json({ message: 'Failed to complete restore operation due to a server error.' });
    }
});


// --- Edit History Endpoint (Owners only, Requires Authentication) ---

// GET /api/edit-history - Retrieve all edit history records
app.get('/api/edit-history', requireAuth, requireOwner, async (req, res) => { // Made async
    const userId = req.user.id; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/edit-history - Owner: ${userId}`);

    try {
        // Fetch history, sort by timestamp descending
        const editHistory = await EditHistory.find({}).sort({ timestamp: -1 });
        console.log(`[${new Date().toISOString()}] Retrieved ${editHistory.length} edit history records for owner ${userId}.`);
        res.status(200).json(editHistory);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading edit history for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve edit history.' });
    }
});


// --- User Management Endpoint (Owners only, Requires Authentication) ---

// GET /api/users - Retrieve all users (excluding sensitive info)
app.get('/api/users', requireAuth, requireOwner, async (req, res) => { // Made async
    const userId = req.user.id;
    console.log(`[${new Date().toISOString()}] GET /api/users - Owner: ${userId}`);

    try {
        // Fetch users, explicitly exclude passwordHash field
        const users = await User.find({}, { passwordHash: 0 });
        console.log(`[${new Date().toISOString()}] Retrieved ${users.length} user records for owner ${userId}.`);
        res.status(200).json(users);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading users for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve user list.' });
    }
});

// GET /api/pending-users - Retrieve pending owner accounts
app.get('/api/pending-users', requireAuth, requireOwner, async (req, res) => { // Made async
    const userId = req.user.id;
    console.log(`[${new Date().toISOString()}] GET /api/pending-users - Owner: ${userId}`);
    try {
        // Fetch pending users, explicitly exclude passwordHash
        const pendingUsers = await PendingUser.find({}, { passwordHash: 0 });
        console.log(`[${new Date().toISOString()}] Retrieved ${pendingUsers.length} pending user records for owner ${userId}.`);
        res.status(200).json(pendingUsers);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading pending users for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve pending user list.' });
    }
});

// POST /api/approve-user/:userId - Approve a pending owner account
app.post('/api/approve-user/:userId', requireAuth, requireOwner, async (req, res) => { // Made async
    const userToApproveId = req.params.userId;
    const approvingOwnerId = req.user.id;
    console.log(`[${new Date().toISOString()}] POST /api/approve-user/${userToApproveId} - Approving Owner: ${approvingOwnerId}`);

    // Ideally use a transaction
    try {
        // Find the pending user
        const userToApprove = await PendingUser.findOne({ id: userToApproveId });

        if (!userToApprove) {
            console.warn(`[${new Date().toISOString()}] Approval failed: User ID ${userToApproveId} not found in pending list.`);
            return res.status(404).json({ message: 'User not found in pending list.' });
        }

        // Check if user already exists in main users list
        const existingUser = await User.findOne({ $or: [{ id: userToApproveId }, { username: userToApprove.username }, { email: userToApprove.email }] });
        if (existingUser) {
            console.warn(`[${new Date().toISOString()}] Approval failed: User ID ${userToApproveId} or username/email already exists in active users.`);
            // Remove from pending anyway to clean up
            await PendingUser.deleteOne({ id: userToApproveId });
            return res.status(409).json({ message: 'User already exists or conflicts with an existing user.' });
        }

        // Create user in active collection and delete from pending collection
        const userData = userToApprove.toObject();
        delete userData._id; // Remove MongoDB _id before creating new user
        userData.type = 'owner'; // Explicitly set the type for the new User

        const [createdUser, deleteResult] = await Promise.all([
            User.create(userData), // Now userData includes the required 'type'
            PendingUser.deleteOne({ id: userToApproveId })
        ]);

        if (deleteResult.deletedCount === 0) {
             console.error(`[${new Date().toISOString()}] User approval inconsistency: User ${userToApproveId} created but not deleted from pending.`);
             // Attempt rollback?
             await User.deleteOne({ id: userToApproveId });
             return res.status(500).json({ message: 'Failed to remove user from pending list after approval.' });
        }

        console.log(`[${new Date().toISOString()}] User ${userToApprove.username} (ID: ${userToApproveId}) approved by owner ${approvingOwnerId}.`);
        res.status(200).json({ message: `User '${userToApprove.username}' approved successfully.` });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error approving user ${userToApproveId}:`, error);
        res.status(500).json({ message: 'Failed to complete user approval due to a server error.' });
    }
});

// PUT /api/users/:userId - Update an existing user's details (username, email)
app.put('/api/users/:userId', requireAuth, requireOwner, async (req, res) => { // Made async
    const userIdToUpdate = req.params.userId;
    const { username, email } = req.body;
    const updatingOwnerId = req.user.id;

    console.log(`[${new Date().toISOString()}] PUT /api/users/${userIdToUpdate} - Owner: ${updatingOwnerId}, Body:`, req.body);

    // Basic validation
    if (!username || !email || typeof username !== 'string' || typeof email !== 'string' || username.trim() === '' || email.trim() === '') {
        return res.status(400).json({ message: 'Username and email are required and must be non-empty strings.' });
    }
    // Basic email format check
    if (!/\S+@\S+\.\S+/.test(email)) {
         return res.status(400).json({ message: 'Invalid email format.' });
    }

    try {
        // Find the user to update by their custom ID to check their type
        const userToCheck = await User.findOne({ id: userIdToUpdate });
        
        if (!userToCheck) {
            console.warn(`[${new Date().toISOString()}] PUT /api/users/${userIdToUpdate} - User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Check if the user being updated is an owner and not the current user
        if (userToCheck.type === 'owner' && userIdToUpdate !== updatingOwnerId) {
            console.warn(`[${new Date().toISOString()}] PUT /api/users/${userIdToUpdate} - Owner ${updatingOwnerId} attempted to update another owner.`);
            return res.status(403).json({ message: 'Owners can only edit their own accounts, not other owners.' });
        }
        
        // Check for conflicts with other users (excluding the user being updated)
        const conflictingUser = await User.findOne({
            id: { $ne: userIdToUpdate }, // Exclude the current user by their custom 'id' (UUID)
            $or: [{ username: username.trim() }, { email: email.trim() }]
        });

        if (conflictingUser) {
            const conflictField = conflictingUser.username === username.trim() ? 'Username' : 'Email';
            console.warn(`[${new Date().toISOString()}] PUT /api/users/${userIdToUpdate} - Conflict: ${conflictField} '${conflictingUser[conflictField.toLowerCase()] }' already exists.`);
            return res.status(409).json({ message: `${conflictField} already in use by another user.` });
        }

        // Find the user to update by their custom ID
        const userToUpdateDoc = await User.findOne({ id: userIdToUpdate });

        if (!userToUpdateDoc) {
            console.warn(`[${new Date().toISOString()}] PUT /api/users/${userIdToUpdate} - User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update the document fields
        userToUpdateDoc.username = username.trim();
        userToUpdateDoc.email = email.trim();

        // Save the updated document (this will run validators)
        const savedUser = await userToUpdateDoc.save();

        // Exclude password hash from response
        const { passwordHash: _, ...userResponse } = savedUser.toObject();

        console.log(`[${new Date().toISOString()}] User (ID: ${userIdToUpdate}) updated by owner ${updatingOwnerId}. New details: { username: '${userResponse.username}', email: '${userResponse.email}' }`);
        res.status(200).json({ message: 'User updated successfully.', user: userResponse });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating user ${userIdToUpdate}:`, error); // Log the actual error
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', errors: error.errors });
        }
         if (error.code === 11000) { // Duplicate key error during update
             return res.status(409).json({ message: 'Username or email already exists.' });
        }
        res.status(500).json({ message: 'Failed to save updated user data.' });
    }
});


// DELETE /api/users/:userId - Delete an approved user
app.delete('/api/users/:userId', requireAuth, requireOwner, async (req, res) => { // Made async
    const userIdToDelete = req.params.userId;
    const deletingOwnerId = req.user.id;

    console.log(`[${new Date().toISOString()}] DELETE /api/users/${userIdToDelete} - Owner: ${deletingOwnerId}`);

    // Prevent owner from deleting themselves
    if (userIdToDelete === deletingOwnerId) {
        console.warn(`[${new Date().toISOString()}] DELETE /api/users/${userIdToDelete} - Owner attempted to delete themselves.`);
        return res.status(403).json({ message: 'Owners cannot delete their own account.' });
    }

    try {
        // Check if the user to delete is an owner
        const userToDelete = await User.findOne({ id: userIdToDelete });
        
        if (!userToDelete) {
            console.warn(`[${new Date().toISOString()}] DELETE /api/users/${userIdToDelete} - User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Prevent owners from deleting other owners
        if (userToDelete.type === 'owner') {
            console.warn(`[${new Date().toISOString()}] DELETE /api/users/${userIdToDelete} - Owner ${deletingOwnerId} attempted to delete another owner.`);
            return res.status(403).json({ message: 'Owners cannot delete other owner accounts.' });
        }
        
        const deleteResult = await User.deleteOne({ id: userIdToDelete });

        if (deleteResult.deletedCount === 0) {
            console.warn(`[${new Date().toISOString()}] DELETE /api/users/${userIdToDelete} - User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log(`[${new Date().toISOString()}] User (ID: ${userIdToDelete}) deleted by owner ${deletingOwnerId}.`);
        // Return 204 No Content for successful deletion
        res.status(204).send();

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting user ${userIdToDelete}:`, error);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});


// DELETE /api/reject-user/:userId - Reject and delete a pending owner account
app.delete('/api/reject-user/:userId', requireAuth, requireOwner, async (req, res) => { // Made async
    const userToRejectId = req.params.userId;
    const rejectingOwnerId = req.user.id;
    console.log(`[${new Date().toISOString()}] DELETE /api/reject-user/${userToRejectId} - Rejecting Owner: ${rejectingOwnerId}`);

    try {
        const deleteResult = await PendingUser.deleteOne({ id: userToRejectId });

        if (deleteResult.deletedCount === 0) {
            console.warn(`[${new Date().toISOString()}] Rejection failed: User ID ${userToRejectId} not found in pending list.`);
            return res.status(404).json({ message: 'User not found in pending list.' });
        }

        console.log(`[${new Date().toISOString()}] Pending user (ID: ${userToRejectId}) rejected and removed by owner ${rejectingOwnerId}.`);
        res.status(200).json({ message: 'Pending user rejected successfully.' });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error rejecting pending user ${userToRejectId}:`, error);
        res.status(500).json({ message: 'Failed to reject user.' });
    }
});


// --- Sales History Endpoint (Owners only, Requires Authentication) ---

// GET /api/sales-history - Retrieve all sales history records
app.get('/api/sales-history', requireAuth, requireOwner, async (req, res) => { // Made async
    const userId = req.user.id; // Get user ID from authenticated request
    console.log(`[${new Date().toISOString()}] GET /api/sales-history - Owner: ${userId}`);

    try {
        // Fetch sales history, sort by date descending
        const salesHistory = await SalesHistory.find({}).sort({ date: -1 });
        console.log(`[${new Date().toISOString()}] Retrieved ${salesHistory.length} sales history records for owner ${userId}.`);
        res.status(200).json(salesHistory);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error reading sales history for owner ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve sales history.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    console.log(`Attempting to connect to MongoDB at ${MONGO_URI}`);
    // No longer logging file paths
});
