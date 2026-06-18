import { ProtectedRoute } from "@/components/auth/protected-route";
import { RateItemEditorView } from "@/components/rate-item-editor/rate-item-editor-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function RateItemEditorPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.rateItemEditor}>
      <RateItemEditorView />
    </ProtectedRoute>
  );
}
