import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../App.css'; // Ensure styles are imported

const API_BASE_URL = 'http://localhost:3001/api';

// Accept onAddToCart and currentUser props
function ProductDetailPage({ onAddToCart, currentUser }) {
  const { id } = useParams(); // Get item ID from URL parameter
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1); // State for quantity

  useEffect(() => {
    const fetchItemDetails = async () => {
      setLoading(true);
      setError(null);
      console.log(`Fetching details for item ID: ${id}`);
      try {
        const response = await fetch(`${API_BASE_URL}/groceries/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Product with ID ${id} not found.`);
          } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
        }
        const data = await response.json();
        setItem(data);
      } catch (e) {
        console.error("Failed to fetch item details:", e);
        setError(`Failed to load product details: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id]); // Re-fetch if ID changes

  // Reset quantityToAdd if item changes or goes out of stock
  useEffect(() => {
    if (item && (item.quantityAvailable <= 0 || quantityToAdd > item.quantityAvailable)) {
      setQuantityToAdd(1);
    }
  }, [item, quantityToAdd]);

  if (loading) return <p className="loading-message">Loading product details...</p>;
  if (error) return <p className="error-message api-error">{error}</p>;
  if (!item) return <p className="error-message">Product not found.</p>; // Should be caught by error state, but good fallback

  const isOutOfStock = item.quantityAvailable <= 0;

  // Quantity handlers
  const handleDecrease = () => {
    setQuantityToAdd(prev => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    setQuantityToAdd(prev => Math.min(item.quantityAvailable, prev + 1));
  };

  // Add to cart handler
  const handleAddToCartClick = () => {
    if (isOutOfStock) {
      alert(`${item.name} is out of stock!`);
      return;
    }
    if (quantityToAdd > 0 && quantityToAdd <= item.quantityAvailable) {
      onAddToCart(item, quantityToAdd);
      alert(`${quantityToAdd} x ${item.name} added to cart!`);
      setQuantityToAdd(1); // Reset quantity
    } else {
      alert(`Cannot add ${quantityToAdd}. Available: ${item.quantityAvailable}`);
    }
  };


  return (
    <div className="page-container product-detail-page">
      <Link to="/" className="back-link">&larr; Back to Groceries</Link>
      <div className="product-detail-content">
        {/* TODO: Add image if available */}
        <div className="product-info">
          <h1>{item.name}</h1>
          <p className="product-category">Category: {item.category || 'N/A'}</p>
          <p className="product-price">Price: Rs. {item.price.toFixed(2)}</p>
          <p className={`product-stock ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
            {isOutOfStock ? 'Out of Stock' : `Available: ${item.quantityAvailable}`}
          </p>
          {/* TODO: Add description if available */}
          <p className="product-description">
            Detailed description for {item.name} would go here. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>

          {/* --- Product Actions (Quantity & Add to Cart) --- */}
          {/* Only show if NOT owner AND item is IN STOCK */}
          {currentUser?.type !== 'owner' && !isOutOfStock && (
            <div className="product-actions">
              <div className="quantity-adjuster">
                <button
                  onClick={handleDecrease}
                  disabled={quantityToAdd <= 1}
                  aria-label={`Decrease quantity for ${item.name}`}
                >
                  -
                </button>
                <span className="quantity-display" aria-live="polite">{quantityToAdd}</span>
                <button
                  onClick={handleIncrease}
                  disabled={quantityToAdd >= item.quantityAvailable}
                  aria-label={`Increase quantity for ${item.name}`}
                >
                  +
                </button>
              </div>
              <button
                className="add-to-cart-button-detail"
                onClick={handleAddToCartClick}
                disabled={isOutOfStock} // Double check, though parent condition handles this
              >
                Add to Cart
              </button>
            </div>
          )}

          {/* Show message if owner OR out of stock */}
           {(currentUser?.type === 'owner' || isOutOfStock) && (
             <p className="stock-message">
               {isOutOfStock ? 'Currently unavailable' : 'Owners cannot add items to cart.'}
             </p>
           )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
