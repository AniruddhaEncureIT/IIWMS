import { ProtectedRoute } from "@/components/auth/protected-route";
import { MBVerificationView } from "@/components/contractor/mb-verification-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function MBVerificationPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.contractorMbVerification}>
      <MBVerificationView />
    </ProtectedRoute>
  );
}
