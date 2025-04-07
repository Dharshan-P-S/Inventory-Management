import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import EditItemModal from '../components/EditItemModal'; // Import the modal
import '../App.css'; // Ensure styles are imported

const API_BASE_URL = 'http://localhost:3001/api';

// Accept onAddToCart, currentUser, onUpdateItem, onDeleteItem props
function ProductDetailPage({ onAddToCart, currentUser, onUpdateItem, onDeleteItem }) {
  const { id } = useParams(); // Get item ID from URL parameter
  const navigate = useNavigate(); // Hook for navigation
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1); // State for quantity
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal

  // Fetch item details effect
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
      setQuantityToAdd(1); // Reset quantity if needed
    }
    // If item details change (e.g., after edit), ensure modal closes if open
    // This might be too aggressive, consider if modal should stay open
    // setIsEditModalOpen(false);
  }, [item, quantityToAdd]);

  // --- Callbacks for Handlers ---
  const handleDecrease = useCallback(() => {
    setQuantityToAdd(prev => Math.max(1, prev - 1));
  }, []);

  const handleIncrease = useCallback(() => {
    // Check against potentially updated item state
    if (item) {
      setQuantityToAdd(prev => Math.min(item.quantityAvailable, prev + 1));
    }
  }, [item]);

  const handleAddToCartClick = useCallback(() => {
    if (!item) return; // Guard against item not loaded
    const isOutOfStock = item.quantityAvailable <= 0;
    if (isOutOfStock) {
      alert(`${item.name} is out of stock!`);
      return;
    }
    if (quantityToAdd > 0 && quantityToAdd <= item.quantityAvailable) {
      onAddToCart(item, quantityToAdd);
      setQuantityToAdd(1); // Reset quantity
    } else {
      alert(`Cannot add ${quantityToAdd}. Available: ${item.quantityAvailable}`);
    }
  }, [item, quantityToAdd, onAddToCart]);

  // --- Owner Action Handlers ---
  const handleDeleteClick = useCallback(async () => {
    if (!item) return;
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/groceries/delete/${item.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log(result.message);
        onDeleteItem(item.id); // Notify App.jsx to update state
        alert(`Item '${item.name}' deleted successfully.`);
        navigate('/'); // Navigate back home after deletion
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert(`Failed to delete item: ${error.message}`);
      }
    }
  }, [item, onDeleteItem, navigate]); // Dependencies

  const handleEditClick = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleSaveEdit = useCallback(async (updatedItemData) => {
    if (!item) return;
    console.log('Saving edited item from detail page:', updatedItemData);
    try {
      const response = await fetch(`${API_BASE_URL}/groceries/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedItemData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const updatedItem = await response.json();
      // Update local item state directly AND notify App.jsx
      setItem(updatedItem); // Update local state to reflect changes immediately
      onUpdateItem(updatedItem); // Notify parent
      setIsEditModalOpen(false); // Close modal on success
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Failed to update item:', error);
      alert(`Failed to update item: ${error.message}`);
    }
  }, [item, onUpdateItem]); // Dependencies


  // --- Render Logic ---
  if (loading) return <p className="loading-message">Loading product details...</p>;
  if (error) return <p className="error-message api-error">{error}</p>;
  if (!item) return <p className="error-message">Product not found.</p>;

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

          {/* Show message if customer AND out of stock */}
           {currentUser?.type !== 'owner' && isOutOfStock && (
             <p className="stock-message">Currently unavailable</p>
           )}

          {/* --- Owner Controls --- */}
          {currentUser?.type === 'owner' && (
            <div className="product-actions owner-controls"> {/* Reuse owner-controls class */}
              <button className="edit-button" onClick={handleEditClick} aria-label={`Edit ${item.name}`}>Edit Item</button>
              <button className="delete-button" onClick={handleDeleteClick} aria-label={`Delete ${item.name}`}>Delete Item</button>
            </div>
          )}
        </div>
      </div>

      {/* Render the Edit Modal */}
      {isEditModalOpen && item && ( // Ensure item is loaded before rendering modal
        <EditItemModal
          item={item}
          onClose={handleCloseModal}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

export default ProductDetailPage;
