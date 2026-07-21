// LEGACY ROUTE — retained for backward compatibility only.
// This route (/verification/[id]) is NOT linked from any dashboard, navigation,
// or workflow step. All DE/EE actions proceed through /project/[id] via
// project-details-view.tsx, which uses canonical WORKFLOW_STAGES status strings.
// Do not add new links to this route. Candidate for removal in a future cleanup sprint.
import { ProtectedRoute } from "@/components/auth/protected-route";
import { VerificationView } from "@/components/verification/verification-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VerificationPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.verification}>
      <VerificationView projectId={id} />
    </ProtectedRoute>
  );
}
