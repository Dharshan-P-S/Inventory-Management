import React from 'react';
import { NavLink } from 'react-router-dom';

function Navigation({ cartItemCount = 0, currentUser, onLogout }) {

  const handleLogoutClick = (e) => {
    e.preventDefault(); // Prevent default link behavior if wrapped in <a> or NavLink
    e.stopPropagation();
    onLogout(); // Call the logout handler passed from App.jsx
  };

  return (
    <nav className="main-nav">
      <ul>
        <li><NavLink to="/" end onClick={(e) => e.stopPropagation()}>Grocery List</NavLink></li>
        {/* Owner Links */}
        {currentUser && currentUser.type === 'owner' && (
          <>
            <li><NavLink to="/add-item" onClick={(e) => e.stopPropagation()}>Add New Item</NavLink></li>
            <li><NavLink to="/inventory-history" onClick={(e) => e.stopPropagation()}>Inventory History</NavLink></li> {/* Added Inventory History Link */}
            <li><NavLink to="/deleted-items" onClick={(e) => e.stopPropagation()}>Deleted Items</NavLink></li> {/* Added Deleted Items Link */}
          </>
        )}
        {/* Customer Links */}
        {currentUser && currentUser.type === 'customer' && (
          <>
            <li><NavLink to="/order-history" onClick={(e) => e.stopPropagation()}>Order History</NavLink></li>
            <li>
              <NavLink to="/cart" onClick={(e) => e.stopPropagation()}>
                Cart ({cartItemCount}) {/* Display count directly */}
              </NavLink>
            </li>
          </>
        )}
        {/* Cart link for non-logged-in users */}
        {!currentUser && (
           <li>
             <NavLink to="/cart" onClick={(e) => e.stopPropagation()}>
               Cart ({cartItemCount}) {/* Display count directly */}
             </NavLink>
           </li>
        )}
        {/* Conditional rendering for Auth links */}
        {!currentUser ? (
          <>
            <li><NavLink to="/login" onClick={(e) => e.stopPropagation()}>Login</NavLink></li>
            <li><NavLink to="/register" onClick={(e) => e.stopPropagation()}>Register</NavLink></li>
          </>
        ) : (
          <>
            <li className="nav-welcome"><span>Welcome, {currentUser.username}!</span></li>
            <li><button onClick={handleLogoutClick} className="logout-button">Logout</button></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navigation;
