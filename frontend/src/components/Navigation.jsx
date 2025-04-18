import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

function Navigation({ cartItemCount = 0, currentUser, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref for dropdown container

  const handleLogoutClick = (e) => {
    e.preventDefault(); // Prevent default link behavior if wrapped in <a> or NavLink
    e.stopPropagation();
    onLogout(); // Call the logout handler passed from App.jsx
  };

  const toggleDropdown = (e) => {
    e.stopPropagation(); // Prevent triggering other clicks
    setIsDropdownOpen(prev => !prev);
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown when navigating away (clicking a link inside)
  const handleDropdownLinkClick = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
  };


  return (
    <nav className="main-nav">
      <ul>
        <li><NavLink to="/" end onClick={(e) => e.stopPropagation()}>Grocery List</NavLink></li>
        {/* Owner Links */}
        {currentUser && currentUser.type === 'owner' && (
          <>
            <li><NavLink to="/add-item" onClick={(e) => e.stopPropagation()}>Add Item</NavLink></li>
            <li><NavLink to="/user-management" onClick={(e) => e.stopPropagation()}>User Management</NavLink></li>
            {/* Dropdown */}
            <li className={`nav-dropdown ${isDropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
              <button onClick={toggleDropdown} className="dropdown-toggle" aria-haspopup="true" aria-expanded={isDropdownOpen}>
                Reports & History {isDropdownOpen ? '▲' : '▼'}
              </button>
              {isDropdownOpen && (
                <ul className="dropdown-menu">
                  <li><NavLink to="/edit-history" onClick={handleDropdownLinkClick}>Edit History</NavLink></li>
                  <li><NavLink to="/sales-history" onClick={handleDropdownLinkClick}>Sales History</NavLink></li>
                  <li><NavLink to="/deleted-items" onClick={handleDropdownLinkClick}>Deleted Items</NavLink></li>
                </ul>
              )}
            </li>
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
            <li><NavLink to="/change-password" onClick={(e) => e.stopPropagation()}>Change Password</NavLink></li> {/* Added Change Password Link */}
            <li className="nav-welcome"><span>Welcome, {currentUser.username}!</span></li>
            <li><button onClick={handleLogoutClick} className="logout-button">Logout</button></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navigation;
