import { ProtectedRoute } from "@/components/auth/protected-route";
import { CreateTenderView } from "@/components/create-tender/create-tender-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CreateTenderPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.createTender}>
      <CreateTenderView projectId={id} />
    </ProtectedRoute>
  );
}
