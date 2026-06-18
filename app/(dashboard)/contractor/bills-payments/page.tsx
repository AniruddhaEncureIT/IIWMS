import { ProtectedRoute } from "@/components/auth/protected-route";
import { BillsPaymentsView } from "@/components/contractor/bills-payments-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function BillsPaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.contractorBillsPayments}>
      <BillsPaymentsView />
    </ProtectedRoute>
  );
}
