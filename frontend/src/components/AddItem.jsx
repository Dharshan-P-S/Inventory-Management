import React, { useState } from 'react';

function AddItemForm({ onSubmit, categorySuggestions }) { // Added categorySuggestions prop
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [category, setCategory] = useState(''); // Added category state
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';

    const priceNum = Number(price);
    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Price must be a positive number';
    }

    const quantityNum = Number(quantityAvailable);
    if (!quantityAvailable.trim()) {
      newErrors.quantityAvailable = 'Quantity Available is required';
    } else if (isNaN(quantityNum) || !Number.isInteger(quantityNum) || quantityNum < 0) {
      newErrors.quantityAvailable = 'Quantity Available must be a non-negative integer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validateForm()) {
      onSubmit({
        name: name.trim(),
        price: parseFloat(price),
        quantityAvailable: parseInt(quantityAvailable, 10),
        category: category.trim() || 'Uncategorized' // Default to "Uncategorized" if empty
      });
    }
  };

  return (
    <div className="add-item-form-container">
      {/* Title moved to NewItemPage for better page structure */}
      {/* <h2>Add New Grocery Item</h2> */}
      <form onSubmit={handleSubmit} className="add-item-form" noValidate> {/* Add noValidate to rely on JS validation */}
        <div className="form-group">
          <label htmlFor="name">Item Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && <p id="name-error" className="error-message">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="price">Price (Rs.):</label>
          <input
            type="text"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? "price-error" : undefined}
          />
          {errors.price && <p id="price-error" className="error-message">{errors.price}</p>}
        </div>
        <div className="form-group">
          {/* Update Label */}
          <label htmlFor="quantityAvailable">Quantity Available:</label>
          <input
            type="text"
            id="quantityAvailable"
            value={quantityAvailable}
            onChange={(e) => setQuantityAvailable(e.target.value)}
            inputMode="numeric"
            aria-invalid={!!errors.quantityAvailable}
            aria-describedby={errors.quantityAvailable ? "quantity-error" : undefined}
          />
          {/* Update error display binding */}
          {errors.quantityAvailable && <p id="quantity-error" className="error-message">{errors.quantityAvailable}</p>}
        </div>

        {/* Category Input */}
        <div className="form-group">
          <label htmlFor="category">Category (optional):</label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-list" // Link to datalist
          />
          <datalist id="category-list">
            {categorySuggestions.map((suggestion, index) => (
              <option key={index} value={suggestion} />
            ))}
          </datalist>
        </div>

        <button type="submit">Add Item to grocery list</button>
      </form>
    </div>
  );
}

export default AddItemForm;
