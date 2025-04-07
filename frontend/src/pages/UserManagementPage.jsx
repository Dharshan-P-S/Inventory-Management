import React, { useState, useEffect, useCallback } from 'react';
import '../App.css'; // Assuming shared styles

const API_BASE_URL = 'http://localhost:3001/api';

function UserManagementPage({ currentUser, apiError, setApiError }) {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Track loading state for approve/reject actions

  const fetchUsers = useCallback(async () => {
    if (!currentUser || currentUser.type !== 'owner') {
      setApiError('Access denied. Only owners can view user management.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError(null);
    console.log("Fetching user lists...");

    try {
      // Fetch both approved and pending users in parallel
      const [usersResponse, pendingResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/users`, {
          method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' },
        }),
        fetch(`${API_BASE_URL}/pending-users`, {
          method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' },
        })
      ]);

      // Handle errors for users fetch
      if (usersResponse.status === 401 || usersResponse.status === 403) throw new Error('Unauthorized to fetch users.');
      if (!usersResponse.ok) {
        let errorMsg = `Failed to fetch users: ${usersResponse.status}`;
        try { const errData = await usersResponse.json(); errorMsg += ` - ${errData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${usersResponse.statusText}`; }
        throw new Error(errorMsg);
      }

      // Handle errors for pending users fetch
      if (pendingResponse.status === 401 || pendingResponse.status === 403) throw new Error('Unauthorized to fetch pending users.');
      if (!pendingResponse.ok) {
        let errorMsg = `Failed to fetch pending users: ${pendingResponse.status}`;
        try { const errData = await pendingResponse.json(); errorMsg += ` - ${errData.message || 'Unknown server error'}`; } catch { errorMsg += ` - ${pendingResponse.statusText}`; }
        throw new Error(errorMsg);
      }

      const usersData = await usersResponse.json();
      const pendingData = await pendingResponse.json();

      setUsers(usersData);
      setPendingUsers(pendingData);

    } catch (e) {
      console.error("Error fetching users:", e);
      setApiError(`Error fetching users: ${e.message}`);
      setUsers([]); // Clear data on error
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, setApiError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Depend on the memoized fetch function

  // --- Action Handlers ---
  const handleApprove = async (userIdToApprove) => {
    setActionLoading(userIdToApprove); // Set loading state for this specific user
    setApiError(null);
    console.log(`Attempting to approve user: ${userIdToApprove}`);
    try {
      const response = await fetch(`${API_BASE_URL}/approve-user/${userIdToApprove}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Approval failed: ${response.status}`);
      }
      alert(data.message || 'User approved successfully!');
      fetchUsers(); // Refresh both lists after action
    } catch (error) {
      console.error('Approval error:', error);
      setApiError(`Approval failed: ${error.message}`);
    } finally {
      setActionLoading(null); // Clear loading state
    }
  };

  const handleReject = async (userIdToReject) => {
    if (!window.confirm('Are you sure you want to reject and delete this pending user? This cannot be undone.')) {
      return;
    }
    setActionLoading(userIdToReject); // Set loading state
    setApiError(null);
    console.log(`Attempting to reject user: ${userIdToReject}`);
    try {
      const response = await fetch(`${API_BASE_URL}/reject-user/${userIdToReject}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Rejection failed: ${response.status}`);
      }
      alert(data.message || 'User rejected successfully!');
      fetchUsers(); // Refresh both lists
    } catch (error) {
      console.error('Rejection error:', error);
      setApiError(`Rejection failed: ${error.message}`);
    } finally {
      setActionLoading(null); // Clear loading state
    }
  };

  // --- Group Approved Users by Type ---
  const groupedUsers = users.reduce((acc, user) => {
    const type = user.type || 'unknown'; // Handle cases where type might be missing
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(user);
    return acc;
  }, {});

  // Define the order of types to display
  const userTypesInOrder = ['owner', 'customer']; // Add other types if they exist

  if (loading) return <p className="loading-message">Loading users...</p>;
  // Display API error if it exists, even if there's data
  // if (apiError) return <p className="error-message api-error">{apiError}</p>;

  return (
    <div className="page-container user-management-page">
      <h2>User Management</h2>

      {/* Display API Error if any */}
      {apiError && <p className="error-message api-error">{apiError}</p>}

      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <section className="pending-users-section">
          <h3>Pending Owner Approvals</h3>
          <table className="user-table pending-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Type</th> {/* Added Type column header */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.type}</td> {/* Display user type */}
                  <td className="action-cell">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="button button-success button-sm"
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      className="button button-danger button-sm"
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? 'Processing...' : 'Reject'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

       {/* Approved Users Section */}
       <section className="approved-users-section">
         <h3>Approved Users</h3>
         {users.length === 0 ? (
           <p>No approved users found.</p>
         ) : (
           // Iterate over the defined order of user types
           userTypesInOrder.map(type => (
             // Check if there are users of this type
             groupedUsers[type] && groupedUsers[type].length > 0 && (
               <div key={type} className="user-group">
                 {/* Category Heading */}
                 <h4 className="user-type-heading">{type.charAt(0).toUpperCase() + type.slice(1)}s</h4>
                 <table className="user-table">
                   <thead>
                     <tr>
                       <th>User ID</th>
                       <th>Username</th>
                       <th>Email</th>
                       {/* Type column might be redundant now, but keep for consistency or remove */}
                       {/* <th>Type</th> */}
                       {/* Add Actions column if needed later */}
                     </tr>
                   </thead>
                   <tbody>
                     {/* Map users within this specific type group */}
                     {groupedUsers[type].map((user) => (
                       <tr key={user.id}>
                         <td>{user.id}</td>
                         <td>{user.username}</td>
                         <td>{user.email}</td>
                         {/* <td>{user.type}</td> */}
                         {/* Add action cell if needed */}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )
           ))
         )}
         {/* Handle users with 'unknown' type if necessary */}
         {groupedUsers['unknown'] && groupedUsers['unknown'].length > 0 && (
            <div key="unknown" className="user-group">
              <h4 className="user-type-heading">Unknown Type</h4>
              {/* Render table for unknown users similarly */}
              <table className="user-table">
                {/* ... table structure ... */}
                <tbody>
                  {groupedUsers['unknown'].map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.type || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         )}
       </section>
    </div>
  );
}

export default UserManagementPage;
