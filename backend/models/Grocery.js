const mongoose = require('mongoose');

const grocerySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Using the existing UUID as the primary identifier
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  description: { type: String }
});

const Grocery = mongoose.model('Grocery', grocerySchema, 'groceries'); // Explicitly set collection name to 'groceries'

module.exports = Grocery;
