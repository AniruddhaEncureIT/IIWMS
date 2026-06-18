import { ProtectedRoute } from "@/components/auth/protected-route";
import { TemplateEditorView } from "@/components/template-editor/template-editor-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function TemplateEditorPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.templateEditor}>
      <TemplateEditorView />
    </ProtectedRoute>
  );
}
