import { ProtectedRoute } from "@/components/auth/protected-route";
import { MyProjectsView } from "@/components/contractor/my-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function MyProjectsPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.contractorMyProjects}>
      <MyProjectsView />
    </ProtectedRoute>
  );
}
