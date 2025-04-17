import React, { useState, useEffect } from 'react';

function StockUpdater({ groceries = [], onUpdateStock }) {
  const [selectedItem, setSelectedItem] = useState(null); // Store the whole item object
  const [changeAmount, setChangeAmount] = useState(0); // Represents the +/- change
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Reset state when item changes or is deselected
  useEffect(() => {
    setChangeAmount(0); // Reset change amount
    setErrorMessage('');
    if (!selectedItem) {
      setSearchTerm(''); // Clear search if item is deselected (e.g., after update)
    }
  }, [selectedItem]);

  // Update suggestions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '' || (selectedItem && searchTerm === selectedItem.name)) {
      setSuggestions([]); // Clear suggestions if search is empty or matches selected item
    } else {
      const filtered = groceries.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
    }
  }, [searchTerm, groceries, selectedItem]);

  const handleSuggestionClick = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.name); // Set search input to the selected item's name
    setSuggestions([]); // Clear suggestions immediately
    setChangeAmount(0); // Reset change amount when a new item is selected
    setErrorMessage('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // If user clears search or types something different, deselect item
    if (selectedItem && e.target.value !== selectedItem.name) {
      setSelectedItem(null);
    }
  };

  const adjustChangeAmount = (increment) => {
    setChangeAmount(prev => {
      const newChange = prev + increment;
      // Prevent projected quantity from going below zero
      if (selectedItem && (selectedItem.quantityAvailable + newChange < 0)) {
        setErrorMessage(`Cannot decrease stock below zero. Maximum decrease is ${selectedItem.quantityAvailable}.`);
        return -selectedItem.quantityAvailable; // Set change to max possible decrease
      }
      setErrorMessage(''); // Clear error if adjustment is valid
      return newChange;
    });
  };

  const handleSaveUpdate = () => {
    if (!selectedItem) {
      setErrorMessage('Please select an item first.');
      return;
    }
    if (changeAmount === 0) {
      setErrorMessage('Please adjust the quantity (+/-) before saving.');
      return;
    }
    // Check again for safety, though adjustChangeAmount should prevent this
    if (selectedItem.quantityAvailable + changeAmount < 0) {
       setErrorMessage('Update would result in negative stock. Please adjust.');
       return;
    }

    setErrorMessage('');
    // Call the update function passed from parent (App.jsx)
    onUpdateStock(selectedItem.id.toString(), changeAmount, () => {
      // Reset state after successful update (callback from parent)
      setSelectedItem(null); // Deselect item
      // Note: Search term is cleared via useEffect when selectedItem becomes null
    });
  };

  const projectedQuantity = selectedItem ? selectedItem.quantityAvailable + changeAmount : null;

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
            onChange={handleSearchChange} // Use updated handler
            placeholder="Type to search..."
            disabled={!!selectedItem} // Disable search input once an item is selected
          />
          {suggestions.length > 0 && !selectedItem && ( // Only show suggestions if no item is selected
            <ul className="suggestions-container">
              {suggestions.map(item => (
                <li
                  key={item.id}
                  className={`suggestion-item ${item.quantityAvailable > 0 ? 'available' : 'unavailable'}`} // Add availability class
                  onClick={() => handleSuggestionClick(item)} // Use updated handler
                >
                  {item.name} (Current Stock: {item.quantityAvailable})
                </li>
              ))}
            </ul>
          )}
          {selectedItem && (
             <button type="button" onClick={() => setSelectedItem(null)} className="clear-selection-button">
               Clear Selection
             </button>
          )}
        </div>

        {selectedItem && (
          <>
            <div className="form-group stock-info">
              <p><strong>Selected:</strong> {selectedItem.name}</p>
              <p><strong>Current Stock:</strong> {selectedItem.quantityAvailable}</p>
            </div>

            <div className="form-group">
              <label htmlFor="quantity-adjust">Adjust Stock By:</label>
              <div className="quantity-adjuster" id="quantity-adjust">
                <button
                  type="button"
                  onClick={() => adjustChangeAmount(-1)} // Decrease changeAmount
                  // Disable if projected quantity would be negative
                  disabled={selectedItem.quantityAvailable + changeAmount <= 0}
                  aria-label="Decrease stock change"
                >
                  -
                </button>
                <span className="quantity-display" aria-live="polite">
                  {changeAmount > 0 ? `+${changeAmount}` : changeAmount}
                </span>
                <button
                  type="button"
                  onClick={() => adjustChangeAmount(1)} // Increase changeAmount
                  aria-label="Increase stock change"
                >
                  +
                </button>
              </div>
              <p className="projected-stock">
                <strong>Projected Stock:</strong> {projectedQuantity}
              </p>
            </div>
          </>
        )}

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="stock-button-group">
          <button
            type="button"
            className="update-stock-button save" // Use a single save button class
            onClick={handleSaveUpdate} // Use updated handler
            disabled={!selectedItem || changeAmount === 0 || (selectedItem && selectedItem.quantityAvailable + changeAmount < 0)} // Disable if no item, no change, or invalid change
          >
            Save Update
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockUpdater;
