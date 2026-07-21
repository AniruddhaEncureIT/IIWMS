import { ProtectedRoute } from "@/components/auth/protected-route";
import { GBApprovalView } from "@/components/gb-approval/gb-approval-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GBApprovalPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.gbApproval}>
      <GBApprovalView projectId={id} />
    </ProtectedRoute>
  );
}
