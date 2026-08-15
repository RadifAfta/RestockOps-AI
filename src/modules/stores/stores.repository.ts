import type { Kysely } from 'kysely';
import { db } from '../../database/client.js';
import type { Database, Store, NewStore, StoreUpdate } from '../../database/schema/index.js';

export class StoresRepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  async findById(id: string): Promise<Store | undefined> {
    return this.client
      .selectFrom('stores')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Store | undefined> {
    return this.client
      .selectFrom('stores')
      .selectAll()
      .where('phone_number', '=', phoneNumber)
      .executeTakeFirst();
  }

  async findByName(name: string): Promise<Store | undefined> {
    return this.client
      .selectFrom('stores')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();
  }

  async create(data: NewStore): Promise<Store> {
    return this.client
      .insertInto('stores')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findOrCreate(name: string, phoneNumber: string, address?: string): Promise<Store> {
    const existing = await this.findByPhoneNumber(phoneNumber);
    if (existing) {
      return existing;
    }

    return this.client
      .insertInto('stores')
      .values({
        name,
        phone_number: phoneNumber,
        address: address || null,
        is_active: true,
      })
      .onConflict((oc) =>
        oc.column('phone_number').doUpdateSet({
          name,
          updated_at: new Date(),
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, data: StoreUpdate): Promise<Store | undefined> {
    return this.client
      .updateTable('stores')
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async listActive(): Promise<Store[]> {
    return this.client
      .selectFrom('stores')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  }
}

export const storesRepository = new StoresRepository();
