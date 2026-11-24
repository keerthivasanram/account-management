import React from 'react';
import RequirePermission from './RequirePermission';

/** Admin portal guard (admins and super admins). */
export const AdminRoute = () => (
  <RequirePermission
    perm="admin:portal"
    message="You need Administrator permissions to access this screen. Please contact your system admin if you require elevated privileges."
  />
);

export default AdminRoute;
