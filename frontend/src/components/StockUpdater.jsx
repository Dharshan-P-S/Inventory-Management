import React, { useState, useEffect } from 'react';

function StockUpdater({ groceries = [], onUpdateStock }) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset quantity when item changes
  useEffect(() => {
    setQuantityToAdd(1);
    setErrorMessage('');
  }, [selectedItemId]);

  const handleItemChange = (event) => {
    setSelectedItemId(event.target.value);
  };

  const handleQuantityChange = (amount) => {
    setQuantityToAdd((prev) => Math.max(1, prev + amount));
  };

  const handleAddStock = () => {
    if (!selectedItemId) {
      setErrorMessage('Please select an item.');
      return;
    }
    setErrorMessage('');
    onUpdateStock(selectedItemId, quantityToAdd, () => {
      setSelectedItemId('');
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
      setQuantityToAdd(1);
    });
  };

  return (
    <div className="stock-updater-container">
      <h2>Update Item Stock</h2>
      <form onSubmit={(e) => e.preventDefault()} className="stock-update-form">
        <div className="form-group">
          <label htmlFor="item-select">Select Item:</label>
          <select
            id="item-select"
            value={selectedItemId}
            onChange={handleItemChange}
            required
          >
            <option value="" disabled>-- Select an item --</option>
            {groceries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (Current Stock: {item.quantityAvailable})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="quantity-input">Quantity:</label>
          <div className="quantity-adjuster" id="quantity-input">
            <button
              type="button"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantityToAdd <= 1}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="quantity-display" aria-live="polite">{quantityToAdd}</span>
            <button
              type="button"
              onClick={() => handleQuantityChange(1)}
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
