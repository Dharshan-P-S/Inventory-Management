const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Corresponds to Grocery item id
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true }
}, { _id: false }); // Prevent Mongoose from creating an _id for subdocuments

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // Using the existing UUID
  userId: { type: String, required: true }, // Corresponds to User id
  username: { type: String }, // Optional username field
  date: { type: Date, required: true, default: Date.now },
  items: [orderItemSchema],
  total: { type: Number, required: true }
});

const Order = mongoose.model('Order', orderSchema, 'order_history'); // Explicitly set collection name

module.exports = Order;
