import React, { useState, useEffect } from 'react';

function StockUpdater({ groceries = [], onUpdateStock }) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  // New state for search term
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Reset quantity when item changes
  useEffect(() => {
    setQuantityToAdd(1);
    setErrorMessage('');
  }, [selectedItemId]);

  // Update suggestions when searchTerm changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]); // Clear suggestions when searchTerm is empty
    } else {
      const filtered = groceries.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
    }
  }, [searchTerm, groceries]);

  const handleSuggestionClick = (item) => {
    setSelectedItemId(item.id.toString());
    setSearchTerm(item.name); // Set the search term to the selected item's name
    setTimeout(() => setSuggestions([]), 0); // Clear suggestions after the click
  };

  const handleAddStock = () => {
    if (!selectedItemId) {
      setErrorMessage('Please select an item.');
      return;
    }
    setErrorMessage('');
    onUpdateStock(selectedItemId, quantityToAdd, () => {
      setSelectedItemId('');
      setSearchTerm('');
      setQuantityToAdd(1);
    });
  };

  const handleRemoveStock = () => {
    if (!selectedItemId) {
      setErrorMessage('Please select an item.');
      return;
    }
    const selectedItem = groceries.find(item => item.id === parseInt(selectedItemId));
    if (selectedItem && quantityToAdd > selectedItem.quantityAvailable) {
      setErrorMessage(`Cannot remove ${quantityToAdd} items. Only ${selectedItem.quantityAvailable} available.`);
      return;
    }
    setErrorMessage('');
    onUpdateStock(selectedItemId, -quantityToAdd, () => {
      setSelectedItemId('');
      setSearchTerm('');
      setQuantityToAdd(1);
    });
  };

  return (
    <div className="stock-updater-container">
      <h2>Update Item Stock</h2>
      <form onSubmit={(e) => e.preventDefault()} className="stock-update-form">
        <div className="form-group">
          <label htmlFor="item-search">Search Item:</label>
          <input
            id="item-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-container">
              {suggestions.map(item => (
                <li
                  key={item.id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(item)}
                >
                  {item.name} (Stock: {item.quantityAvailable})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="quantity-input">Quantity:</label>
          <div className="quantity-adjuster" id="quantity-input">
            <button
              type="button"
              onClick={() => setQuantityToAdd(prev => Math.max(1, prev - 1))}
              disabled={quantityToAdd <= 1}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="quantity-display" aria-live="polite">{quantityToAdd}</span>
            <button
              type="button"
              onClick={() => setQuantityToAdd(prev => prev + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="stock-button-group">
          <button 
            type="button" 
            className="update-stock-button" 
            onClick={handleAddStock}
            disabled={!selectedItemId}
          >
            Add Stock
          </button>
          <button 
            type="button" 
            className="update-stock-button remove" 
            onClick={handleRemoveStock}
            disabled={!selectedItemId}
          >
            Remove Stock
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockUpdater;
