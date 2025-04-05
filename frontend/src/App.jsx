// --- App.jsx ---
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navigation from './components/Navigation.jsx'; // Ensure .jsx extension
import HomePage from './pages/HomePage.jsx';       // Ensure .jsx extension
import CartPage from './pages/CartPage.jsx';         // Ensure .jsx extension
import NewItemPage from './pages/NewItemPage.jsx';   // Ensure .jsx extension
import StockUpdatePage from './pages/StockUpdatePage.jsx'; // Ensure .jsx extension
import LoginPage from './pages/LoginPage.jsx'; // Import LoginPage
import RegisterPage from './pages/RegisterPage.jsx'; // Import RegisterPage
import OrderHistoryPage from './pages/OrderHistoryPage.jsx'; // Import OrderHistoryPage
import ProductDetailPage from './pages/ProductDetailPage.jsx'; // Import ProductDetailPage
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [groceryItems, setGroceryItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
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
    };

    fetchGroceries();
  }, []);

  const handleAddToCart = (itemToAdd, quantityToAdd = 1) => {
     const currentItemState = groceryItems.find(item => item.id === itemToAdd.id);

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
      const existingCartItem = prevCartItems.find(item => item.id === itemToAdd.id);

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
          item.id === itemToAdd.id
            ? { ...item, quantity: potentialNewQuantityInCart }
            : item
        );
      } else {
        const actualQuantity = Math.max(1, quantityToAdd);
        return [...prevCartItems, { ...itemToAdd, quantity: actualQuantity }];
      }
    });
  };

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

  const handleDecreaseQuantity = (itemId) => {
     setCartItems(prevCartItems => {
       const itemIndex = prevCartItems.findIndex(item => item.id === itemId);
       if (itemIndex === -1) return prevCartItems;

       const currentItem = prevCartItems[itemIndex];

       if (currentItem.quantity > 1) {
         return prevCartItems.map(item =>
           item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
         );
       } else {
         return prevCartItems.filter(item => item.id !== itemId);
       }
     });
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(prevCartItems => prevCartItems.filter(item => item.id !== itemId));
  };

  const handleAddItem = async (newItemData) => {
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
        } catch {
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

  const handleBuy = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setApiError(null);
    setLoading(true);

    console.log("Attempting to buy items:", cartItems);

    try {
      const response = await fetch(`${API_BASE_URL}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name
        }))),
      });

      if (!response.ok && response.status !== 207) {
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

      setCartItems([]);

      const fetchResponse = await fetch(`${API_BASE_URL}/groceries`);
       if (!fetchResponse.ok) throw new Error(`Failed to refresh groceries: ${fetchResponse.status}`);
       const updatedGroceries = await fetchResponse.json();
       setGroceryItems(updatedGroceries);

      if (response.status === 207) {
          alert(`Warning: ${result.message}`);
      } else {
          alert("Purchase successful! Your order has been recorded.");
      }

    } catch (e) {
      console.error("Error during purchase/order saving:", e);
      setApiError(`Purchase failed: ${e.message}`);
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (itemId, quantityChange, onSuccess) => {
    setApiError(null);
    setLoading(true);
    const numericItemId = parseInt(itemId, 10);

    console.log(`Attempting to update stock for item ID ${numericItemId} by ${quantityChange}`);

    try {
      const response = await fetch(`${API_BASE_URL}/groceries/${numericItemId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantityChange: quantityChange }),
      });

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

      setGroceryItems(prevItems =>
        prevItems.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      alert(`Stock for ${updatedItem.name} updated successfully! New quantity: ${updatedItem.quantityAvailable}`);
      if (onSuccess) onSuccess();

    } catch (e) {
      console.error("Error updating stock:", e);
      const userMessage = `Error updating stock: ${e.message}`;
      setApiError(userMessage);
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

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
                  onBuy={handleBuy}
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/order-history" element={<OrderHistoryPage />} />
            <Route path="/item/:id" element={<ProductDetailPage />} />
            <Route path="*" element={<h2>404 Page Not Found</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
