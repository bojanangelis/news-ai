import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

// Load .env before defineConfig evaluates process.env (Node 20.6+)
try { process.loadEnvFile(resolve(__dirname, '.env')); } catch {}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL']!,
  },
});
