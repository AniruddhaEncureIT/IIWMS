import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CreateProjectWizard } from "@/components/create-project/create-project-wizard";
import { ROUTE_ROLES } from "@/constants/route-roles";

export default function CreateProjectPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.createProject}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>}>
        <CreateProjectWizard />
      </Suspense>
    </ProtectedRoute>
  );
}
