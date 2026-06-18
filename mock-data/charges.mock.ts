import type { ICharge } from "@/types/iims.types";

export const SEED_CHARGES: ICharge[] = [
  {
    id: "C1",
    type: "GST",
    percentage: 18,
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "C2",
    type: "Labour Cess",
    percentage: 1,
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "C3",
    type: "Insurance",
    percentage: 0.5,
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "C4",
    type: "Quality Control Charges",
    percentage: 1,
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "C5",
    type: "Contingency",
    percentage: 2,
    isActive: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];
