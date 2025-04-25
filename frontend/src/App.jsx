// --- App.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate, useLocation } from 'react-router-dom'; // Added useLocation
import { motion, AnimatePresence } from 'framer-motion'; // Added framer-motion imports
import Navigation from './components/Navigation.jsx';
import HomePage from './pages/HomePage.jsx';
import CartPage from './pages/CartPage.jsx';
import NewItemPage from './pages/NewItemPage.jsx';
import StockUpdatePage from './pages/StockUpdatePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';
import EditHistoryPage from './pages/EditHistoryPage.jsx';
import SalesHistoryPage from './pages/SalesHistoryPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import DeletedItemsPage from './pages/DeletedItemsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import './App.css'; // Keep global styles, but App wrapper is conditional

const API_BASE_URL = 'http://localhost:3001/api';

// Helper component to handle navigation after login/logout
function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    window.navigate = navigate; // Use with caution, context is better
  }, [navigate]);
  return null;
}

// Define page transition variants outside App component
const pageVariants = {
  initial: {
    opacity: 0,
    x: '-50px' // Start from left (Horizontal only)
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: '50px' // Slide right while fading out
  }
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.35 // Adjusted duration for the combined movement
};


// Main App component needs to be wrapped by Router to use useLocation
function AppContent() {
  const location = useLocation(); // Get location here
  const [groceryItems, setGroceryItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Authentication Functions ---
  const checkSession = useCallback(async () => {
    setAuthLoading(true);
    setApiError(null);
    console.log("Checking session...");
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        console.log("Session active for user:", data.user);
      } else if (response.status === 401) {
        setCurrentUser(null);
        console.log("No active session.");
      } else {
        let errorMsg = `Session check failed: ${response.status}`;
        try { const errData = await response.json(); errorMsg += ` - ${errData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
        throw new Error(errorMsg);
      }
    } catch (e) {
      console.error("Error checking session:", e);
      setApiError(`Error checking session: ${e.message}`);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    if (window.navigate) window.navigate('/');
  };

  const handleLogout = async () => {
    setApiError(null);
    console.log("Attempting logout...");
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
      if (!response.ok) {
        let errorMsg = `Logout failed: ${response.status}`;
        try { const errData = await response.json(); errorMsg += ` - ${errData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
        throw new Error(errorMsg);
      }
      setCurrentUser(null);
      setCartItems([]);
      console.log("Logout successful.");
      // Redirect to landing page after logout, not login
      if (window.navigate) window.navigate('/');
    } catch (e) {
      console.error("Error logging out:", e);
      setApiError(`Logout failed: ${e.message}`);
      setCurrentUser(null);
      setCartItems([]);
    }
  };

  // --- Item State Update Functions ---
  const handleDeleteItem = (itemIdToDelete) => {
    const itemIdStr = itemIdToDelete.toString();
    setGroceryItems(prevItems => prevItems.filter(item => item.id.toString() !== itemIdStr));
    console.log(`Removed item ${itemIdStr} from frontend state.`);
  };

  const handleUpdateItem = (updatedItem) => {
    const updatedItemStrId = { ...updatedItem, id: updatedItem.id.toString() };
    setGroceryItems(prevItems => prevItems.map(item => item.id.toString() === updatedItemStrId.id ? updatedItemStrId : item));
    console.log(`Updated item ${updatedItemStrId.id} in frontend state.`);
  };

  const handleItemRestored = (restoredItem) => {
    const restoredItemStrId = { ...restoredItem, id: restoredItem.id.toString() };
    setGroceryItems(prevItems => {
      if (prevItems.some(item => item.id.toString() === restoredItemStrId.id)) return prevItems;
      return [...prevItems, restoredItemStrId];
    });
    console.log(`Added restored item ${restoredItemStrId.id} back to frontend state.`);
  };

  // --- Data Fetching ---
  const fetchGroceries = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    console.log("Fetching groceries from:", `${API_BASE_URL}/groceries`);
    try {
      const response = await fetch(`${API_BASE_URL}/groceries`);
      if (!response.ok) {
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try { const errData = await response.json(); errorMsg += ` - ${errData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
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
  }, []);

  useEffect(() => {
    checkSession();
    fetchGroceries();
  }, [checkSession, fetchGroceries]);

  // --- Cart Management ---
  const handleAddToCart = (itemToAdd, quantityToAdd = 1) => {
    const currentItemState = groceryItems.find(item => item.id.toString() === itemToAdd.id.toString());
    if (!currentItemState) { alert(`${itemToAdd.name} is currently unavailable or not found.`); return; }
    if (currentItemState.quantityAvailable <= 0) { alert(`Sorry, ${itemToAdd.name} is currently out of stock.`); return; }
    if (quantityToAdd > currentItemState.quantityAvailable) { alert(`Cannot add ${quantityToAdd} ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} available.`); return; }

    setCartItems(prevCartItems => {
      const existingCartItem = prevCartItems.find(item => item.id.toString() === itemToAdd.id.toString());
      if (existingCartItem) {
        const potentialNewQuantityInCart = existingCartItem.quantity + quantityToAdd;
        if (potentialNewQuantityInCart > currentItemState.quantityAvailable) {
          const canAdd = currentItemState.quantityAvailable - existingCartItem.quantity;
          alert(`Cannot add ${quantityToAdd} more ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} total available, ${canAdd > 0 ? `you can add ${canAdd} more.` : 'you have the maximum.'}`);
          return prevCartItems;
        }
        return prevCartItems.map(item => item.id.toString() === itemToAdd.id.toString() ? { ...item, quantity: potentialNewQuantityInCart } : item);
      } else {
        return [...prevCartItems, { ...itemToAdd, id: itemToAdd.id.toString(), quantity: Math.max(1, quantityToAdd) }];
      }
    });
  };

  const handleIncreaseQuantity = (itemId) => {
    const itemIdStr = itemId.toString();
    const currentItemState = groceryItems.find(item => item.id.toString() === itemIdStr);
    const cartItem = cartItems.find(item => item.id.toString() === itemIdStr);
    if (!currentItemState) { alert("Item data not found."); return; }
    if (!cartItem) return;
    if (cartItem.quantity + 1 > currentItemState.quantityAvailable) { alert(`Cannot add more ${currentItemState.name}. Only ${currentItemState.quantityAvailable} available.`); return; }
    setCartItems(prevCartItems => prevCartItems.map(item => item.id.toString() === itemIdStr ? { ...item, quantity: item.quantity + 1 } : item));
  };

  const handleDecreaseQuantity = (itemId) => {
    const itemIdStr = itemId.toString();
    setCartItems(prevCartItems => {
      const itemIndex = prevCartItems.findIndex(item => item.id.toString() === itemIdStr);
      if (itemIndex === -1) return prevCartItems;
      const currentItem = prevCartItems[itemIndex];
      if (currentItem.quantity > 1) {
        return prevCartItems.map(item => item.id.toString() === itemIdStr ? { ...item, quantity: item.quantity - 1 } : item);
      } else {
        return prevCartItems.filter(item => item.id.toString() !== itemIdStr);
      }
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(prevCartItems => prevCartItems.filter(item => item.id.toString() !== itemId.toString()));
  };

  // --- API Interactions ---
  const handleAddItem = async (newItemData) => {
    console.log("Attempting to add item via API:", newItemData);
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/groceries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemData),
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        alert("Authentication required or insufficient permissions. Please log in as an owner.");
        if (window.navigate) window.navigate('/login'); return false;
      }
      if (!response.ok) {
        let errorMsg = `Failed to add item: ${response.status}`;
        try { const errorData = await response.json(); errorMsg += ` - ${errorData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
        throw new Error(errorMsg);
      }
      const addedItem = await response.json();
      setGroceryItems(prevItems => [...prevItems, { ...addedItem, id: addedItem.id.toString() }]);
      alert(`${addedItem.name} added successfully!`);
      return true;
    } catch (e) {
      console.error("Error adding item:", e); setApiError(`Error adding item: ${e.message}`); alert(`Error adding item: ${e.message}`); return false;
    }
  };

  const handleBuy = async () => {
    if (cartItems.length === 0) { alert("Your cart is empty."); return; }
    if (!currentUser) { alert("Please log in to complete your purchase."); if (window.navigate) window.navigate('/login'); return; }
    setApiError(null); setLoading(true);
    console.log(`User ${currentUser.username} attempting to buy items:`, cartItems);
    try {
      const response = await fetch(`${API_BASE_URL}/buy`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartItems.map(item => ({ id: item.id, quantity: item.quantity, price: item.price, name: item.name }))),
      });
      if (response.status === 401) {
        alert("Your session may have expired. Please log in again."); setCurrentUser(null); setCartItems([]); if (window.navigate) window.navigate('/login'); return;
      }
      if (!response.ok && response.status !== 207) {
        let errorMsg = `Purchase failed: ${response.status}`;
        try { const errorData = await response.json(); errorMsg += ` - ${errorData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
        throw new Error(errorMsg);
      }
      const result = await response.json(); console.log("Purchase/Order response:", result);
      setCartItems([]); await fetchGroceries();
      if (response.status === 207) { alert(`Warning: ${result.message}`); } else { alert("Purchase successful! Your order has been recorded."); if (window.navigate) window.navigate('/order-history'); }
    } catch (e) {
      console.error("Error during purchase/order saving:", e); setApiError(`Purchase failed: ${e.message}`); alert(`Purchase failed: ${e.message}`);
    } finally { setLoading(false); }
  };

  const handleStockUpdate = async (itemId, quantityChange, onSuccess) => {
    setApiError(null); setLoading(true); const itemIdStr = itemId.toString();
    console.log(`Attempting to update stock for item ID ${itemIdStr} by ${quantityChange}`);
    try {
      const response = await fetch(`${API_BASE_URL}/groceries/${itemIdStr}/stock`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityChange: quantityChange }),
      });
      if (response.status === 401 || response.status === 403) {
        alert("Authentication required or insufficient permissions. Please log in as an owner."); if (window.navigate) window.navigate('/login'); return;
      }
      if (!response.ok) {
        let errorMsg = `Stock update failed: ${response.status}`;
        try { const errorData = await response.json(); errorMsg += ` - ${errorData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${response.statusText}`; }
        throw new Error(errorMsg);
      }
      const updatedItem = await response.json(); console.log("Stock update successful:", updatedItem);
      const updatedItemStrId = { ...updatedItem, id: updatedItem.id.toString() };
      setGroceryItems(prevItems => prevItems.map(item => item.id.toString() === updatedItemStrId.id ? updatedItemStrId : item));
      alert(`Stock for ${updatedItem.name} updated successfully! New quantity: ${updatedItem.quantityAvailable}`);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Error updating stock:", e); const userMessage = `Error updating stock: ${e.message}`; setApiError(userMessage); alert(userMessage);
    } finally { setLoading(false); }
  };

  // --- Render Logic ---
  if (authLoading) {
    return <div className="loading-message">Checking login status...</div>; // This is outside the Router, so location isn't available yet
  }

  // Determine if the layout needs the main App wrapper (for logged-in state)
  const needsAppWrapper = !!currentUser;

  return (
    <> {/* Use Fragment to avoid extra div */}
      {needsAppWrapper ? (
        // Logged-in state: Render with Navigation and main App wrapper
        <div className="App">
          <Navigation
            cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          {/* Remove perspective style */}
          <main>
            {apiError && !loading && <p className="error-message main-error">{apiError}</p>}
            <AnimatePresence mode="wait"> {/* Added AnimatePresence */}
              <Routes location={location} key={location.pathname}> {/* Added key={location.pathname} */}
                {/* --- Logged-in Routes --- */}
                <Route path="/" element={
                  <motion.div key="home" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <HomePage items={groceryItems} onAddToCart={handleAddToCart} loading={loading || authLoading} currentUser={currentUser} onDeleteItem={handleDeleteItem} onUpdateItem={handleUpdateItem} />
                  </motion.div>
                } />
                <Route path="/cart" element={
                  <motion.div key="cart" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <CartPage cartItems={cartItems} onIncrease={handleIncreaseQuantity} onDecrease={handleDecreaseQuantity} onRemove={handleRemoveFromCart} onBuy={handleBuy} groceryItems={groceryItems} currentUser={currentUser} />
                  </motion.div>
                 } />
              <Route path="/add-item" element={ currentUser.type === 'owner' ? (
                  <motion.div key="add-item" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <NewItemPage onAddItem={handleAddItem} apiError={apiError} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/update-stock" element={ currentUser.type === 'owner' ? (
                  <motion.div key="update-stock" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <StockUpdatePage groceries={groceryItems} onUpdateStock={handleStockUpdate} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/edit-history" element={ currentUser.type === 'owner' ? (
                  <motion.div key="edit-history" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <EditHistoryPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/sales-history" element={ currentUser.type === 'owner' ? (
                  <motion.div key="sales-history" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <SalesHistoryPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/user-management" element={ currentUser.type === 'owner' ? (
                  <motion.div key="user-management" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <UserManagementPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/deleted-items" element={ currentUser.type === 'owner' ? (
                  <motion.div key="deleted-items" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <DeletedItemsPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} onItemRestored={handleItemRestored} />
                  </motion.div>
                ) : <Navigate to="/" state={{ message: "Access denied: Owners only." }} replace /> } />
              <Route path="/order-history" element={
                  <motion.div key="order-history" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <OrderHistoryPage currentUser={currentUser} apiError={apiError} setApiError={setApiError} />
                  </motion.div>
                } />
              <Route path="/item/:id" element={
                  <motion.div key={`item-${location.pathname}`} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <ProductDetailPage onAddToCart={handleAddToCart} currentUser={currentUser} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} onUpdateStock={handleStockUpdate} />
                  </motion.div>
                } />
              <Route path="/change-password" element={
                  <motion.div key="change-password" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <ChangePasswordPage />
                  </motion.div>
                } />

              {/* Redirect logged-in users away from auth pages */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<Navigate to="/" replace />} />

              {/* Catch-all for logged-in state */}
                <Route path="*" element={
                  <motion.div key="not-found" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                    <h2>404 Page Not Found</h2>
                  </motion.div>
                } />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      ) : (
        // Logged-out state: Render without the main App wrapper
        // Apply similar motion wrapper if animations are desired here too
        <AnimatePresence mode="wait"> {/* Added AnimatePresence */}
          <Routes location={location} key={location.pathname}> {/* Added key={location.pathname} */}
             <Route path="/" element={
               <LandingPage />
             } />
             <Route path="/login" element={
               <motion.div key="login" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                 <LoginPage onLogin={handleLogin} apiError={apiError} setApiError={setApiError} />
               </motion.div>
             } />
             <Route path="/register" element={
               <motion.div key="register" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                 <RegisterPage apiError={apiError} setApiError={setApiError} />
               </motion.div>
             } />
             <Route path="/forgot-password" element={
               <motion.div key="forgot-password" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {/* Added motion.div */}
                 <ForgotPasswordPage />
               </motion.div>
             } />
             {/* Redirect any other path to landing page if not logged in */}
             <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      )}
    </>
  );
}

// Wrap AppContent with Router
function App() {
  return (
    <Router>
      <NavigateSetter />
      <AppContent /> {/* Render the component that uses useLocation */}
    </Router>
  );
}


export default App;
