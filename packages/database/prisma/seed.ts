import { PrismaClient, UserRole } from "../src/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";
import { resolve } from "node:path";

// Load .env before anything else (tsx does not auto-load .env)
try { process.loadEnvFile(resolve(__dirname, "../.env")); } catch {}

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const adminHash = hashSync("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@newsplus.dev" },
    update: { passwordHash: adminHash, role: UserRole.SUPER_ADMIN },
    create: {
      email: "admin@newsplus.dev",
      name: "Super Admin",
      passwordHash: adminHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  // ─── Categories ────────────────────────────────────────────────────────────
  // Step 1: Rename existing English categories to Macedonian (keeps article FKs intact)
  const renames: { oldSlug: string; name: string; newSlug: string; color: string; order: number }[] = [
    { oldSlug: "world",         name: "Свет",        newSlug: "svet",        color: "#2563eb", order: 3 },
    { oldSlug: "sports",        name: "Спорт",       newSlug: "sport",       color: "#16a34a", order: 7 },
    { oldSlug: "entertainment", name: "Забава",      newSlug: "zabava",      color: "#db2777", order: 8 },
    { oldSlug: "technology",    name: "Технологија", newSlug: "tehnologija", color: "#0891b2", order: 9 },
    { oldSlug: "health",        name: "Здравје",     newSlug: "zdravje",     color: "#ea580c", order: 10 },
    { oldSlug: "science",       name: "Наука",       newSlug: "nauka",       color: "#9333ea", order: 11 },
    { oldSlug: "business",      name: "Бизнис",      newSlug: "biznis",      color: "#0d9488", order: 12 },
  ];

  for (const { oldSlug, name, newSlug, color, order } of renames) {
    // Remove any orphan Macedonian category with the same target slug/name
    // (created by a previous failed seed run) before renaming
    await prisma.category.deleteMany({
      where: { slug: newSlug, articles: { none: {} } },
    });
    // Also clear by name uniqueness conflict
    await prisma.category.deleteMany({
      where: { name, slug: { not: oldSlug }, articles: { none: {} } },
    });

    const existing = await prisma.category.findUnique({ where: { slug: oldSlug } });
    if (existing) {
      await prisma.category.update({
        where: { slug: oldSlug },
        data: { name, slug: newSlug, color, order },
      });
    } else {
      // Already renamed in a previous run — just ensure values are correct
      await prisma.category.upsert({
        where: { slug: newSlug },
        update: { name, color, order },
        create: { name, slug: newSlug, color, order },
      });
    }
  }

  // Step 2: Upsert new Macedonian categories that don't map to English ones
  const newCategoryDefs = [
    { name: "Македонија", slug: "makedonija", color: "#dc2626", order: 1 },
    { name: "Скопје",     slug: "skopje",     color: "#ef4444", order: 2 },
    { name: "Политика",   slug: "politika",   color: "#7c3aed", order: 4 },
    { name: "Економија",  slug: "ekonomija",  color: "#059669", order: 5 },
    { name: "Регион",     slug: "region",     color: "#0891b2", order: 6 },
    { name: "Култура",    slug: "kultura",    color: "#ca8a04", order: 13 },
  ];

  const categories = await Promise.all(
    newCategoryDefs.map(({ name, slug, color, order }) =>
      prisma.category.upsert({
        where: { slug },
        update: { name, color, order },
        create: { name, slug, color, order },
      }),
    ),
  );

  // ─── Topics ───────────────────────────────────────────────────────────────
  const topicDefs = [
    { name: "Влада",       slug: "vlada" },
    { name: "Опозиција",   slug: "opozicija" },
    { name: "Европска унија", slug: "eu" },
    { name: "НАТО",        slug: "nato" },
    { name: "Економија",   slug: "ekonomija-tema" },
    { name: "Футбол",      slug: "futbol" },
    { name: "Музика",      slug: "muzika" },
    { name: "Филм",        slug: "film" },
  ];
  for (const { name, slug } of topicDefs) {
    await prisma.topic.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  // ─── Author (used as default for scraped articles) ────────────────────────
  const writerHash = hashSync("Writer123!", 12);
  const writer = await prisma.user.upsert({
    where: { email: "writer@newsplus.dev" },
    update: { passwordHash: writerHash },
    create: {
      email: "writer@newsplus.dev",
      name: "Редакција",
      passwordHash: writerHash,
      role: UserRole.WRITER,
    },
  });

  await prisma.author.upsert({
    where: { userId: writer.id },
    update: { displayName: "Редакција" },
    create: {
      userId: writer.id,
      slug: "redakcija",
      displayName: "Редакција",
      bio: "Редакциски тим на NewsPlus.",
      isVerified: true,
    },
  });

  const totalCats = renames.length + categories.length;
  console.log(`Seeded: admin=${admin.email}, writer=${writer.email}`);
  console.log(`Seeded: ${totalCats} categories (${renames.length} renamed + ${categories.length} new), ${topicDefs.length} topics`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
