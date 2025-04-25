import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion'; // Import motion
import '../App.css'; // Assuming general styles are here

const API_BASE_URL = 'http://localhost:3001/api';

// Define variants locally or import from a shared file
const pageVariants = {
  initial: { opacity: 0, x: "-100vw" },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: "100vw" }
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 }; // Faster duration

function DeletedItemsPage({ currentUser, apiError, setApiError, onItemRestored }) { // Added onItemRestored prop
  const [deletedItems, setDeletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null); // State to track which item is being restored

  const fetchDeletedItems = useCallback(async () => {
    if (!currentUser || currentUser.type !== 'owner') {
      setApiError("Access denied: Owners only.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    console.log("Fetching deleted items...");
    try {
      const response = await fetch(`${API_BASE_URL}/deleted-groceries`, {
        method: 'GET',
        credentials: 'include', // Send cookies for authentication
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized: Please log in as an owner.");
      }
      if (!response.ok) {
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg += ` - ${errData.message || 'Unknown server error'}`;
        } catch {
            errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // Sort by deletion date, newest first
      data.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      setDeletedItems(data);
      console.log("Deleted items fetched:", data);

    } catch (e) {
      console.error("Failed to fetch deleted items:", e);
      setApiError(`Failed to load deleted items: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser, setApiError]);

  useEffect(() => {
    fetchDeletedItems();
  }, [fetchDeletedItems]); // Fetch when component mounts or user changes

  const handleRestoreItem = async (itemId) => {
    const itemToRestore = deletedItems.find(item => item.id.toString() === itemId.toString());
    if (!itemToRestore) return;

    if (!window.confirm(`Are you sure you want to restore '${itemToRestore.name}' to the active grocery list?`)) {
      return;
    }

    setRestoringId(itemId); // Indicate loading state for this specific item
    setApiError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/deleted-groceries/restore/${itemId}`, {
        method: 'POST',
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json', // Though body is empty, good practice
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized: Please log in as an owner.");
      }
      if (response.status === 404) {
        throw new Error("Item not found in deleted items list (might have been restored already).");
      }
       if (response.status === 409) {
        const errData = await response.json();
        throw new Error(errData.message || "Conflict: Item might already exist in the active list.");
      }
      if (!response.ok) {
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg += ` - ${errData.message || 'Unknown server error'}`;
        } catch {
            errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("Restore successful:", result);

      // Update local state: remove from deleted items
      setDeletedItems(prev => prev.filter(item => item.id.toString() !== itemId.toString()));

      // Notify parent component (App.jsx) to add the item back to the main list
      if (onItemRestored && result.restoredItem) {
        onItemRestored(result.restoredItem);
      }

      alert(`Item '${itemToRestore.name}' restored successfully!`);

    } catch (e) {
      console.error("Failed to restore item:", e);
      setApiError(`Failed to restore item: ${e.message}`);
      alert(`Failed to restore item: ${e.message}`); // Show error to user
    } finally {
      setRestoringId(null); // Clear loading state for this item
    }
  };

  if (loading && deletedItems.length === 0) return <p className="loading-message">Loading deleted items...</p>; // Show loading only initially
  if (apiError) return <p className="error-message">{apiError}</p>;
  if (!currentUser || currentUser.type !== 'owner') return <p className="error-message">Access Denied. Owners only.</p>;


  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-container deleted-items-page" // Apply existing classes here
    >
      <h2>Deleted Grocery Items</h2>
      {deletedItems.length === 0 ? (
        <p>No items have been deleted yet.</p>
      ) : (
        <div className="deleted-items-list items-grid"> {/* Reuse items-grid for layout */}
          {deletedItems.map(item => (
            <div style={{padding:"10px"}} key={item.id} className="deleted-item grocery-item"> {/* Reuse grocery-item styles */}
              <h3>{item.name}</h3>
              <p>Price: Rs. {item.price?.toFixed(2)}</p>
              <p>Category: {item.category || 'N/A'}</p>
              <p>Deleted At: {new Date(item.deletedAt).toLocaleString()}</p>
              {/* Add more details if needed, e.g., deletedBy */}
              <div className="item-controls-wrapper owner-controls">
                 <button
                   className="restore-button"
                   onClick={() => handleRestoreItem(item.id)}
                   disabled={restoringId === item.id} // Disable button while restoring this item
                   aria-label={`Restore ${item.name}`}
                 >
                   {restoringId === item.id ? 'Restoring...' : 'Add Back to List'}
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default DeletedItemsPage;
