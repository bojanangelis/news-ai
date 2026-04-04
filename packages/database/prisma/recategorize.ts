/**
 * Re-categorize existing articles based on keyword matching against their
 * title and excerpt. Uses the same rules as scraping.service.ts.
 *
 * Run: pnpm --filter @repo/database exec tsx prisma/recategorize.ts
 *
 * Safe to run multiple times. Only updates articles where a better keyword
 * match is found. Leaves unmatched articles in their current category.
 */

import { PrismaClient } from "../src/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolve } from "node:path";

try { process.loadEnvFile(resolve(__dirname, "../.env")); } catch {}

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// IMPORTANT: slugs must match the Latin transliterated slugs stored in the DB
const CATEGORY_KEYWORD_RULES: [string[], string][] = [
  [['фудбал', 'кошарка', 'ракомет', 'натпревар', 'голман', 'атлет', 'олимпи', 'шампион', 'мундијал', 'голови', 'лигата'], 'sport'],
  [['русија', 'украина', 'нато', 'израел', 'кина', 'трамп', 'путин', 'меѓународн', 'дипломат', 'бегалц', 'странств'], 'svet'],
  [['влада', 'опозиц', 'парламент', 'министер', 'пратеник', 'избор', 'коалиц', 'собрание', 'претседател', 'политич'], 'politika'],
  [['економ', 'берза', 'инфлац', 'буџет', 'ддв', 'извоз', 'увоз', 'царина', 'финанс', 'евро', 'денар', 'бдп'], 'ekonomija'],
  [['бизнис', 'компани', 'банка', 'инвестиц', 'акционер', 'профит', 'приход', 'претпријат', 'маркет'], 'biznis'],
  [['технолог', 'апликац', 'интернет', 'дигитал', 'стартап', 'софтвер', 'хардвер', 'сајбер', 'вештачка'], 'tehnologija'],
  [['болница', 'лекар', 'вакцина', 'ковид', 'болест', 'медицин', 'пациент', 'здравствен', 'вирус', 'терапи'], 'zdravje'],
  [['наука', 'истражувањ', 'откритие', 'вселена', 'биолог', 'физика', 'климатск', 'еколог', 'животна средина'], 'nauka'],
  [['прилеп', 'битола', 'куманово', 'тетово', 'охрид', 'штип', 'велес', 'струга', 'гостивар', 'кичево', 'скопје'], 'skopje'],
  [['филм', 'музика', 'концерт', 'актер', 'певач', 'шоу', 'хумор', 'риалити', 'сериј', 'забав'], 'zabava'],
  [['животен стил', 'исхран', 'рецепт', 'убавин', 'мода', 'фитнес', 'диет', 'свадб', 'врск', 'хороскоп'], 'zhivoten-stil'],
  [['театар', 'изложба', 'книга', 'уметност', 'наследство', 'фестивал', 'литература', 'сликар', 'скулптур'], 'kultura'],
  [['балкан', 'србија', 'хрватска', 'косово', 'бугарија', 'грција', 'словенија', 'турција', 'регионал'], 'region'],
];

function matchCategory(title: string, excerpt: string, slugMap: Map<string, string>): string | null {
  const text = `${title} ${excerpt}`.toLowerCase();
  for (const [keywords, slug] of CATEGORY_KEYWORD_RULES) {
    if (keywords.some(kw => text.includes(kw))) {
      const id = slugMap.get(slug);
      if (id) return id;
    }
  }
  return null;
}

async function main() {
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const slugMap = new Map(categories.map(c => [c.slug, c.id]));

  console.log(`Loaded ${categories.length} categories:`);
  categories.forEach(c => console.log(`  ${c.slug} → ${c.name}`));

  const PAGE = 500;
  let skip = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalUnmatched = 0;
  const categoryHits: Record<string, number> = {};

  while (true) {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, excerpt: true, categoryId: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take: PAGE,
    });

    if (articles.length === 0) break;
    skip += PAGE;

    for (const article of articles) {
      const matchedId = matchCategory(article.title, article.excerpt, slugMap);

      if (!matchedId) {
        totalUnmatched++;
        continue;
      }

      if (article.categoryId === matchedId) {
        totalSkipped++;
        continue;
      }

      await prisma.article.update({
        where: { id: article.id },
        data: { categoryId: matchedId },
      });

      const catName = categories.find(c => c.id === matchedId)?.name ?? matchedId;
      categoryHits[catName] = (categoryHits[catName] ?? 0) + 1;
      totalUpdated++;
    }

    if (skip % 500 === 0) console.log(`Processed ${skip} articles — updated so far: ${totalUpdated}`);
  }

  console.log('\n=== Recategorization complete ===');
  console.log(`  Updated:   ${totalUpdated}`);
  console.log(`  Already correct: ${totalSkipped}`);
  console.log(`  Unmatched (no keyword hit):  ${totalUnmatched}`);

  if (Object.keys(categoryHits).length > 0) {
    console.log('\nMoved articles to:');
    Object.entries(categoryHits).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      console.log(`  ${name}: +${count}`);
    });
  }

  // Final breakdown
  const counts = await prisma.article.groupBy({
    by: ['categoryId'],
    _count: { id: true },
    where: { status: 'PUBLISHED' },
  });
  console.log('\nFinal articles per category:');
  for (const row of counts.sort((a, b) => b._count.id - a._count.id)) {
    const cat = categories.find(c => c.id === row.categoryId);
    console.log(`  ${cat?.name ?? row.categoryId}: ${row._count.id}`);
  }
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => pool.end());
