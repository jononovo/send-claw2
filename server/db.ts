import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon's driver only connects over WebSockets, so a plain Postgres on this
// machine (local development off Replit) goes through node-postgres instead.
// Both clients share the pg API, so the exports keep their Neon types.
function isLocalDatabase(url: string) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

type Database = NeonDatabase<typeof schema> & { $client: Pool };

const useNodePostgres = isLocalDatabase(process.env.DATABASE_URL);

export const pool: Pool = useNodePostgres
  ? (new pg.Pool({ connectionString: process.env.DATABASE_URL }) as unknown as Pool)
  : new Pool({ connectionString: process.env.DATABASE_URL });
export const db: Database = useNodePostgres
  ? (drizzleNodePostgres({ client: pool as unknown as pg.Pool, schema }) as unknown as Database)
  : drizzle({ client: pool, schema });
