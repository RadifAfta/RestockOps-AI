import type { Kysely } from 'kysely';
import { db } from '../../database/client.js';
import type { Database, Product, NewProduct, ProductUpdate } from '../../database/schema/index.js';

export class ProductsRepository {
  constructor(private readonly client: Kysely<Database> = db) {}

  async findById(id: string): Promise<Product | undefined> {
    return this.client
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findBySku(sku: string): Promise<Product | undefined> {
    return this.client
      .selectFrom('products')
      .selectAll()
      .where('sku', '=', sku)
      .executeTakeFirst();
  }

  async create(data: NewProduct): Promise<Product> {
    return this.client
      .insertInto('products')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findOrCreate(
    sku: string,
    name: string,
    price: number,
    category?: string,
    unit = 'pcs'
  ): Promise<Product> {
    const existing = await this.findBySku(sku);
    if (existing) {
      return existing;
    }

    return this.client
      .insertInto('products')
      .values({
        sku,
        name,
        category: category || null,
        unit,
        price,
        is_active: true,
      })
      .onConflict((oc) =>
        oc.column('sku').doUpdateSet({
          name,
          price,
          category: category || null,
          updated_at: new Date(),
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, data: ProductUpdate): Promise<Product | undefined> {
    return this.client
      .updateTable('products')
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async listActive(): Promise<Product[]> {
    return this.client
      .selectFrom('products')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  }
}

export const productsRepository = new ProductsRepository();
