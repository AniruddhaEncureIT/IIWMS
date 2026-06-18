import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlobalSearchView } from "@/components/search/global-search-view";
import { ALL_ROLES } from "@/constants/route-roles";

export default function SearchPage() {
  return (
    <ProtectedRoute allowedRoles={ALL_ROLES}>
      <Suspense>
        <GlobalSearchView />
      </Suspense>
    </ProtectedRoute>
  );
}
