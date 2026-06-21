/**
 * Run with: npx tsx src/scripts/seed.ts
 * Creates admin and kitchen users, and default settings.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const adminHash = await bcrypt.hash("Admin1234!", 12);
  const kitchenHash = await bcrypt.hash("Kitchen1234!", 12);

  await db
    .insert(schema.users)
    .values([
      { email: "admin@example.com", passwordHash: adminHash, role: "admin" },
      { email: "kitchen@example.com", passwordHash: kitchenHash, role: "kitchen" },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.settings)
    .values([{ key: "DEFAULT_PREP_TIME_MINUTES", value: "30" }])
    .onConflictDoNothing();

  console.log("Seed complete.");
  console.log("Admin:   admin@example.com / Admin1234!");
  console.log("Kitchen: kitchen@example.com / Kitchen1234!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
