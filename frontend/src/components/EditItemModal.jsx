import React, { useState, useEffect } from 'react';
import '../App.css'; // Assuming modal styles are in App.css or will be added there

const API_BASE_URL = 'http://localhost:3001/api';

function EditItemModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price.toString()); // Keep as string for input
  const [category, setCategory] = useState(item.category || ''); // Handle potentially undefined category
  const [description, setDescription] = useState(item.description || ''); // Add description state
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [errors, setErrors] = useState({});

  // Fetch category suggestions when the modal mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Assuming an endpoint exists or deriving from groceries
        // Let's try fetching all groceries and extracting unique categories
        const response = await fetch(`${API_BASE_URL}/groceries`);
        if (!response.ok) {
          throw new Error('Failed to fetch groceries for categories');
        }
        const groceries = await response.json();
        const uniqueCategories = [...new Set(groceries.map(g => g.category).filter(Boolean))]; // Filter out null/empty
        setCategorySuggestions(uniqueCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Handle error appropriately, maybe set default suggestions or show message
      }
    };
    fetchCategories();
  }, []); // Empty dependency array ensures this runs only once on mount

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';

    const priceNum = Number(price);
    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Price must be a positive number';
    }
    // Category is optional, no validation needed unless required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = (event) => {
    event.preventDefault(); // Prevent default form submission if wrapped in form
    if (validateForm()) {
      onSave({
        // Only include fields that are being edited
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim() || 'Uncategorized', // Default if empty
        description: description.trim() // Add description
        // Note: We are NOT sending quantityAvailable back, assuming it's managed elsewhere (e.g., StockUpdatePage)
        // If quantity *should* be editable here, add it to state and the form.
      });
    }
  };

  // Prevent clicks inside the modal from closing it
  const handleModalContentClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="modal-overlay"> {/* Removed onClick={onClose} */}
      <div className="modal-content" onClick={handleModalContentClick}>
        <h2>Edit Item: {item.name}</h2>
        <form onSubmit={handleSaveClick} className="edit-item-form" noValidate>
          <div className="form-group">
            <label htmlFor="edit-name">Item Name:</label>
            <input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control" // Add form-control class
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "edit-name-error" : undefined}
            />
            {errors.name && <p id="edit-name-error" className="error-message">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="edit-price">Price (Rs.):</label>
            <input
              type="text"
              id="edit-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="form-control" // Add form-control class
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? "edit-price-error" : undefined}
            />
            {errors.price && <p id="edit-price-error" className="error-message">{errors.price}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="edit-category">Category:</label>
            <input
              type="text"
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="edit-category-list" // Link to datalist
              className="form-control" // Add form-control class
            />
            <datalist id="edit-category-list">
              {categorySuggestions.map((suggestion, index) => (
                <option key={index} value={suggestion} />
              ))}
            </datalist>
            {/* No error display for optional category */}
          </div>
          {/* Description Input */}
          <div className="form-group">
            <label htmlFor="edit-description">Description:</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3" // Adjust as needed
              className="form-control" // Add form-control class
            />
            {/* No error display for optional description */}
          </div>
          <div className="modal-actions">
            <button type="submit" className="button button-primary">OK</button>
            <button type="button" className="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditItemModal;
