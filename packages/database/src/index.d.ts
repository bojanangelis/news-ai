export * from "./generated/client/index.js";
export { Pool } from "pg";
export { PrismaPg } from "@prisma/adapter-pg";
export declare function createPrismaAdapter(): import("@prisma/adapter-pg").PrismaPg;
