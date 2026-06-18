import { ProtectedRoute } from "@/components/auth/protected-route";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { ALL_ROLES } from "@/constants/route-roles";

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={ALL_ROLES}>
      <NotificationsView />
    </ProtectedRoute>
  );
}
