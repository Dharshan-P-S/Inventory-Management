import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
// Removed motion import
import EditItemModal from '../components/EditItemModal';
import '../App.css';

const API_BASE_URL = 'http://localhost:3001/api';

// Removed animation variants and transition

// Accept onAddToCart, currentUser, onUpdateItem, onDeleteItem, onUpdateStock props
function ProductDetailPage({ onAddToCart, currentUser, onUpdateItem, onDeleteItem, onUpdateStock }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1); // State for customer quantity
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // State for owner stock adjustment
  const [stockChangeAmount, setStockChangeAmount] = useState(0);
  const [stockUpdateError, setStockUpdateError] = useState('');

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
        setError(`Failed toload product details: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id, onUpdateStock]);

  // Reset quantities/errors if item changes
  useEffect(() => {
    if (item) {
      // Reset customer quantity if needed
      if (item.quantityAvailable <= 0 || quantityToAdd > item.quantityAvailable) {
        setQuantityToAdd(1);
      }
      // Reset owner stock adjustment state
      setStockChangeAmount(0);
      setStockUpdateError('');
    }
    // Close edit modal if item changes (e.g., after deletion/navigation)
    setIsEditModalOpen(false);
  }, [item]); // Rerun when item data changes

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

  // Stock Adjustment Handlers (for Owner)
  const adjustStockChange = useCallback((increment) => {
    if (!item) return;
    setStockChangeAmount(prev => {
      const newChange = prev + increment;
      // Prevent projected quantity from going below zero
      if (item.quantityAvailable + newChange < 0) {
        setStockUpdateError(`Cannot decrease stock below zero. Max decrease: ${item.quantityAvailable}.`);
        return -item.quantityAvailable; // Set change to max possible decrease
      }
      setStockUpdateError(''); // Clear error if adjustment is valid
      return newChange;
    });
  }, [item]);

  const handleSaveStockUpdate = useCallback(() => {
    if (!item || !onUpdateStock) return;
    if (stockChangeAmount === 0) {
      setStockUpdateError('Adjust stock (+/-) before saving.');
      return;
    }
    // Final check (should be prevented by adjustStockChange)
    if (item.quantityAvailable + stockChangeAmount < 0) {
      setStockUpdateError('Update would result in negative stock.');
      return;
    }

    setStockUpdateError('');
    // Call the update function passed from App.jsx
    onUpdateStock(item.id.toString(), stockChangeAmount, () => {
      // Success callback from App.jsx will update groceryItems state,
      // which triggers the useEffect above to reset local state.
      // We might need to manually update the local 'item' state here too
      // if App.jsx doesn't pass the *updated* item back immediately.
      // For now, assume App.jsx handles the state update propagation.
      setStockChangeAmount(0); // Reset locally immediately for responsiveness
    });
  }, [item, stockChangeAmount, onUpdateStock]);


  // Delete Handler
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
  const projectedQuantity = item ? item.quantityAvailable + stockChangeAmount : null;

  return (
    <div
      className="page-container product-detail-page" // Apply existing classes here
    >
      <Link to="/" className="back-link">&larr; Back to Groceries</Link>
      <div className="product-detail-content">
        {/* TODO: Add image if available */}
        <div className="product-info">
          <h1>{item.name}</h1>
          <p className="product-category">Category: {item.category || 'N/A'}</p>
          <p className="product-price">Price: Rs. {item.price?.toFixed(2)}</p>
          <p className={`product-stock ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
            {isOutOfStock ? 'Out of Stock' : `Available: ${item.quantityAvailable}`}
          </p>
          {/* Display description if it exists */}
          {item.description && (
            <div className="product-description-section">
              <h3>Description</h3>
              <p className="product-description">{item.description}</p>
            </div>
          )}

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

          {/* --- Owner Controls (Edit, Delete, Stock Update) --- */}
          {currentUser?.type === 'owner' && (
            <div className="owner-section"> {/* Container for all owner actions */}
              <hr /> {/* Separator */}
              <h4>Owner Actions</h4>

              {/* Stock Update Controls */}
              <div className="owner-stock-update">
                <label htmlFor={`stock-adjust-${item.id}`}>Adjust Stock:</label>
                <div className="quantity-adjuster" id={`stock-adjust-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => adjustStockChange(-1)}
                    disabled={item.quantityAvailable + stockChangeAmount <= 0}
                    aria-label="Decrease stock change"
                  >
                    -
                  </button>
                  <span className="quantity-display" aria-live="polite">
                    {stockChangeAmount > 0 ? `+${stockChangeAmount}` : stockChangeAmount}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustStockChange(1)}
                    aria-label="Increase stock change"
                  >
                    +
                  </button>
                </div>
                 {projectedQuantity !== null && (
                    <p className="projected-stock">
                      Projected Stock: {projectedQuantity}
                    </p>
                 )}
                <button
                  type="button"
                  className="update-stock-button save" // Reuse class from StockUpdater
                  onClick={handleSaveStockUpdate}
                  disabled={stockChangeAmount === 0 || (item.quantityAvailable + stockChangeAmount < 0)}
                >
                  Save Stock Update
                </button>
                 {stockUpdateError && <p className="error-message">{stockUpdateError}</p>}
              </div>

              {/* Edit and Delete Buttons */}
              <div className="owner-item-management">
                 <button className="edit-button" onClick={handleEditClick} aria-label={`Edit ${item.name}`}>Edit Item Details</button>
                 <button className="delete-button" onClick={handleDeleteClick} aria-label={`Delete ${item.name}`}>Delete Item</button>
              </div>
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
