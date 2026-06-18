"use client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AllProjectsView } from "@/components/all-projects/all-projects-view";
import { ROUTE_ROLES } from "@/constants/route-roles";
import type { IProject } from "@/types/iims.types";

function preFilter(p: IProject) {
  return p.status.includes("Cost Approved");
}

export default function DraftTenderPaperPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.draftTenderPaper}>
      <AllProjectsView
        title="Draft Tender Paper"
        description="Projects ready for DTP preparation — Cost Approved stage"
        preFilter={preFilter}
      />
    </ProtectedRoute>
  );
}
