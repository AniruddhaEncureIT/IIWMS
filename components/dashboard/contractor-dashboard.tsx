"use client";

import {
  FolderOpen, ClipboardCheck, PackageCheck, IndianRupee,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { getContractorProjects } from "@/components/contractor/contractor-shared";
import { StatCard, QuickAction, ProjectCard, SectionCard } from "./dash-shared";

export function ContractorDashboard({ name }: { name: string }) {
  const allProjects = store.getAllProjects();

  // Only projects assigned to this contractor
  const contractorProjects = getContractorProjects(allProjects, name);

  // MBs pending contractor acceptance — scoped to owned projects
  const pendingMBs = contractorProjects.reduce((count, p) => {
    return count + (p.mbData ?? []).filter(
      (mb) => !mb.acceptedByContractor && mb.status.toLowerCase().includes("contractor")
    ).length;
  }, 0);

  // Accepted MBs — scoped to owned projects
  const acceptedMBs = contractorProjects.reduce((count, p) => {
    return count + (p.mbData ?? []).filter((mb) => mb.acceptedByContractor).length;
  }, 0);

  // Bills in processing — scoped to owned projects
  const billsInProgress = contractorProjects.reduce((count, p) => {
    return count + (p.mbData ?? []).filter((mb) => {
      const s = mb.status.toLowerCase();
      return s.includes("auditor") || s.includes("accountant") || s.includes("aao") || s.includes("cafo");
    }).length;
  }, 0);

  const recent = contractorProjects
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contractor Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, {name.split(" ")[0]}! Measurement verification and payment tracking portal
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen}    color="blue"   label="Assigned Projects"      value={contractorProjects.length} trend="With work orders" />
        <StatCard icon={ClipboardCheck}color="yellow" label="Pending MB Verification" value={pendingMBs}                trend="Awaiting acceptance" />
        <StatCard icon={PackageCheck}  color="green"  label="Accepted MB Records"    value={acceptedMBs}               trend="Verified & accepted" />
        <StatCard icon={IndianRupee}   color="purple" label="Bills Under Processing" value={billsInProgress}           trend="In payment pipeline" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction icon={FolderOpen}    color="blue"   title="My Projects"      description="View assigned projects"    href="/contractor/my-projects"     />
        <QuickAction icon={ClipboardCheck}color="orange" title="MB Verification"  description="Accept or reject MBs"     href="/contractor/mb-verification" />
        <QuickAction icon={IndianRupee}   color="green"  title="Bills & Payments" description="Track payment status"     href="/contractor/bills-payments"  />
      </div>

      <SectionCard title="Assigned Projects">
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No projects assigned yet
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
