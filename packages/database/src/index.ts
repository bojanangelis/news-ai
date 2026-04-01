import { PrismaClient } from "./generated/client/index.js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Re-export everything from the generated client
export * from "./generated/client/index.js";

// Re-export adapter helpers so consumers (e.g. NestJS PrismaService) don't
// need to install pg / @prisma/adapter-pg separately.
export { Pool, PrismaPg };

/**
 * Creates a PrismaPg adapter bound to DATABASE_URL.
 * Called lazily (inside constructors / factory functions), never at module
 * load time, so process.env is already populated by the time it runs.
 */
export function createPrismaAdapter(): PrismaPg {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  const pool = new Pool({ connectionString: url });
  return new PrismaPg(pool);
}
