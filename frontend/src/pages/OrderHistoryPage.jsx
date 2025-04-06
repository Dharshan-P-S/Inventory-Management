import React, { useState, useEffect } from 'react';
import OrderHistoryItem from '../components/OrderHistoryItem';
import '../App.css'; // Ensure styles are imported

const API_BASE_URL = 'http://localhost:3001/api'; // Or use a shared config

// Accept currentUser prop
function OrderHistoryPage({ currentUser, apiError, setApiError }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      setApiError(null); // Clear errors from App.jsx
      console.log("Fetching order history from:", `${API_BASE_URL}/orders`);
      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          credentials: 'include', // <<< Include cookies for authentication
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login if unauthorized
            if (window.navigate) window.navigate('/login', { state: { from: '/order-history' } });
            return; // Stop further processing
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        // Sort orders by date, newest first
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setOrders(data);
      } catch (e) {
        console.error("Failed to fetch order history:", e);
        setError(`Failed to load order history: ${e.message}`);
        setApiError(`Failed to load order history: ${e.message}`); // Set error in App.jsx too?
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchOrders(); // Only fetch orders if user is logged in
    } else {
      setLoading(false);
      setError("Not logged in. Please log in to view order history.");
    }
  }, [currentUser, setApiError]); // Fetch orders when component mounts and when currentUser changes

  if (loading) return <p className="loading-message">Loading order history...</p>;
  if (error || apiError) return <p className="error-message api-error">{error || apiError}</p>; // Show local error or error from App.jsx

  return (
    <div className="page-container order-history-page">
      <h2>Order History for {currentUser.username}</h2>
      {orders.length === 0 ? (
        <p className="empty-history-message">You have no past orders.</p>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <OrderHistoryItem key={order.orderId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;
