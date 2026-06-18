"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";
import type { IProject } from "@/types/iims.types";

function preFilter(p: IProject) {
  return p.status.includes("Work Order") || p.status.includes("In Progress") || p.status.includes("MB");
}

export default function MBBillingPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.mbBillingList}>
      <AllProjectsView
        title="MB & Billing"
        description="Measurement books and billing for projects under execution"
        preFilter={preFilter}
      />
    </ProtectedRoute>
  );
}
