import { ProtectedRoute } from "@/components/auth/protected-route";
import { WorkOrderView } from "@/components/work-order/work-order-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.workOrderDetail}>
      <WorkOrderView projectId={id} />
    </ProtectedRoute>
  );
}
