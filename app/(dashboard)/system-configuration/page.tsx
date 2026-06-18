import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemConfigView } from "@/components/system-config/system-config-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function SystemConfigurationPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.systemConfig}>
      <SystemConfigView />
    </ProtectedRoute>
  );
}
