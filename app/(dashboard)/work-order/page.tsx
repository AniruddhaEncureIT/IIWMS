"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";
import type { IProject } from "@/types/iims.types";

function preFilter(p: IProject) {
  return p.status.includes("LOI") || p.status.includes("LOA") || p.status.includes("Work Order");
}

export default function WorkOrderPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.workOrderList}>
      <AllProjectsView
        title="Work Order"
        description="Projects with LOI issued or Work Order stage"
        preFilter={preFilter}
      />
    </ProtectedRoute>
  );
}
