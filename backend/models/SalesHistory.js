const mongoose = require('mongoose');

// Re-using the same sub-schema definition as in Order.js
const orderItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Corresponds to Grocery item id
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true }
}, { _id: false });

const salesHistorySchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // Using the existing UUID
  userId: { type: String, required: true }, // Corresponds to User id
  username: { type: String }, // Optional username field
  date: { type: Date, required: true, default: Date.now },
  items: [orderItemSchema],
  total: { type: Number, required: true }
});

// Create the model, explicitly setting the collection name to 'sales_history'
const SalesHistory = mongoose.model('SalesHistory', salesHistorySchema, 'sales_history');

module.exports = SalesHistory;
