import React from 'react';
// Import NavLink instead of Link
import { NavLink } from 'react-router-dom';

function Navigation({ cartItemCount = 0 }) {
  return (
    <nav className="main-nav">
      <ul>
        {/* Use NavLink for automatic 'active' class */}
        <li><NavLink to="/" end>Grocery List</NavLink></li>
        <li><NavLink to="/add-item">Add New Item</NavLink></li>
        <li>
          <NavLink to="/cart">
            Cart
            {cartItemCount > 0 && <span className="cart-count">{cartItemCount}</span>}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;