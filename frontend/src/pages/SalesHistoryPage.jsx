import React, { useState, useEffect, useMemo } from 'react';
import '../App.css'; // Assuming shared styles

const API_BASE_URL = 'http://localhost:3001/api';

function SalesHistoryPage({ currentUser, apiError, setApiError }) {
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sales history
  useEffect(() => {
    const fetchSalesHistory = async () => {
      if (!currentUser || currentUser.type !== 'owner') {
        setApiError('Access denied. Only owners can view sales history.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setApiError(null);
      console.log("Fetching sales history...");

      try {
        const response = await fetch(`${API_BASE_URL}/sales-history`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized or Forbidden. Please log in as an owner.');
        }
        if (!response.ok) {
          let errorMsg = `Failed to fetch sales history: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg += ` - ${errData.message || 'Unknown server error'}`;
          } catch {
            errorMsg += ` - ${response.statusText}`;
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        // Sort data by timestamp descending (newest first) before grouping
        const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSalesHistory(sortedData);

      } catch (e) {
        console.error("Error fetching sales history:", e);
        setApiError(`Error fetching sales history: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesHistory();
  }, [currentUser, setApiError]);

  // Group sales by month using useMemo for performance
  const salesByMonth = useMemo(() => {
    const grouped = {};
    salesHistory.forEach(sale => {
      const monthYear = sale.date.substring(0, 7); // Extract YYYY-MM
      if (!grouped[monthYear]) {
        grouped[monthYear] = {
          sales: [],
          total: 0,
        };
      }
      grouped[monthYear].sales.push(sale);
      grouped[monthYear].total += sale.total;
    });
    return grouped;
  }, [salesHistory]);

  // Get sorted months (newest first)
  const sortedMonths = useMemo(() => Object.keys(salesByMonth).sort().reverse(), [salesByMonth]);

  if (loading) return <p className="loading-message">Loading sales history...</p>;
  if (apiError) return <p className="error-message api-error">{apiError}</p>;

  return (
    <div className="page-container sales-history-page">
      <h2>Sales History</h2>
      {salesHistory.length === 0 ? (
        <p>No sales recorded yet.</p>
      ) : (
        <div className="monthly-sales-list">
          {sortedMonths.map(monthYear => {
            const monthData = salesByMonth[monthYear];
            const monthDate = new Date(`${monthYear}-01T00:00:00`); // Create a date object for formatting
            const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            return (
              <section key={monthYear} className="monthly-sales-section">
                <h3>
                  {monthName} - Total Sales: Rs. {monthData.total.toFixed(2)}
                </h3>
                <ul className="sales-order-list">
                  {monthData.sales.map(sale => (
                    <li key={sale.orderId} className="sales-order-item">
                      <div className="sales-order-header">
                        <span>Order ID: {sale.orderId}</span>
                        <span>User: {sale.username || 'N/A'} ({sale.userId})</span> {/* Display Username and ID */}
                        <span>Date: {new Date(sale.date).toLocaleString()}</span>
                        <span>Total: Rs. {sale.total.toFixed(2)}</span>
                      </div>
                      <ul className="sales-item-list">
                        {sale.items.map((item, index) => (
                          <li key={`${sale.orderId}-${item.id}-${index}`} className="sales-item-detail">
                            <span>{item.name}</span>
                            <span>Qty: {item.quantity}</span>
                            <span>Price: Rs. {item.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SalesHistoryPage;
