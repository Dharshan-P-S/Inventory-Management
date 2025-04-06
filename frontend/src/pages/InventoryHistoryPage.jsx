import React, { useState, useEffect } from 'react';
import '../App.css'; // Assuming shared styles

const API_BASE_URL = 'http://localhost:3001/api';

function InventoryHistoryPage({ currentUser, apiError, setApiError }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groceriesMap, setGroceriesMap] = useState({}); // To map item IDs to names

  // Fetch groceries once to create a map of ID -> name
  useEffect(() => {
    const fetchGroceries = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/groceries`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const map = data.reduce((acc, item) => {
          acc[item.id.toString()] = item.name; // Ensure IDs are strings for matching
          return acc;
        }, {});
        setGroceriesMap(map);
      } catch (e) {
        console.error("Failed to fetch groceries for mapping:", e);
        // Non-critical error, history can still be shown with IDs
      }
    };
    fetchGroceries();
  }, []); // Fetch only once on mount

  // Fetch inventory history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser || currentUser.type !== 'owner') {
        setApiError('Access denied. Only owners can view inventory history.');
        setLoading(false);
        return; // Don't fetch if not an owner
      }

      setLoading(true);
      setApiError(null); // Clear previous errors
      console.log("Fetching inventory history...");

      try {
        const response = await fetch(`${API_BASE_URL}/inventory-history`, {
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
        console.error("Error fetching inventory history:", e);
        setApiError(`Error fetching inventory history: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser, setApiError]); // Re-fetch if user changes

  if (loading) return <p className="loading-message">Loading inventory history...</p>;
  if (apiError) return <p className="error-message api-error">{apiError}</p>;

  return (
    <div className="page-container inventory-history-page">
      <h2>Inventory History</h2>
      {history.length === 0 ? (
        <p>No inventory changes recorded yet.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Quantity Change</th>
              <th>User ID</th> {/* Consider showing username if needed */}
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={index}> {/* Use index as key if no unique ID per entry */}
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
                <td>{entry.itemId}</td>
                <td>{groceriesMap[entry.itemId.toString()] || 'N/A'}</td> {/* Look up name */}
                <td className={entry.quantityChange > 0 ? 'positive-change' : 'negative-change'}>
                  {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                </td>
                <td>{entry.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default InventoryHistoryPage;
