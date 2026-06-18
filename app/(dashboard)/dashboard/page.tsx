"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { SEDashboard }           from "@/components/dashboard/se-dashboard";
import { DEDashboard }           from "@/components/dashboard/de-dashboard";
import { EEDashboard }           from "@/components/dashboard/ee-dashboard";
import { TenderClerkDashboard }  from "@/components/dashboard/tender-clerk-dashboard";
import { GenericFinanceDashboard } from "@/components/dashboard/generic-dashboard";
import { AdminDashboard }        from "@/components/dashboard/admin-dashboard";
import { ContractorDashboard }   from "@/components/dashboard/contractor-dashboard";
import { ConfiguratorDashboard } from "@/components/dashboard/configurator-dashboard";
import { PendingActionsSection } from "@/components/dashboard/dash-shared";
import { ALL_ROLES } from "@/constants/route-roles";

const GENERIC_FINANCE_ROLES = new Set([
  "Auditor",
  "Accountant",
  "Assistant Accounts Officer",
  "Chief Accounts and Finance Officer",
  "Additional Chief Executive Officer",
  "Chief Executive Officer",
]);

function DashboardContent() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const name = user?.name ?? "User";

  let content: React.ReactNode;
  switch (role) {
    case "Sectional Engineer":
      content = <SEDashboard name={name} />;
      break;
    case "Deputy Engineer":
      content = <DEDashboard name={name} />;
      break;
    case "Executive Engineer":
      content = <EEDashboard name={name} />;
      break;
    case "Tender Clerk":
      content = <TenderClerkDashboard name={name} />;
      break;
    case "System Administrator":
      content = <AdminDashboard name={name} />;
      break;
    case "Contractor":
      content = <ContractorDashboard name={name} />;
      break;
    case "Technical System Configurator":
      content = <ConfiguratorDashboard name={name} />;
      break;
    default:
      content = GENERIC_FINANCE_ROLES.has(role)
        ? <GenericFinanceDashboard name={name} role={role} />
        : <SEDashboard name={name} />;
  }

  return (
    <div className="space-y-6">
      <PendingActionsSection role={role} />
      {content}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={ALL_ROLES}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
