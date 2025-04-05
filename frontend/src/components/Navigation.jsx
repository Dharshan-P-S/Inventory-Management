import React from 'react';
import { NavLink } from 'react-router-dom';

// TODO: Accept user/auth state as prop later
function Navigation({ cartItemCount = 0 }) {
  // TODO: Conditionally render links based on auth state
  const isLoggedIn = false; // Placeholder

  return (
    <nav className="main-nav">
      <ul>
        <li><NavLink to="/" end onClick={(e) => e.stopPropagation()}>Grocery List</NavLink></li>
        <li><NavLink to="/add-item" onClick={(e) => e.stopPropagation()}>Add New Item</NavLink></li>
        <li><NavLink to="/update-stock" onClick={(e) => e.stopPropagation()}>Update Stock</NavLink></li>
        <li><NavLink to="/order-history" onClick={(e) => e.stopPropagation()}>Order History</NavLink></li>
        <li>
          <NavLink to="/cart" onClick={(e) => e.stopPropagation()}>
            Cart
            {cartItemCount > 0 && <span className="cart-count">{cartItemCount}</span>}
          </NavLink>
        </li>
        {/* TODO: Add conditional rendering for Auth links */}
        {!isLoggedIn && (
          <>
            <li><NavLink to="/login" onClick={(e) => e.stopPropagation()}>Login</NavLink></li>
            <li><NavLink to="/register" onClick={(e) => e.stopPropagation()}>Register</NavLink></li>
          </>
        )}
        {/* {isLoggedIn && (
          <>
            <li><span>Welcome, User!</span></li> // Placeholder
            <li><button onClick={handleLogout}>Logout</button></li> // Placeholder
          </>
        )} */}
      </ul>
    </nav>
  );
}

export default Navigation;