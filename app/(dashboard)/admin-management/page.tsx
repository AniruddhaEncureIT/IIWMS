import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminManagementView } from "@/components/admin-management/admin-management-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function AdminManagementPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.adminManagement}>
      <AdminManagementView />
    </ProtectedRoute>
  );
}
