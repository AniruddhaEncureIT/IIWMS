import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function AllProjectsPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.allProjects}>
      <AllProjectsView
        title="All Projects"
        description="View and manage all infrastructure projects"
        showCreate
      />
    </ProtectedRoute>
  );
}
