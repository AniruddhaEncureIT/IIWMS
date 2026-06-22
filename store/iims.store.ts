import type {
  IUser,
  IProject,
  IProjectHistory,
  ICharge,
  IRateItem,
  ITemplate,
} from "@/types/iims.types";
import { SEED_USERS } from "@/mock-data/users.mock";
import { SEED_CHARGES } from "@/mock-data/charges.mock";
import { SEED_PROJECTS } from "@/mock-data/projects.mock";
import { SEED_RATE_ITEMS } from "@/mock-data/rate-items.mock";
import { SEED_TEMPLATES } from "@/mock-data/templates.mock";
import {
  type ActionResult,
  validateForward,
  validateApprove,
  validateReject,
} from "@/constants/workflow-transitions";

// Storage keys exactly as specified
const KEYS = {
  USERS: "iims-users",
  PROJECTS: "iims-projects",
  CHARGES: "iims-charges",
  CURRENT_USER: "iims-current-user",
  RATE_ITEMS: "iims-rate-items",
  TEMPLATES: "iims-templates",
} as const;

// Bump this string whenever seed data files change (users, projects, charges, rate items, templates).
// A version match means localStorage already has current seed data — skip all writes.
const SEED_VERSION = "2026-06-22-v1";
const SEED_VERSION_KEY = "iims-seed-version";

class Store {
  private seeded = false;

  // ── Seeding ───────────────────────────────────────────────────────────────

  private ensureSeeded(): void {
    if (this.seeded || typeof window === "undefined") return;
    this.seeded = true;

    // Already seeded at this version — skip all writes to avoid blocking the main thread
    if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return;

    if (!this.read<IUser[]>(KEYS.USERS)) {
      // Strip passwords — auth is handled by auth.service; passwords must not persist to localStorage
      this.write(KEYS.USERS, SEED_USERS.map(({ password: _pw, ...u }) => ({ ...u, password: "" })));
    }

    // Merge seed projects so new fields added to SEED_PROJECTS are applied.
    // User-created projects (IDs not in the seed set) are preserved as-is.
    const seedIds = new Set(SEED_PROJECTS.map((p) => p.id));
    const stored = this.read<IProject[]>(KEYS.PROJECTS) ?? [];
    const userCreated = stored.filter((p) => !seedIds.has(p.id));
    this.write(KEYS.PROJECTS, [...SEED_PROJECTS, ...userCreated]);

    if (!this.read<ICharge[]>(KEYS.CHARGES)) this.write(KEYS.CHARGES, SEED_CHARGES);
    if (!this.read<IRateItem[]>(KEYS.RATE_ITEMS)) this.write(KEYS.RATE_ITEMS, SEED_RATE_ITEMS);
    if (!this.read<ITemplate[]>(KEYS.TEMPLATES)) this.write(KEYS.TEMPLATES, SEED_TEMPLATES);

    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  }

  // ── Low-level localStorage helpers ────────────────────────────────────────

  private read<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[Store] Failed to write "${key}" to localStorage.`);
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  updateLastLogin(userId: string): void {
    const now = new Date().toLocaleString("en-IN", { hour12: true });
    this.updateUser(userId, { lastLogin: now });
  }

  logout(): void {
    if (typeof window === "undefined") return;
    // Clear legacy key in case of leftover data from previous sessions
    localStorage.removeItem(KEYS.CURRENT_USER);
  }

  getCurrentUser(): IUser | null {
    this.ensureSeeded();
    if (typeof window === "undefined") return null;
    try {
      // Read from authService's storage key ("iims_auth_user") which is set
      // on login and cleared on logout — tokens enforce the 8-hour expiry
      const raw = localStorage.getItem("iims_auth_user");
      if (!raw) return null;
      const authUser = JSON.parse(raw) as { id: string };
      const users = this.read<IUser[]>(KEYS.USERS) ?? [];
      return users.find((u) => u.id === authUser.id) ?? null;
    } catch {
      return null;
    }
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  getAllProjects(): IProject[] {
    this.ensureSeeded();
    return this.read<IProject[]>(KEYS.PROJECTS) ?? [];
  }

  getProjectById(id: string): IProject | null {
    return this.getAllProjects().find((p) => p.id === id) ?? null;
  }

  private generateProjectId(): string {
    const existing = new Set(this.getAllProjects().map((p) => p.id));
    let id: string;
    do {
      // 6-char base-36 timestamp tail (ms precision) + 3-char random suffix
      // Produces IDs like PRJ4K2GJ9AB — never matches PRJ001-style seed IDs
      const ts  = Date.now().toString(36).toUpperCase().slice(-6);
      const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
      id = `PRJ${ts}${rnd}`;
    } while (existing.has(id));
    return id;
  }

  createProject(data: Partial<IProject>): IProject {
    const projects = this.getAllProjects();
    const id = this.generateProjectId();
    const user = this.getCurrentUser();
    const now = new Date().toISOString();
    const project: IProject = {
      id,
      projectName: "",
      departmentName: "",
      workActivity: "",
      sanctionYear: "",
      ssrType: "",
      ssrYear: "",
      budgetDepartment: "",
      majorHeadName: "",
      majorHeadCode: "",
      division: "Pune Division",
      subDivision: "",
      taluka: "",
      gramPanchayat: "",
      status: "Draft",
      currentStage: "Project Creation",
      createdBy: user?.name ?? "Unknown",
      createdAt: now.split("T")[0],
      history: [],
      ...data,
    };
    this.write(KEYS.PROJECTS, [...projects, project]);
    // Add initial creation history entry
    const histEntry: IProjectHistory = {
      id: `H${Date.now()}`,
      action: "Project Created",
      performedBy: user?.name ?? "Unknown",
      performedAt: now,
      remarks: "",
      fromStatus: "",
      toStatus: "Draft",
    };
    const projectWithHistory = { ...project, history: [histEntry] };
    this.updateProject(id, { history: [histEntry] });
    return projectWithHistory;
  }

  updateProject(id: string, data: Partial<IProject>): void {
    const projects = this.getAllProjects().map((p) =>
      p.id === id ? { ...p, ...data } : p
    );
    this.write(KEYS.PROJECTS, projects);
  }

  deleteProject(id: string): void {
    this.write(
      KEYS.PROJECTS,
      this.getAllProjects().filter((p) => p.id !== id)
    );
  }

  private addHistory(id: string, entry: Omit<IProjectHistory, "id">): void {
    const project = this.getProjectById(id);
    if (!project) return;
    const history = project.history ?? [];
    const last = history[history.length - 1];
    // Prevent duplicate: same transition written by the same user within 1 second
    if (
      last &&
      last.action === entry.action &&
      last.fromStatus === entry.fromStatus &&
      last.toStatus === entry.toStatus &&
      last.performedBy === entry.performedBy &&
      Date.now() - new Date(last.performedAt).getTime() < 1000
    ) {
      return;
    }
    const histEntry: IProjectHistory = { id: `H${Date.now()}`, ...entry };
    this.updateProject(id, { history: [...history, histEntry] });
  }

  forwardProject(id: string, toRole: string, remarks: string, nextStatus?: string): ActionResult {
    const project = this.getProjectById(id);
    if (!project) return { ok: false, error: `Project "${id}" not found.` };
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: "No authenticated user." };

    const validation = validateForward(user.role, project.status, toRole);
    if (!validation.ok) return validation;

    if (user.role === "Sectional Engineer" && project.createdBy !== user.name) {
      return { ok: false, error: `You can only forward projects you created. This project was created by "${project.createdBy}".` };
    }

    const newStatus = nextStatus || `Pending at ${toRole}`;
    this.addHistory(id, {
      action: `Forwarded to ${toRole}`,
      performedBy: user.name,
      performedAt: new Date().toISOString(),
      remarks,
      fromStatus: project.status,
      toStatus: newStatus,
    });
    this.updateProject(id, {
      status: newStatus,
      currentStage: `${toRole} Verification`,
    });
    return { ok: true };
  }

  rejectProject(id: string, toRole: string, remarks: string, nextStatus?: string): ActionResult {
    const project = this.getProjectById(id);
    if (!project) return { ok: false, error: `Project "${id}" not found.` };
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: "No authenticated user." };

    const validation = validateReject(user.role, project.status, toRole);
    if (!validation.ok) return validation;

    const newStatus = nextStatus || `Returned to ${toRole}`;
    this.addHistory(id, {
      action: `Returned to ${toRole}`,
      performedBy: user.name,
      performedAt: new Date().toISOString(),
      remarks,
      fromStatus: project.status,
      toStatus: newStatus,
    });
    this.updateProject(id, {
      status: newStatus,
      currentStage: `${toRole} - Correction Required`,
    });
    return { ok: true };
  }

  approveProject(id: string, status: string, remarks: string): ActionResult {
    const project = this.getProjectById(id);
    if (!project) return { ok: false, error: `Project "${id}" not found.` };
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: "No authenticated user." };

    const validation = validateApprove(user.role, project.status, status);
    if (!validation.ok) return validation;

    this.addHistory(id, {
      action: `Approved: ${status}`,
      performedBy: user.name,
      performedAt: new Date().toISOString(),
      remarks,
      fromStatus: project.status,
      toStatus: status,
    });
    this.updateProject(id, { status, currentStage: status });
    return { ok: true };
  }

  // ── Drafts ────────────────────────────────────────────────────────────────

  saveDraft(data: Partial<IProject>): IProject {
    const user = this.getCurrentUser();
    if (data.id && this.getProjectById(data.id)) {
      this.updateProject(data.id, { ...data, status: "Draft" });
      return this.getProjectById(data.id)!;
    }
    return this.createProject({
      ...data,
      status: "Draft",
      currentStage: "Draft",
      createdBy: user?.name ?? "Unknown",
    });
  }

  loadDraft(id: string): IProject | null {
    const p = this.getProjectById(id);
    return p?.status === "Draft" ? p : null;
  }

  getDraftProjects(userId: string): IProject[] {
    const user = this.getCurrentUser();
    const name = user?.name ?? userId;
    return this.getAllProjects().filter(
      (p) => p.status === "Draft" && p.createdBy.includes(name)
    );
  }

  deleteDraft(id: string): void {
    const p = this.getProjectById(id);
    if (p?.status === "Draft") this.deleteProject(id);
  }

  submitDraft(id: string): ActionResult {
    const p = this.getProjectById(id);
    if (!p) return { ok: false, error: `Project "${id}" not found.` };
    if (p.status !== "Draft") return { ok: false, error: "Only Draft projects can be submitted." };

    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: "No authenticated user." };
    if (user.role !== "Sectional Engineer") {
      return { ok: false, error: "Only Sectional Engineer can submit draft projects." };
    }

    const validation = validateForward(user.role, p.status, "Deputy Engineer");
    if (!validation.ok) return validation;

    const newStatus = "Pending at Deputy Engineer";
    this.addHistory(id, {
      action: "Draft Submitted for Verification",
      performedBy: user.name,
      performedAt: new Date().toISOString(),
      remarks: "",
      fromStatus: "Draft",
      toStatus: newStatus,
    });
    this.updateProject(id, {
      status: newStatus,
      currentStage: "Deputy Engineer Verification",
    });
    return { ok: true };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getAllUsers(): IUser[] {
    this.ensureSeeded();
    return this.read<IUser[]>(KEYS.USERS) ?? [];
  }

  getUserById(id: string): IUser | null {
    return this.getAllUsers().find((u) => u.id === id) ?? null;
  }

  createUser(data: Partial<IUser>): IUser {
    const users = this.getAllUsers();
    const { password: _pw, ...safeData } = data;
    const user: IUser = {
      id: `USR${Date.now()}`,
      email: "",
      password: "",  // never stored
      role: "",
      name: "",
      status: "Active",
      division: "Pune Division",
      ...safeData,
    };
    this.write(KEYS.USERS, [...users, user]);
    return user;
  }

  updateUser(id: string, data: Partial<IUser>): void {
    const users = this.getAllUsers().map((u) =>
      u.id === id ? { ...u, ...data } : u
    );
    this.write(KEYS.USERS, users);
  }

  deleteUser(id: string): void {
    this.write(
      KEYS.USERS,
      this.getAllUsers().filter((u) => u.id !== id)
    );
  }

  // ── Charges ───────────────────────────────────────────────────────────────

  getAllCharges(): ICharge[] {
    this.ensureSeeded();
    return this.read<ICharge[]>(KEYS.CHARGES) ?? [];
  }

  getActiveCharges(): ICharge[] {
    return this.getAllCharges().filter((c) => c.isActive);
  }

  addCharge(data: { type: string; percentage: number; isActive: boolean }): ICharge {
    const charges = this.getAllCharges();
    const today = new Date().toISOString().split("T")[0];
    const charge: ICharge = {
      id: `C${Date.now()}`,
      createdAt: today,
      updatedAt: today,
      ...data,
    };
    this.write(KEYS.CHARGES, [...charges, charge]);
    return charge;
  }

  updateCharge(id: string, data: Partial<ICharge>): void {
    const today = new Date().toISOString().split("T")[0];
    const charges = this.getAllCharges().map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: today } : c
    );
    this.write(KEYS.CHARGES, charges);
  }

  deleteCharge(id: string): void {
    this.write(
      KEYS.CHARGES,
      this.getAllCharges().filter((c) => c.id !== id)
    );
  }

  // ── Rate Items ────────────────────────────────────────────────────────────

  getSSRRateItems(): IRateItem[] {
    this.ensureSeeded();
    return (this.read<IRateItem[]>(KEYS.RATE_ITEMS) ?? []).filter(
      (r) => r.type === "SSR"
    );
  }

  getDSRRateItems(): IRateItem[] {
    this.ensureSeeded();
    return (this.read<IRateItem[]>(KEYS.RATE_ITEMS) ?? []).filter(
      (r) => r.type === "DSR"
    );
  }

  getAllRateItems(): IRateItem[] {
    this.ensureSeeded();
    return this.read<IRateItem[]>(KEYS.RATE_ITEMS) ?? [];
  }

  addRateItem(data: Omit<IRateItem, "id">): IRateItem {
    const items = this.getAllRateItems();
    const item: IRateItem = { id: `RI${Date.now()}`, ...data };
    this.write(KEYS.RATE_ITEMS, [...items, item]);
    return item;
  }

  updateRateItem(id: string, data: Partial<IRateItem>): void {
    const items = this.getAllRateItems().map((r) =>
      r.id === id ? { ...r, ...data } : r
    );
    this.write(KEYS.RATE_ITEMS, items);
  }

  deleteRateItem(id: string): void {
    this.write(
      KEYS.RATE_ITEMS,
      this.getAllRateItems().filter((r) => r.id !== id)
    );
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  getTemplates(): ITemplate[] {
    this.ensureSeeded();
    return this.read<ITemplate[]>(KEYS.TEMPLATES) ?? [];
  }

  getTemplateById(id: string): ITemplate | null {
    return this.getTemplates().find((t) => t.id === id) ?? null;
  }

  createTemplate(data: Omit<ITemplate, "id">): ITemplate {
    const templates = this.getTemplates();
    const template: ITemplate = { id: `TPL${Date.now()}`, ...data };
    this.write(KEYS.TEMPLATES, [...templates, template]);
    return template;
  }

  updateTemplate(id: string, data: Partial<ITemplate>): void {
    const templates = this.getTemplates().map((t) =>
      t.id === id ? { ...t, ...data } : t
    );
    this.write(KEYS.TEMPLATES, templates);
  }

  deleteTemplate(id: string): void {
    this.write(
      KEYS.TEMPLATES,
      this.getTemplates().filter((t) => t.id !== id)
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  /** Wipe all IIMS data and re-seed from scratch (useful for dev reset) */
  resetToSeedData(): void {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(SEED_VERSION_KEY);
    this.seeded = false;
    this.ensureSeeded();
  }
}

export const store = new Store();
