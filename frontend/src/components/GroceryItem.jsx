import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link

const API_BASE_URL = 'http://localhost:3001/api';

function GroceryItem({ item, onAddToCart, currentUser, onDeleteItem }) { // Added currentUser and onDeleteItem props
  // State to track the quantity the user intends to add
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  const isOutOfStock = item.quantityAvailable <= 0;

  // Reset quantityToAdd to 1 if the item's availability changes (e.g., list refreshes)
  // or if the item goes out of stock while user was considering it.
  useEffect(() => {
    // If item goes out of stock OR if current quantity selection exceeds new stock level
    if (isOutOfStock || quantityToAdd > item.quantityAvailable) {
       setQuantityToAdd(1); // Reset to 1 or potentially Math.min(1, item.quantityAvailable)
    }
     // Optional: If stock increases, we could allow the user's chosen quantity
     // if it's now valid, but resetting to 1 is simpler.
  }, [item.quantityAvailable, isOutOfStock, quantityToAdd]); // Added quantityToAdd dependency

  const handleDecrease = () => {
    setQuantityToAdd(prev => Math.max(1, prev - 1)); // Prevent going below 1
  };

  const handleIncrease = () => {
    // Prevent increasing beyond available stock
    setQuantityToAdd(prev => Math.min(item.quantityAvailable, prev + 1));
  };

  const handleAddToCartClick = (event) => {
    event.stopPropagation(); // Prevent link navigation when clicking button
    // Double-check stock just in case, although buttons should be disabled
    if (isOutOfStock) {
      alert(`${item.name} is out of stock!`);
      return;
    }

    // Check if desired quantity is valid (should be handled by +/- buttons, but good failsafe)
    if (quantityToAdd > 0 && quantityToAdd <= item.quantityAvailable) {
      onAddToCart(item, quantityToAdd); // Pass the selected quantity
      setQuantityToAdd(1); // Reset quantity selector to 1 after adding
    } else {
        // This case should ideally not be reachable if buttons are correctly disabled
      alert(`Cannot add ${quantityToAdd}. Available: ${item.quantityAvailable}`);
    }
  };

  const handleDeleteClick = async (event) => {
    event.stopPropagation(); // Prevent link navigation
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        // Use the correct full backend URL
        const response = await fetch(`${API_BASE_URL}/groceries/delete/${item.id}`, {
          method: 'DELETE',
          credentials: 'include', // <<< Important: Send cookies for authentication
          headers: {
            'Content-Type': 'application/json',
            // Include auth token if needed
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log(result.message); // Log success message
        onDeleteItem(item.id); // Notify parent component to refresh list
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert(`Failed to delete item: ${error.message}`);
      }
    }
  };


  return (
    <div className={`grocery-item ${isOutOfStock ? 'out-of-stock' : ''}`}>
      {/* Link wraps the display part */}
      <Link to={`/item/${item.id}`} className="grocery-item-link">
        <h3>{item.name}</h3>
        <p>Price: Rs. {item.price.toFixed(2)}</p>
        <p>Available: {item.quantityAvailable}</p>
        {/* Display category */}
        <p className="item-category">Category: {item.category || 'N/A'}</p>
      </Link>

      {/* Controls section - only show for non-owners */}
      {currentUser?.type !== 'owner' && (
        <div className="item-controls-wrapper" onClick={(e) => e.stopPropagation()}>
          {!isOutOfStock ? (
            <div className="item-controls"> {/* Use a class for styling */}
              {/* Quantity Adjustment Controls */}
              <div className="quantity-adjuster">
              <button
                onClick={handleDecrease}
                disabled={quantityToAdd <= 1} // Disable if quantity is already 1
                aria-label={`Decrease quantity for ${item.name}`}
              >
                -
              </button>
              <span className="quantity-display" aria-live="polite">{quantityToAdd}</span> {/* Display the intended quantity */}
              <button
                onClick={handleIncrease}
                disabled={quantityToAdd >= item.quantityAvailable} // Disable if quantity reaches stock limit
                aria-label={`Increase quantity for ${item.name}`}
              >
                +
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              className="add-to-cart-button"
              onClick={handleAddToCartClick}
              // Disable if out of stock (already handled by conditional render, but safe)
              disabled={isOutOfStock}
            >
              Add to Cart
              </button>
            </div>
          ) : (
            <p className="stock-message">Out of Stock</p> // Show message if out of stock
          )}
        </div>
      )}

      {/* Delete button for owners */}
      {currentUser?.type === 'owner' && (
         <div className="item-controls-wrapper owner-controls" onClick={(e) => e.stopPropagation()}>
           <button
             className="delete-button"
             onClick={handleDeleteClick}
             aria-label={`Delete ${item.name}`}
           >
             Delete Item
           </button>
         </div>
      )}
    </div>
  );
}

export default GroceryItem;
