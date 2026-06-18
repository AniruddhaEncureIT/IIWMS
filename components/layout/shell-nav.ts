import type { UserRole } from "@/types/auth.types";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name — resolved in Sidebar
}

export interface NavGroup {
  items: NavItem[];
}

const NOTIF_ITEM: NavItem = { label: "Notifications", href: "/notifications", icon: "Bell" };

// Per-role nav spec — aligned with user journeys
export const NAV_BY_ROLE: Record<string, NavItem[]> = {
  // SE: creates projects, does cost estimation & measurements inside project flow, creates MBs
  "Sectional Engineer": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // DE: verifies project details/rate analysis and does 100% MB measurement check
  "Deputy Engineer": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // EE: grants Technical Sanction, approves tenders/WO, does 5% MB measurement check
  "Executive Engineer": [
    { label: "Dashboard",        href: "/dashboard",        icon: "LayoutDashboard" },
    { label: "All Projects",     href: "/all-projects",     icon: "FolderOpen" },
    { label: "Tender Procedure", href: "/tender-procedure", icon: "Gavel" },
    { label: "Work Order",       href: "/work-order",       icon: "FileCheck" },
    { label: "MB & Billing",     href: "/mb-billing",       icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // Tender Clerk: manages tender procedure, L1 selection, Work Order — does NOT draft DTP
  "Tender Clerk": [
    { label: "Dashboard",        href: "/dashboard",        icon: "LayoutDashboard" },
    { label: "All Projects",     href: "/all-projects",     icon: "FolderOpen" },
    { label: "Tender Procedure", href: "/tender-procedure", icon: "Gavel" },
    { label: "Work Order",       href: "/work-order",       icon: "FileCheck" },
    NOTIF_ITEM,
  ],
  // Auditor: inputs deductions, updates Payment Memorandum — works on MB/billing
  "Auditor": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // Accountant: validates Net Payable, checks budget heads — works on MB/billing
  "Accountant": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // AAO: processes bills forwarded by Accountant
  "Assistant Accounts Officer": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // CAFO: verifies fund availability for BOTH tender notices AND final bills — needs all three
  "Chief Accounts and Finance Officer": [
    { label: "Dashboard",        href: "/dashboard",        icon: "LayoutDashboard" },
    { label: "All Projects",     href: "/all-projects",     icon: "FolderOpen" },
    { label: "Tender Procedure", href: "/tender-procedure", icon: "Gavel" },
    { label: "Work Order",       href: "/work-order",       icon: "FileCheck" },
    { label: "MB & Billing",     href: "/mb-billing",       icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  // ACEO: approves tenders and Work Orders — project list + actions via project detail is sufficient
  "Additional Chief Executive Officer": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    NOTIF_ITEM,
  ],
  // CEO: gives final approval on MB and Bill — needs MB access
  "Chief Executive Officer": [
    { label: "Dashboard",    href: "/dashboard",    icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
    { label: "MB & Billing", href: "/mb-billing",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  "System Administrator": [
    { label: "Dashboard",          href: "/dashboard",           icon: "LayoutDashboard" },
    { label: "Admin Management",   href: "/admin-management",    icon: "Users" },
    { label: "Charges Management", href: "/charges-management",  icon: "Percent" },
    { label: "System Config",      href: "/system-configuration",icon: "Settings" },
    { label: "Template Editor",    href: "/template-editor",     icon: "FileEdit" },
    { label: "Rate Item Editor",   href: "/rate-item-editor",    icon: "Database" },
    NOTIF_ITEM,
  ],
  "Contractor": [
    { label: "Dashboard",      href: "/dashboard",                    icon: "LayoutDashboard" },
    { label: "My Projects",    href: "/contractor/my-projects",       icon: "FolderOpen" },
    { label: "MB Verification",href: "/contractor/mb-verification",   icon: "FileCheck" },
    { label: "Bills & Payments",href: "/contractor/bills-payments",   icon: "ClipboardList" },
    NOTIF_ITEM,
  ],
  "Technical System Configurator": [
    { label: "Dashboard",     href: "/dashboard",            icon: "LayoutDashboard" },
    { label: "Rate Items",    href: "/rate-item-editor",     icon: "Database" },
    { label: "Templates",     href: "/template-editor",      icon: "FileEdit" },
    { label: "System Config", href: "/system-configuration", icon: "Settings" },
    NOTIF_ITEM,
  ],
};

export function getNavItems(role: UserRole | string): NavItem[] {
  return NAV_BY_ROLE[role] ?? [
    { label: "Dashboard",    href: "/dashboard",   icon: "LayoutDashboard" },
    { label: "All Projects", href: "/all-projects", icon: "FolderOpen" },
  ];
}
