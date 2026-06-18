import { ProtectedRoute } from "@/components/auth/protected-route";
import { CreateDTPView } from "@/components/create-dtp/create-dtp-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreateDTPPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.createDtp}>
      <CreateDTPView projectId={id} />
    </ProtectedRoute>
  );
}
