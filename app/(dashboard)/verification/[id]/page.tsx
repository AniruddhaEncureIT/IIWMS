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
