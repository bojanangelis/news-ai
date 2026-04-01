"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaAdapter = exports.PrismaPg = exports.Pool = void 0;
const index_js_1 = require("./generated/client/index.js");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Re-export everything from the generated client
__exportStar(require("./generated/client/index.js"), exports);
// Re-export adapter helpers
Object.defineProperty(exports, "Pool", { enumerable: true, get: function () { return pg_1.Pool; } });
Object.defineProperty(exports, "PrismaPg", { enumerable: true, get: function () { return adapter_pg_1.PrismaPg; } });
void index_js_1.PrismaClient; // keep import live for re-exports
/**
 * Creates a PrismaPg adapter bound to DATABASE_URL.
 * Called lazily (inside constructors / factory functions), never at module
 * load time, so process.env is already populated by the time it runs.
 */
function createPrismaAdapter() {
    const url = process.env["DATABASE_URL"];
    if (!url)
        throw new Error("DATABASE_URL environment variable is not set");
    const pool = new pg_1.Pool({ connectionString: url });
    return new adapter_pg_1.PrismaPg(pool);
}
exports.createPrismaAdapter = createPrismaAdapter;
