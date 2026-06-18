export interface IRepository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: TId, entity: Partial<Omit<T, "id" | "createdAt">>): Promise<T>;
  delete(id: TId): Promise<void>;
}

export abstract class BaseRepository<T extends { id: string }>
  implements IRepository<T>
{
  protected abstract items: T[];

  async findById(id: string): Promise<T | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return [...this.items];
  }

  abstract create(entity: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  abstract update(id: string, entity: Partial<Omit<T, "id" | "createdAt">>): Promise<T>;

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Record with id "${id}" not found.`);
    this.items.splice(index, 1);
  }

  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  protected now(): string {
    return new Date().toISOString();
  }
}
