const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const dataFilePath = path.join(__dirname, 'data', 'groceries.json');

const readData = () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const jsonData = fs.readFileSync(dataFilePath);
            return JSON.parse(jsonData);
        }
        return [];
    } catch (error) {
        console.error("Error reading data file:", error);
        return [];
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing data file:", error);
    }
}

let groceryItems = readData();
let nextId = groceryItems.length > 0 ? Math.max(...groceryItems.map(item => item.id)) + 1 : 1;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/groceries', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/groceries`);
    res.json(groceryItems);
});

app.post('/api/groceries', (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/groceries - Body:`, req.body);
    const { name, price, quantityAvailable } = req.body;

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

    const newItem = {
        id: nextId++,
        name: name.trim(),
        price: price,
        quantityAvailable: quantityAvailable
    };

    groceryItems.push(newItem);

    const writeSuccess = writeData(groceryItems);

    if (writeSuccess) {
        console.log(`[${new Date().toISOString()}] Added new item (ID: ${newItem.id}) and saved to file.`);
        res.status(201).json(newItem);
    } else {
        groceryItems.pop();
         console.error(`[${new Date().toISOString()}] Added new item (ID: ${newItem.id}) to memory BUT FAILED TO SAVE TO FILE.`);
        res.status(500).json({ message: 'Item created in memory but failed to save persistently. Please try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});