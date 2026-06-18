import { ProtectedRoute } from "@/components/auth/protected-route";
import { LOAView } from "@/components/letter-of-award/loa-view";
import { ROUTE_ROLES } from "@/constants/route-roles";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LetterOfAwardPage({ params }: Props) {
  const { id } = await params;
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.letterOfAward}>
      <LOAView projectId={id} />
    </ProtectedRoute>
  );
}
