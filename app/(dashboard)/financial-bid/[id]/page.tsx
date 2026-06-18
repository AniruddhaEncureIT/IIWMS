import { ProtectedRoute } from "@/components/auth/protected-route";
import { FinancialBidView } from "@/components/financial-bid/financial-bid-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FinancialBidPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.financialBid}>
      <FinancialBidView projectId={id} />
    </ProtectedRoute>
  );
}
