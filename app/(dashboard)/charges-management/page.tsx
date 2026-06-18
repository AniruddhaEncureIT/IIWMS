import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChargesManagementView } from "@/components/charges-management/charges-management-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function ChargesManagementPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.chargesManagement}>
      <ChargesManagementView />
    </ProtectedRoute>
  );
}
