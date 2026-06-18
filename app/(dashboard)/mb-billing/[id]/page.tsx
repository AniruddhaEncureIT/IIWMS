import { ProtectedRoute } from "@/components/auth/protected-route";
import { MBBillingView } from "@/components/mb-billing/mb-billing-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MBBillingDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.mbBillingDetail}>
      <MBBillingView projectId={id} />
    </ProtectedRoute>
  );
}
