import React, { useState, useEffect, useCallback } from 'react';
import '../App.css'; // Assuming shared styles

const API_BASE_URL = 'http://localhost:3001/api';

function UserManagementPage({ currentUser, apiError, setApiError }) {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Track loading state for approve/reject/remove/save actions
  // const [editLoading, setEditLoading] = useState(null); // Replaced by editingUserId state
  const [editingUserId, setEditingUserId] = useState(null); // ID of the user being edited
  const [editFormData, setEditFormData] = useState({ username: '', email: '' }); // Form data for editing

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

  // --- Edit User Handlers ---

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditFormData({ username: user.username, email: user.email });
    setActionLoading(null); // Ensure other actions aren't marked as loading
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFormData({ username: '', email: '' });
    setActionLoading(null);
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSaveUser = async (userIdToSave) => {
    setActionLoading(userIdToSave); // Use actionLoading to indicate save in progress
    setApiError(null);
    console.log(`Attempting to save changes for user: ${userIdToSave}`);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userIdToSave}`, { // Assuming PUT /api/users/:id endpoint for updates
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData), // Send updated data
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Save failed: ${response.status}`);
      }
      alert(data.message || 'User updated successfully!');
      setEditingUserId(null); // Exit edit mode
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Save error:', error);
      setApiError(`Save failed: ${error.message}`);
      // Optionally keep edit mode open on error, or close it
      // setEditingUserId(null);
    } finally {
      setActionLoading(null); // Clear loading state
    }
  };

  // --- Remove User Handler ---
  const handleRemoveUser = async (user) => { // Pass the whole user object
    const userTypeDisplay = user.type ? user.type.charAt(0).toUpperCase() + user.type.slice(1) : 'User';
    if (!window.confirm(`Are you sure you want to delete the ${userTypeDisplay} '${user.username}'? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(user.id); // Use actionLoading for remove
    setApiError(null);
    console.log(`Attempting to remove user: ${user.id} (${user.username})`);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, { // Use user.id
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      // Check for different success statuses or no content
      if (response.status === 204) { // No Content success
        alert('User removed successfully!');
      } else {
        const data = await response.json(); // Try parsing JSON for messages
        if (!response.ok) {
          throw new Error(data.message || `Removal failed: ${response.status}`);
        }
        alert(data.message || 'User removed successfully!');
      }
      fetchUsers(); // Refresh user lists
    } catch (error) {
      console.error('Removal error:', error);
      setApiError(`Removal failed: ${error.message}`);
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
              <tr><th>Username</th><th>Email</th><th>Type</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.type}</td>
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
                     <tr><th>User ID</th><th>Username</th><th>Email</th><th>Actions</th></tr>
                   </thead>
                   <tbody>
                     {groupedUsers[type].map((user) => (
                       <tr key={user.id} className={editingUserId === user.id ? 'editing-row' : ''}>
                         <td>{user.id}</td>
                         <td>
                           {editingUserId === user.id ? (
                             <input
                               type="text"
                               name="username"
                               value={editFormData.username}
                               onChange={handleEditFormChange}
                               className="form-input form-input-sm"
                             />
                           ) : (
                             user.username
                           )}
                         </td>
                         <td>
                           {editingUserId === user.id ? (
                             <input
                               type="email"
                               name="email"
                               value={editFormData.email}
                               onChange={handleEditFormChange}
                               className="form-input form-input-sm"
                             />
                           ) : (
                             user.email
                           )}
                         </td>
                         <td className="action-cell">
                           {editingUserId === user.id ? (
                             <>
                               <button
                                 onClick={() => handleSaveUser(user.id)}
                                 className="button button-success button-sm"
                                 disabled={actionLoading === user.id}
                               >
                                 {actionLoading === user.id ? 'Saving...' : 'Save'}
                               </button>
                               <button
                                 onClick={handleCancelEdit}
                                 className="button button-secondary button-sm"
                                 disabled={actionLoading === user.id}
                               >
                                 Cancel
                               </button>
                             </>
                           ) : (
                             <>
                               <button
                                 onClick={() => handleEditUser(user)} // Pass the whole user object
                                 className="button button-primary button-sm"
                                 disabled={actionLoading !== null || (currentUser.type === 'owner' && user.type === 'owner' && user.id !== currentUser.id)} // Only disable if another action is loading
                               >
                                 Edit
                               </button>
                               <button
                                 onClick={() => handleRemoveUser(user)} // Pass the whole user object
                                 className="button button-danger button-sm"
                                 disabled={actionLoading !== null || user.id === currentUser.id || (currentUser.type === 'owner' && user.type === 'owner' && user.id !== currentUser.id)}
                               >
                                 Remove
                               </button>
                             </>
                           )}
                         </td>
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
               <table className="user-table">
                 <thead>
                   <tr><th>User ID</th><th>Username</th><th>Email</th><th>Type</th><th>Actions</th></tr>
                 </thead>
                 <tbody>
                   {groupedUsers['unknown'].map(user => (
                    <tr key={user.id} className={editingUserId === user.id ? 'editing-row' : ''}>
                       <td>{user.id}</td>
                       <td>
                         {editingUserId === user.id ? (
                           <input
                             type="text"
                             name="username"
                             value={editFormData.username}
                             onChange={handleEditFormChange}
                             className="form-input form-input-sm"
                           />
                         ) : (
                           user.username
                         )}
                       </td>
                       <td>
                         {editingUserId === user.id ? (
                           <input
                             type="email"
                             name="email"
                             value={editFormData.email}
                             onChange={handleEditFormChange}
                             className="form-input form-input-sm"
                           />
                         ) : (
                           user.email
                         )}
                       </td>
                       <td>{user.type || 'N/A'}</td>
                       <td className="action-cell">
                         {editingUserId === user.id ? (
                           <>
                             <button
                               onClick={() => handleSaveUser(user.id)}
                               className="button button-success button-sm"
                               disabled={actionLoading === user.id}
                             >
                               {actionLoading === user.id ? 'Saving...' : 'Save'}
                             </button>
                             <button
                               onClick={handleCancelEdit}
                               className="button button-secondary button-sm"
                               disabled={actionLoading === user.id}
                             >
                               Cancel
                             </button>
                           </>
                         ) : (
                           <>
                             <button
                               onClick={() => handleEditUser(user)} // Pass user object
                               className="button button-primary button-sm"
                               disabled={actionLoading !== null || (currentUser.type === 'owner' && user.type === 'owner' && user.id !== currentUser.id)}
                             >
                               Edit
                             </button>
                             <button
                               onClick={() => handleRemoveUser(user)} // Pass user object
                               className="button button-danger button-sm"
                               disabled={actionLoading !== null || (currentUser.type === 'owner' && user.type === 'owner' && user.id !== currentUser.id)}
                             >
                               Remove
                             </button>
                           </>
                         )}
                       </td>
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
