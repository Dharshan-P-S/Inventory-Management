import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../App.css'; // Ensure styles are imported

const API_BASE_URL = 'http://localhost:3001/api';

function ProductDetailPage() {
  const { id } = useParams(); // Get item ID from URL parameter
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // TODO: Add state/handler for adding to cart from this page

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

  if (loading) return <p className="loading-message">Loading product details...</p>;
  if (error) return <p className="error-message api-error">{error}</p>;
  if (!item) return <p className="error-message">Product not found.</p>; // Should be caught by error state, but good fallback

  const isOutOfStock = item.quantityAvailable <= 0;

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

          {/* TODO: Add quantity selector and Add to Cart button */}
          {!isOutOfStock && (
            <div className="product-actions">
              {/* Placeholder for quantity adjuster */}
              <div className="quantity-adjuster-placeholder">
                <span>Quantity: 1</span> {/* Replace with actual adjuster later */}
              </div>
              <button className="add-to-cart-button-detail">
                Add to Cart
              </button>
            </div>
          )}
           {isOutOfStock && (
             <p className="stock-message">Currently unavailable</p>
           )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
