import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function CostEstimationPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.costEstimation}>
      <AllProjectsView
        title="Cost Estimation"
        description="Manage project cost estimates and technical sanctions"
      />
    </ProtectedRoute>
  );
}
