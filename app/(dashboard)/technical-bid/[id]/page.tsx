import { ProtectedRoute } from "@/components/auth/protected-route";
import { TechnicalBidView } from "@/components/technical-bid/technical-bid-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TechnicalBidPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.technicalBid}>
      <TechnicalBidView projectId={id} />
    </ProtectedRoute>
  );
}
