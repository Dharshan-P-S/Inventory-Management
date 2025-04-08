const mongoose = require('mongoose');

// Define a flexible schema for the 'item' field
const itemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number },
  category: { type: String },
  description: { type: String }
}, { _id: false });

const editHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['stock_increase', 'stock_decrease', 'deleted', 'restored', 'item_edit', 'item_add'] // Added 'item_add' for completeness
  },
  item: { type: itemSchema }, // Used for stock changes, delete, restore
  itemId: { type: String }, // Used for item_edit
  itemName: { type: String }, // Used for item_edit
  quantityChange: { type: Number }, // Used for stock changes
  newQuantity: { type: Number }, // Used for stock changes
  changes: { type: mongoose.Schema.Types.Mixed }, // Used for item_edit, stores { field: { old: val, new: val } }
  timestamp: { type: Date, required: true, default: Date.now },
  userId: { type: String, required: true } // ID of the user performing the action
});

const EditHistory = mongoose.model('EditHistory', editHistorySchema, 'edit_history'); // Explicitly set collection name

module.exports = EditHistory;
