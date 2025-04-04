import React from 'react';
import { NavLink } from 'react-router-dom';

function Navigation({ cartItemCount = 0 }) {
  return (
    <nav className="main-nav">
      <ul>
        {/* Add onClick handler to prevent default behavior */}
        <li><NavLink to="/" end onClick={(e) => e.stopPropagation()}>Grocery List</NavLink></li>
        <li><NavLink to="/add-item" onClick={(e) => e.stopPropagation()}>Add New Item</NavLink></li>
        <li><NavLink to="/update-stock" onClick={(e) => e.stopPropagation()}>Update Stock</NavLink></li>
        <li>
          <NavLink to="/cart" onClick={(e) => e.stopPropagation()}>
            Cart
            {cartItemCount > 0 && <span className="cart-count">{cartItemCount}</span>}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;