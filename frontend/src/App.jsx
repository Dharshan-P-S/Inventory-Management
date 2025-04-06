// --- App.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation.jsx'; // Ensure .jsx extension
import HomePage from './pages/HomePage.jsx';       // Ensure .jsx extension
import CartPage from './pages/CartPage.jsx';         // Ensure .jsx extension
import NewItemPage from './pages/NewItemPage.jsx';   // Ensure .jsx extension
import StockUpdatePage from './pages/StockUpdatePage.jsx'; // Ensure .jsx extension
import LoginPage from './pages/LoginPage.jsx'; // Import LoginPage
import RegisterPage from './pages/RegisterPage.jsx'; // Import RegisterPage
import OrderHistoryPage from './pages/OrderHistoryPage.jsx'; // Import OrderHistoryPage
import InventoryHistoryPage from './pages/InventoryHistoryPage.jsx'; // Import InventoryHistoryPage
import ProductDetailPage from './pages/ProductDetailPage.jsx'; // Import ProductDetailPage
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper component to handle navigation after login/logout
function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    window.navigate = navigate; // Make navigate globally accessible (use with caution, context is better)
  }, [navigate]);
  return null;
}


function App() {
  const [groceryItems, setGroceryItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // State for logged-in user
  const [authLoading, setAuthLoading] = useState(true); // State for initial session check

  // --- Authentication Functions ---

  // Check session on initial load
  const checkSession = useCallback(async () => {
    setAuthLoading(true);
    setApiError(null);
    console.log("Checking session...");
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'GET',
        credentials: 'include', // Send cookies
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        console.log("Session active for user:", data.user);
      } else if (response.status === 401) {
        setCurrentUser(null);
        console.log("No active session.");
      } else {
        // Handle other errors (e.g., server down)
        let errorMsg = `Session check failed: ${response.status}`;
         try {
             const errData = await response.json();
             errorMsg += ` - ${errData.message || 'Unknown server error'}`;
         } catch {
             errorMsg += ` - ${response.statusText}`;
         }
        throw new Error(errorMsg);
      }
    } catch (e) {
      console.error("Error checking session:", e);
      setApiError(`Error checking session: ${e.message}`);
      setCurrentUser(null); // Assume logged out on error
    } finally {
      setAuthLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Handle user login
  const handleLogin = (userData) => {
    setCurrentUser(userData);
    // Optionally clear cart on login? Or persist it? For now, keep it.
    if (window.navigate) window.navigate('/'); // Navigate home after login
  };

  // Handle user logout
  const handleLogout = async () => {
    setApiError(null);
    console.log("Attempting logout...");
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include', // Send cookies
      });
      if (!response.ok) {
         let errorMsg = `Logout failed: ${response.status}`;
         try {
             const errData = await response.json();
             errorMsg += ` - ${errData.message || 'Unknown server error'}`;
         } catch {
             errorMsg += ` - ${response.statusText}`;
         }
        throw new Error(errorMsg);
      }
      setCurrentUser(null);
      setCartItems([]); // Clear cart on logout
      console.log("Logout successful.");
      if (window.navigate) window.navigate('/login'); // Navigate to login page after logout
    } catch (e) {
      console.error("Error logging out:", e);
      setApiError(`Logout failed: ${e.message}`);
      // Decide if user should be logged out locally even if server fails
      setCurrentUser(null); // Log out locally anyway on error
      setCartItems([]);
    }
  };


  // --- Data Fetching ---
  const fetchGroceries = useCallback(async () => {
      setLoading(true);
      setApiError(null);
      console.log("Fetching groceries from:", `${API_BASE_URL}/groceries`);
      try {
        const response = await fetch(`${API_BASE_URL}/groceries`); // No credentials needed for public groceries
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
        setGroceryItems(data);
      } catch (e) {
        console.error("Failed to fetch groceries:", e);
        setApiError(`Failed to load groceries: ${e.message}. Is the backend server running and CORS configured?`);
      } finally {
        setLoading(false);
      }
  }, []); // Empty dependency array

  // Fetch groceries and check session on initial mount
  useEffect(() => {
    checkSession(); // Check login status first
    fetchGroceries();
  }, [checkSession, fetchGroceries]); // Include dependencies


  // --- Cart Management ---
  const handleAddToCart = (itemToAdd, quantityToAdd = 1) => {
     const currentItemState = groceryItems.find(item => item.id.toString() === itemToAdd.id.toString());

     if (!currentItemState) {
        alert(`${itemToAdd.name} is currently unavailable or not found. Please refresh.`);
        return;
     }
     if (currentItemState.quantityAvailable <= 0) {
         alert(`Sorry, ${itemToAdd.name} is currently out of stock.`);
         return;
     }
     if (quantityToAdd > currentItemState.quantityAvailable) {
        alert(`Cannot add ${quantityToAdd} ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} available.`);
        return;
     }

    setCartItems(prevCartItems => {
      const existingCartItem = prevCartItems.find(item => item.id.toString() === itemToAdd.id.toString());

      if (existingCartItem) {
        const potentialNewQuantityInCart = existingCartItem.quantity + quantityToAdd;

        if (potentialNewQuantityInCart > currentItemState.quantityAvailable) {
           const canAdd = currentItemState.quantityAvailable - existingCartItem.quantity;
           if (canAdd > 0) {
              alert(`Cannot add ${quantityToAdd} more ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} total available, and you already have ${existingCartItem.quantity} in your cart. You can add ${canAdd} more.`);
           } else {
              alert(`Cannot add more ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} total available, and you already have ${existingCartItem.quantity} in your cart.`);
           }
           return prevCartItems;
        }

        return prevCartItems.map(item =>
          item.id.toString() === itemToAdd.id.toString()
            ? { ...item, quantity: potentialNewQuantityInCart }
            : item
        );
      } else {
        // Ensure the item added to cart has a consistent ID type (e.g., string)
        const actualQuantity = Math.max(1, quantityToAdd);
        return [...prevCartItems, { ...itemToAdd, id: itemToAdd.id.toString(), quantity: actualQuantity }];
      }
    });
  };

  const handleIncreaseQuantity = (itemId) => {
    const itemIdStr = itemId.toString();
    const currentItemState = groceryItems.find(item => item.id.toString() === itemIdStr);
    const cartItem = cartItems.find(item => item.id.toString() === itemIdStr);

    if (!currentItemState) {
        alert("Item data not found. Please refresh.");
        return;
    }
    if (!cartItem) return;

    const potentialNewQuantity = cartItem.quantity + 1;
    if (potentialNewQuantity > currentItemState.quantityAvailable) {
        alert(`Cannot add more ${currentItemState.name}. Only ${currentItemState.quantityAvailable} available.`);
        return;
    }

    setCartItems(prevCartItems =>
      prevCartItems.map(item =>
        item.id.toString() === itemIdStr ? { ...item, quantity: potentialNewQuantity } : item
      )
    );
  };

  const handleDecreaseQuantity = (itemId) => {
     const itemIdStr = itemId.toString();
     setCartItems(prevCartItems => {
       const itemIndex = prevCartItems.findIndex(item => item.id.toString() === itemIdStr);
       if (itemIndex === -1) return prevCartItems;

       const currentItem = prevCartItems[itemIndex];

       if (currentItem.quantity > 1) {
         return prevCartItems.map(item =>
           item.id.toString() === itemIdStr ? { ...item, quantity: item.quantity - 1 } : item
         );
       } else {
         // Remove item if quantity becomes 0
         return prevCartItems.filter(item => item.id.toString() !== itemIdStr);
       }
     });
  };

  const handleRemoveFromCart = (itemId) => {
    const itemIdStr = itemId.toString();
    setCartItems(prevCartItems => prevCartItems.filter(item => item.id.toString() !== itemIdStr));
  };


  // --- API Interactions ---

  // Add Item (Consider adding auth if needed)
  const handleAddItem = async (newItemData) => {
    console.log("Attempting to add item via API:", newItemData);
    setApiError(null);
    // Add credentials: 'include' if this endpoint requires authentication
    try {
      const response = await fetch(`${API_BASE_URL}/groceries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItemData),
        credentials: 'include', // Send cookies for owner authentication
      });

      // Handle 401/403 Unauthorized/Forbidden specifically
      if (response.status === 401 || response.status === 403) {
          alert("Authentication required or insufficient permissions to add items. Please log in as an owner.");
          // Optionally log out or redirect
          // handleLogout();
          if (window.navigate) window.navigate('/login');
          return false; // Indicate failure
      }

      if (!response.ok) {
        let errorMsg = `Failed to add item: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.message || 'Unknown server error'}`;
        } catch {
             errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const addedItem = await response.json();

      // Ensure added item ID matches type used elsewhere (e.g., string)
      setGroceryItems(prevItems => [...prevItems, { ...addedItem, id: addedItem.id.toString() }]);

      alert(`${addedItem.name} added successfully!`);
      return true; // Indicate success

    } catch (e) {
      console.error("Error adding item:", e);
      setApiError(`Error adding item: ${e.message}`);
      alert(`Error adding item: ${e.message}`);
      return false; // Indicate failure
    }
  };

  // Buy Items (Requires Authentication)
  const handleBuy = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    if (!currentUser) { // Check if user is logged in
        alert("Please log in to complete your purchase.");
        if (window.navigate) window.navigate('/login');
        return;
    }

    setApiError(null);
    setLoading(true);

    console.log(`User ${currentUser.username} attempting to buy items:`, cartItems);

    try {
      const response = await fetch(`${API_BASE_URL}/buy`, {
        method: 'POST',
        credentials: 'include', // <<< Send cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartItems.map(item => ({
            id: item.id, // Ensure ID is sent correctly (string/number as expected by backend)
            quantity: item.quantity,
            price: item.price,
            name: item.name
        }))),
      });

      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
          alert("Your session may have expired. Please log in again.");
          setCurrentUser(null); // Log out the user locally
          setCartItems([]);
          if (window.navigate) window.navigate('/login');
          return; // Stop further processing
      }

      if (!response.ok && response.status !== 207) { // 207 Multi-Status might be used for partial success/failure
        let errorMsg = `Purchase failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.message || 'Unknown server error'}`;
        } catch {
             errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("Purchase/Order response:", result);

      setCartItems([]); // Clear cart on successful purchase

      // Re-fetch groceries to update stock display
      await fetchGroceries(); // Use the existing fetch function

      if (response.status === 207) { // Handle partial success/failure if backend uses 207
          alert(`Warning: ${result.message}`);
      } else {
          alert("Purchase successful! Your order has been recorded.");
          if (window.navigate) window.navigate('/order-history'); // Navigate to order history
      }

    } catch (e) {
      console.error("Error during purchase/order saving:", e);
      setApiError(`Purchase failed: ${e.message}`);
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update Stock (Consider adding auth)
  const handleStockUpdate = async (itemId, quantityChange, onSuccess) => {
    setApiError(null);
    setLoading(true);
    const itemIdStr = itemId.toString(); // Use string for consistency

    console.log(`Attempting to update stock for item ID ${itemIdStr} by ${quantityChange}`);

    try {
      const response = await fetch(`${API_BASE_URL}/groceries/${itemIdStr}/stock`, { // Use string ID
        method: 'PATCH',
        credentials: 'include', // Send cookies for owner authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantityChange: quantityChange }),
      });

      // Handle 401/403 Unauthorized/Forbidden specifically
      if (response.status === 401 || response.status === 403) {
          alert("Authentication required or insufficient permissions to update stock. Please log in as an owner.");
          // Optionally log out or redirect
          // handleLogout();
          if (window.navigate) window.navigate('/login');
          return; // Stop further processing
      }

      if (!response.ok) {
        let errorMsg = `Stock update failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg += ` - ${errorData.message || 'Unknown server error'}`;
        } catch {
          errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const updatedItem = await response.json();
      console.log("Stock update successful:", updatedItem);

      // Ensure updated item ID matches type used elsewhere (e.g., string)
      const updatedItemStrId = { ...updatedItem, id: updatedItem.id.toString() };

      setGroceryItems(prevItems =>
        prevItems.map(item =>
          item.id.toString() === updatedItemStrId.id ? updatedItemStrId : item
        )
      );

      alert(`Stock for ${updatedItem.name} updated successfully! New quantity: ${updatedItem.quantityAvailable}`);
      if (onSuccess) onSuccess(); // Callback for form clearing etc.

    } catch (e) {
      console.error("Error updating stock:", e);
      const userMessage = `Error updating stock: ${e.message}`;
      setApiError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };


  // --- Render Logic ---
  if (authLoading) {
      return <div className="loading-message">Checking login status...</div>;
  }

  return (
    <Router>
      <NavigateSetter /> {/* Include the helper component */}
      <div className="App">
        <Navigation
            cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            currentUser={currentUser}
            onLogout={handleLogout}
        />
        <main>
           {apiError && !loading && <p className="error-message main-error">{apiError}</p>}
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  items={groceryItems}
                  onAddToCart={handleAddToCart}
                  loading={loading || authLoading}
                  currentUser={currentUser} // Pass current user
                />
              }
            />
            <Route
              path="/cart"
              element={
                <CartPage
                  cartItems={cartItems}
                  onIncrease={handleIncreaseQuantity}
                  onDecrease={handleDecreaseQuantity}
                  onRemove={handleRemoveFromCart}
                  onBuy={handleBuy}
                  groceryItems={groceryItems} // Pass grocery items for stock check reference
                  currentUser={currentUser} // Pass user status
                />
              }
            />
            {/* Protected Route for Owners: Add Item */}
            <Route
              path="/add-item"
              element={
                currentUser && currentUser.type === 'owner' ? (
                  <NewItemPage onAddItem={handleAddItem} apiError={apiError} />
                ) : currentUser ? (
                   <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace />
                ) : (
                  <Navigate to="/login" state={{ from: '/add-item', message: "Please log in as an owner to add items." }} replace />
                )
              }
            />
            {/* Protected Route for Owners: Update Stock */}
            <Route
              path="/update-stock"
              element={
                currentUser && currentUser.type === 'owner' ? (
                  <StockUpdatePage
                    groceries={groceryItems}
                    onUpdateStock={handleStockUpdate}
                  />
                ) : currentUser ? (
                   <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace />
                ) : (
                  <Navigate to="/login" state={{ from: '/update-stock', message: "Please log in as an owner to update stock." }} replace />
                )
              }
            />
            {/* Protected Route for Owners: Inventory History */}
            <Route
              path="/inventory-history"
              element={
                currentUser && currentUser.type === 'owner' ? (
                  <InventoryHistoryPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                ) : currentUser ? (
                   <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace />
                ) : (
                  <Navigate to="/login" state={{ from: '/inventory-history', message: "Please log in as an owner to view inventory history." }} replace />
                )
              }
            />
            <Route
                path="/login"
                element={
                    currentUser ? (
                        <Navigate to="/" replace /> // Redirect if already logged in
                    ) : (
                        <LoginPage onLogin={handleLogin} apiError={apiError} setApiError={setApiError} />
                    )
                }
            />
             <Route
                path="/register"
                element={
                     currentUser ? (
                        <Navigate to="/" replace /> // Redirect if already logged in
                    ) : (
                        <RegisterPage apiError={apiError} setApiError={setApiError} />
                    )
                }
            />
            <Route
                path="/order-history"
                element={
                    currentUser ? (
                        <OrderHistoryPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                    ) : (
                        <Navigate to="/login" state={{ from: '/order-history' }} replace /> // Redirect to login if not authenticated
                    )
                }
             />
            <Route
                path="/item/:id"
                element={<ProductDetailPage onAddToCart={handleAddToCart} currentUser={currentUser} />} // Pass addToCart and currentUser
            />
            {/* Catch-all Route */}
            <Route path="*" element={<h2>404 Page Not Found</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
