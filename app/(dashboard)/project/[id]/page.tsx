import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProjectDetailsView } from "@/components/project-details/project-details-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.projectDetail}>
      <ProjectDetailsView projectId={id} />
    </ProtectedRoute>
  );
}
