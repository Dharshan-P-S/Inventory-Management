// --- App.jsx ---
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navigation from './components/Navigation.jsx'; // Ensure .jsx extension
import HomePage from './pages/HomePage.jsx';       // Ensure .jsx extension
import CartPage from './pages/CartPage.jsx';         // Ensure .jsx extension
import NewItemPage from './pages/NewItemPage.jsx';   // Ensure .jsx extension
import StockUpdatePage from './pages/StockUpdatePage.jsx'; // Ensure .jsx extension
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [groceryItems, setGroceryItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // --- Fetch Data (useEffect remains the same) ---
  useEffect(() => {
    // ... (fetch logic as before) ...
    const fetchGroceries = async () => {
      setLoading(true);
      setApiError(null);
      console.log("Fetching groceries from:", `${API_BASE_URL}/groceries`);
      try {
        const response = await fetch(`${API_BASE_URL}/groceries`);
        if (!response.ok) {
          let errorMsg = `HTTP error! Status: ${response.status}`;
          try {
              const errData = await response.json();
              errorMsg += ` - ${errData.message || 'Unknown server error'}`;
          } catch { // Remove unused parameter
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
    };

    fetchGroceries();
  }, []);


  // --- Updated Cart Management ---
  // handleAddToCart now accepts quantityToAdd (defaulting to 1 if not provided for backward compatibility, though not needed with current GroceryItem)
  const handleAddToCart = (itemToAdd, quantityToAdd = 1) => {
     // --- Get current stock info ---
     const currentItemState = groceryItems.find(item => item.id === itemToAdd.id);

     // --- Initial Checks ---
     if (!currentItemState) {
        alert(`${itemToAdd.name} is currently unavailable or not found. Please refresh.`);
        return;
     }
     if (currentItemState.quantityAvailable <= 0) {
         alert(`Sorry, ${itemToAdd.name} is currently out of stock.`);
         return;
     }
    // Check if requested quantity exceeds available stock
     if (quantityToAdd > currentItemState.quantityAvailable) {
        alert(`Cannot add ${quantityToAdd} ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} available.`);
        return;
     }


    setCartItems(prevCartItems => {
      const existingCartItem = prevCartItems.find(item => item.id === itemToAdd.id);

      if (existingCartItem) {
        // --- Calculate potential new quantity in cart ---
        const potentialNewQuantityInCart = existingCartItem.quantity + quantityToAdd;

        // --- Check if adding exceeds total available stock ---
        if (potentialNewQuantityInCart > currentItemState.quantityAvailable) {
           const canAdd = currentItemState.quantityAvailable - existingCartItem.quantity;
           if (canAdd > 0) {
              alert(`Cannot add ${quantityToAdd} more ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} total available, and you already have ${existingCartItem.quantity} in your cart. You can add ${canAdd} more.`);
           } else {
              alert(`Cannot add more ${itemToAdd.name}. Only ${currentItemState.quantityAvailable} total available, and you already have ${existingCartItem.quantity} in your cart.`);
           }
           return prevCartItems; // Return previous state without changes
        }

        // --- Update quantity if stock permits ---
        return prevCartItems.map(item =>
          item.id === itemToAdd.id
            ? { ...item, quantity: potentialNewQuantityInCart }
            : item
        );
      } else {
        // --- Add new item to cart (stock already checked above) ---
        // Ensure quantityToAdd is at least 1 (should be guaranteed by GroceryItem)
        const actualQuantity = Math.max(1, quantityToAdd);
        return [...prevCartItems, { ...itemToAdd, quantity: actualQuantity }];
      }
    });
  };

  // handleIncreaseQuantity only increases by 1, so it can stay mostly the same
  // but it should still check against quantityAvailable
  const handleIncreaseQuantity = (itemId) => {
    const currentItemState = groceryItems.find(item => item.id === itemId);
    const cartItem = cartItems.find(item => item.id === itemId);

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
        item.id === itemId ? { ...item, quantity: potentialNewQuantity } : item
      )
    );
  };


  // handleDecreaseQuantity remains the same
  const handleDecreaseQuantity = (itemId) => {
    // ... (no changes needed here) ...
     setCartItems(prevCartItems => {
       const itemIndex = prevCartItems.findIndex(item => item.id === itemId);
       if (itemIndex === -1) return prevCartItems; // Item not found

       const currentItem = prevCartItems[itemIndex];

       if (currentItem.quantity > 1) {
         return prevCartItems.map(item =>
           item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
         );
       } else {
         // Remove item if quantity is 1
         return prevCartItems.filter(item => item.id !== itemId);
       }
     });
  };

  // handleRemoveFromCart remains the same
  const handleRemoveFromCart = (itemId) => {
    // ... (no changes needed here) ...
    setCartItems(prevCartItems => prevCartItems.filter(item => item.id !== itemId));
  };

  // handleAddItem (for adding new items via form) remains the same
  const handleAddItem = async (newItemData) => {
    // ... (no changes needed here) ...
    console.log("Attempting to add item via API:", newItemData);
    setApiError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/groceries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItemData),
      });

      if (!response.ok) {
        let errorMsg = `Failed to add item: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.message || 'Unknown server error'}`;
        } catch { // Remove unused parameter
             errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const addedItem = await response.json();

      setGroceryItems(prevItems => [...prevItems, addedItem]);

      alert(`${addedItem.name} added successfully!`);
      return true;

    } catch (e) {
      console.error("Error adding item:", e);
      setApiError(`Error adding item: ${e.message}`);
      alert(`Error adding item: ${e.message}`);
      return false;
    }
  };

  // --- Handle Buy ---
  const handleBuy = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setApiError(null); // Clear previous errors
    setLoading(true); // Indicate processing

    console.log("Attempting to buy items:", cartItems);

    try {
      const response = await fetch(`${API_BASE_URL}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send only necessary info: id and quantity bought
        body: JSON.stringify(cartItems.map(item => ({ id: item.id, quantity: item.quantity }))),
      });

      if (!response.ok) {
        let errorMsg = `Purchase failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.message || 'Unknown server error'}`;
        } catch { // Remove unused parameter
             errorMsg += ` - ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("Purchase successful:", result);

      // Clear the cart on successful purchase
      setCartItems([]);

      // Refresh grocery list to show updated stock
      // Re-fetch all groceries to get the latest stock counts
      const fetchResponse = await fetch(`${API_BASE_URL}/groceries`);
       if (!fetchResponse.ok) throw new Error(`Failed to refresh groceries: ${fetchResponse.status}`);
       const updatedGroceries = await fetchResponse.json();
       setGroceryItems(updatedGroceries);


      alert("Purchase successful! Your cart is cleared and stock updated.");

    } catch (e) {
      console.error("Error during purchase:", e);
      setApiError(`Purchase failed: ${e.message}`);
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  // --- Handle Stock Update ---
  const handleStockUpdate = async (itemId, quantityToAdd, onSuccess) => {
    // For now, just update the local state
    setGroceryItems(prevItems =>
      prevItems.map(item =>
        item.id === parseInt(itemId)
          ? { ...item, quantityAvailable: item.quantityAvailable + quantityToAdd }
          : item
      )
    );
    alert('Stock updated successfully!');
    if (onSuccess) onSuccess(); // Call the success callback to reset form state
  };

  // --- Render Logic ---
  return (
    <Router>
      <div className="App">
        <Navigation cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} />
        <main>
           {apiError && !loading && <p className="error-message main-error">{apiError}</p>}
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  items={groceryItems}
                  // Pass the updated handler
                  onAddToCart={handleAddToCart}
                  loading={loading}
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
                  onBuy={handleBuy} // Pass the new handler
                  // Optionally pass groceryItems if CartPage needs stock info for display
                   groceryItems={groceryItems}
                />
              }
            />
            <Route
              path="/add-item"
              element={
                <NewItemPage onAddItem={handleAddItem} apiError={apiError} />
              }
            />
            <Route
              path="/update-stock"
              element={
                <StockUpdatePage
                  groceries={groceryItems}
                  onUpdateStock={handleStockUpdate}
                />
              }
            />
            <Route path="*" element={<h2>404 Page Not Found</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
