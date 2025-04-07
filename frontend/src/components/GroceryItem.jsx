import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api';

function GroceryItem({ item, onAddToCart, currentUser }) {
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const isOutOfStock = item.quantityAvailable <= 0;

  useEffect(() => {
    // Reset quantity if item goes out of stock or selected quantity exceeds available
    if (isOutOfStock || quantityToAdd > item.quantityAvailable) {
       setQuantityToAdd(1);
    }
  }, [item.quantityAvailable, isOutOfStock, quantityToAdd]);

  // --- Callbacks for stability ---
  const handleDecrease = useCallback(() => {
    setQuantityToAdd(prev => Math.max(1, prev - 1));
  }, []); // No dependencies needed

  const handleIncrease = useCallback(() => {
    setQuantityToAdd(prev => Math.min(item.quantityAvailable, prev + 1));
  }, [item.quantityAvailable]); // Depends on item.quantityAvailable

  const handleAddToCartClick = useCallback((event) => {
    event.stopPropagation();
    if (isOutOfStock) {
      alert(`${item.name} is out of stock!`);
      return;
    }
    if (quantityToAdd > 0 && quantityToAdd <= item.quantityAvailable) {
      onAddToCart(item, quantityToAdd);
      setQuantityToAdd(1); // Reset after adding
    } else {
      // This case should ideally not be reachable if buttons are correctly disabled/handled
      alert(`Cannot add ${quantityToAdd}. Available: ${item.quantityAvailable}`);
    }
  }, [isOutOfStock, quantityToAdd, item, onAddToCart]); // All relevant dependencies

  return (
    <div className={`grocery-item ${isOutOfStock ? 'out-of-stock' : ''}`}>
      {/* Link wraps the display part */}
      <Link to={`/item/${item.id}`} className="grocery-item-link">
        <h3>{item.name}</h3>
        <p>Price: Rs. {item.price.toFixed(2)}</p>
        <p>Available: {item.quantityAvailable}</p>
        <p className="item-category">Category: {item.category || 'N/A'}</p>
      </Link>

      {/* Controls section - only show for non-owners */}
      {currentUser?.type !== 'owner' && (
        <div className="item-controls-wrapper" onClick={(e) => e.stopPropagation()}>
          {!isOutOfStock ? (
            <div className="item-controls">
              <div className="quantity-adjuster">
                <button onClick={handleDecrease} disabled={quantityToAdd <= 1} aria-label={`Decrease quantity for ${item.name}`}>-</button>
                <span className="quantity-display" aria-live="polite">{quantityToAdd}</span>
                <button onClick={handleIncrease} disabled={quantityToAdd >= item.quantityAvailable} aria-label={`Increase quantity for ${item.name}`}>+</button>
              </div>
              <button className="add-to-cart-button" onClick={handleAddToCartClick} disabled={isOutOfStock}>Add to Cart</button>
            </div>
          ) : (
            <p className="stock-message">Out of Stock</p>
          )}
        </div>
      )}
    </div>
  );
}

export default GroceryItem;
