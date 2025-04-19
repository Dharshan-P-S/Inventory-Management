import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion'; // Import motion
import '../App.css'; // Assuming shared styles

const API_BASE_URL = 'http://localhost:3001/api';

// Define variants locally or import from a shared file
const pageVariants = {
  initial: { opacity: 0, x: "-100vw" },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: "100vw" }
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 }; // Faster duration

function EditHistoryPage({ currentUser, apiError, setApiError }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All'); // State for category filter
  const [selectedAction, setSelectedAction] = useState('All'); // State for action filter

  // Fetch inventory history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser || currentUser.type !== 'owner') {
        setApiError('Access denied. Only owners can view edit history.'); // Updated message
        setLoading(false);
        return; // Don't fetch if not an owner
      }

      setLoading(true);
      setApiError(null); // Clear previous errors
      console.log("Fetching edit history..."); // Updated log

      try {
        const response = await fetch(`${API_BASE_URL}/edit-history`, { // Use renamed endpoint
          method: 'GET',
          credentials: 'include', // Send cookies for authentication
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized or Forbidden. Please log in as an owner.');
        }
        if (!response.ok) {
          let errorMsg = `Failed to fetch history: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg += ` - ${errData.message || 'Unknown server error'}`;
          } catch {
            errorMsg += ` - ${response.statusText}`;
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        // Sort data by timestamp descending (newest first)
        const sortedData = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(sortedData);

      } catch (e) {
        console.error("Error fetching edit history:", e); // Updated log
        setApiError(`Error fetching edit history: ${e.message}`); // Updated message
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser, setApiError]); // Re-fetch if user changes

  // --- Category Extraction and Filtering ---
  const categories = useMemo(() => {
    const allCategories = new Set(['All']); // Start with 'All'
    history.forEach(entry => {
      let category = 'N/A';
      if (entry.action === 'item_edit') {
        // For edits, the category might be in the 'changes' or might not have changed
        // We prioritize the 'new' value if category was changed, otherwise look at the base item if available (though less likely for edits)
        category = entry.changes?.category?.new ?? entry.item?.category ?? 'N/A';
      } else if (entry.item?.category) {
        category = entry.item.category;
      }
      if (category && category !== 'N/A') {
        allCategories.add(category);
      }
    });
    return Array.from(allCategories).sort();
  }, [history]);

  // --- Action Extraction and Filtering ---
  const actions = useMemo(() => {
    const allActions = new Set(['All']);
    history.forEach(entry => {
      const action = entry.action || (entry.quantityChange > 0 ? 'stock_increase' : 'stock_decrease');
      if (action) {
        allActions.add(action);
      }
    });
    // Define a preferred order for actions
    const preferredOrder = ['item_edit', 'stock_increase', 'stock_decrease', 'deleted', 'restored'];
    const sortedActions = Array.from(allActions).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        const indexA = preferredOrder.indexOf(a);
        const indexB = preferredOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1; // Known actions first
        if (indexB !== -1) return 1;
        return a.localeCompare(b); // Alphabetical for unknown actions
    });
    return sortedActions;
  }, [history]);


  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      // Category Filter Logic
      let categoryMatch = true;
      if (selectedCategory !== 'All') {
        let itemCategory = 'N/A';
        if (entry.action === 'item_edit') {
          itemCategory = entry.changes?.category?.new ?? entry.item?.category ?? 'N/A';
         // If category wasn't changed, we need the original category. This is tricky without fetching the item state at that time.
         // For simplicity, we'll filter based on the *new* category if it changed, or assume it matches if it didn't change *and* the original item had the category.
         // A more robust solution might require storing the full item state before the edit in the history.
         // Let's refine: If category *didn't* change, we need the category *before* the edit.
         // The current structure doesn't reliably provide this for 'item_edit' unless the category itself was edited.
         // Let's prioritize the category from `entry.item` if available, otherwise the `new` value from changes.
          if (entry.item?.category) {
              itemCategory = entry.item.category;
          }
          if (entry.changes?.category?.new) {
              itemCategory = entry.changes.category.new;
          }
        } else if (entry.item?.category) {
          itemCategory = entry.item.category;
        }
        categoryMatch = (itemCategory === selectedCategory);
      }

      // Action Filter Logic
      let actionMatch = true;
      if (selectedAction !== 'All') {
        const entryAction = entry.action || (entry.quantityChange > 0 ? 'stock_increase' : 'stock_decrease');
        actionMatch = (entryAction === selectedAction);
      }

      return categoryMatch && actionMatch; // Entry must match both filters
    });
  }, [history, selectedCategory, selectedAction]);
  // --- End Filtering Logic ---


  if (loading) return <p className="loading-message">Loading edit history...</p>;
  if (apiError) return <p className="error-message api-error">{apiError}</p>;

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-container edit-history-page" // Apply existing classes here
    >
      <h2>Edit History</h2>

      {/* Filter Controls Container - Use Flexbox */}
      <div className="filter-controls-area filter-controls-flex-container">
        {/* Category Filter Dropdown */}
        {categories.length > 1 && (
          <div className="filter-dropdown-container"> {/* Removed filter-row */}
            <label htmlFor="category-filter" className="filter-label">Category:</label>
            <select
              id="category-filter"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Filter Dropdown */}
        {actions.length > 1 && (
          <div className="filter-dropdown-container"> {/* Removed filter-row */}
            <label htmlFor="action-filter" className="filter-label">Action:</label>
            <select
              id="action-filter"
              className="filter-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              {actions.map(action => (
                <option key={action} value={action}>
                  {/* Make action names more readable */}
                  {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredHistory.length === 0 ? (
         <p className="empty-history-message">
           {history.length === 0
             ? 'No edit history recorded yet.'
             : `No edit history found matching the selected filters (Category: ${selectedCategory}, Action: ${selectedAction}).`}
         </p>
      ) : (
        <table className="history-table user-table">
          <thead>
            <tr><th>Timestamp</th><th>Action</th><th>Item ID</th><th>Item Name</th><th>Category</th><th>Details</th><th>User ID</th></tr>
          </thead>
          <tbody>
            {filteredHistory.map((entry, index) => {
              const action = entry.action || (entry.quantityChange > 0 ? 'stock_increase' : 'stock_decrease');
              let itemId = 'N/A', itemName = 'N/A', itemCategory = 'N/A';

              // Determine item details based on action type and data structure
              if (action === 'item_edit') {
                itemId = entry.itemId;
                itemName = entry.itemName; // Name at the time of edit log
                // Get category: prioritize new value if changed, fallback to item's category if available
                itemCategory = entry.changes?.category?.new ?? entry.item?.category ?? 'N/A';
              } else if (entry.item) { // Handle stock/delete/restore
                itemId = entry.item.id;
                itemName = entry.item.name;
                itemCategory = entry.item.category || 'N/A';
              } else { // Fallback
                itemId = entry.itemId || 'N/A';
              }

              let detailsContent = null;

              if (action === 'stock_increase' || action === 'stock_decrease') {
                let quantityDetail = `Change: ${entry.quantityChange > 0 ? '+' : ''}${entry.quantityChange}`;
                if (entry.newQuantity !== undefined) {
                  quantityDetail += ` (New Qty: ${entry.newQuantity})`;
                }
                detailsContent = <span className={entry.quantityChange > 0 ? 'positive-change' : 'negative-change'}>{quantityDetail}</span>;
              } else if (action === 'item_edit') {
                detailsContent = (
                  <ul className="edit-details-list">
                    {Object.entries(entry.changes).map(([field, change]) => {
                      // Format values nicely, handle potential objects/arrays (though less likely here)
                      const formatValue = (val) => typeof val === 'object' ? JSON.stringify(val) : String(val);
                      return (
                        <li key={field}>
                          <strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong>{' '}
                          <span className="old-value">"{formatValue(change.old)}"</span> &rarr; <span className="new-value">"{formatValue(change.new)}"</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              } else if (action === 'deleted' || action === 'restored') {
                 detailsContent = <span className="no-details">-</span>; // Add class for potential styling
              }

              return (
                <tr key={entry.id || index}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className={`action-${action.toLowerCase()}`}>{action.replace('_', ' ').toUpperCase()}</td>
                  <td>{itemId}</td>
                  <td>{itemName}</td>
                  <td>{itemCategory}</td>
                  <td>{detailsContent || <span className="no-details">-</span>}</td>
                  <td>{entry.userId || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </motion.div>
  );
}

export default EditHistoryPage; // Renamed export
