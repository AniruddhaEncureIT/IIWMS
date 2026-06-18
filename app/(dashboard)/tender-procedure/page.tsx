"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";
import type { IProject } from "@/types/iims.types";

function preFilter(p: IProject) {
  return p.status.includes("DTP Sanctioned") || p.status.includes("Tender");
}

export default function TenderProcedurePage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.tenderProcedure}>
      <AllProjectsView
        title="Tender Procedure"
        description="Manage tender notices, technical bids, and financial bids"
        preFilter={preFilter}
      />
    </ProtectedRoute>
  );
}
