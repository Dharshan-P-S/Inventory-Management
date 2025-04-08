const mongoose = require('mongoose');

const deletedGrocerySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Original ID from the groceries collection
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantityAvailable: { type: Number, required: true }, // Quantity at the time of deletion
  category: { type: String, required: true },
  description: { type: String },
  deletedAt: { type: Date, default: Date.now } // Timestamp when the item was deleted
});

const DeletedGrocery = mongoose.model('DeletedGrocery', deletedGrocerySchema, 'deleted_groceries'); // Explicitly set collection name

module.exports = DeletedGrocery;
