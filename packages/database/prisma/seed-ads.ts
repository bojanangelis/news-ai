/**
 * Macedonian Advertisers & Ads Seed
 * Run: pnpm --filter @repo/database db:seed:ads
 *
 * Seeds realistic Macedonian advertisers (Telekom, Halkbank, Stopanska, NLB,
 * A1, Setec, Eurolink) with one APPROVED ad each across different placements.
 */

import { PrismaClient } from "../src/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolve } from "node:path";

try { process.loadEnvFile(resolve(__dirname, "../.env")); } catch {}

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function future(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const now = new Date();

// ─── Advertiser definitions ───────────────────────────────────────────────────

const ADVERTISERS = [
  {
    name: "Telekom MK",
    contactName: "Маркетинг Тим",
    email: "marketing@telekom.mk",
    phone: "+38923100100",
    website: "https://www.telekom.mk",
    notes: "Директна соработка — го покрива целиот медиа пакет.",
  },
  {
    name: "Halkbank AD Skopje",
    contactName: "Одделение за маркетинг",
    email: "marketing@halkbank.mk",
    phone: "+38923293293",
    website: "https://www.halkbank.mk",
    notes: "Банерска кампања за депозити и кредити.",
  },
  {
    name: "Stopanska Banka",
    contactName: "Маркетинг",
    email: "marketing@stb.com.mk",
    phone: "+38923295295",
    website: "https://www.stb.com.mk",
    notes: "Промоција на дигитално банкарство.",
  },
  {
    name: "NLB Banka",
    contactName: "Маркетинг сектор",
    email: "contact@nlb.mk",
    phone: "+38923408000",
    website: "https://www.nlb.mk",
    notes: "NLB Тутунска кампања.",
  },
  {
    name: "A1 Makedonija",
    contactName: "Маркетинг А1",
    email: "pr@a1.mk",
    phone: "+38922088000",
    website: "https://www.a1.mk",
    notes: "Промоција на 5G услуги.",
  },
  {
    name: "Setec",
    contactName: "Продажен тим",
    email: "info@setec.mk",
    phone: "+38922050506",
    website: "https://www.setec.mk",
    notes: "ИТ опрема и решенија за бизниси.",
  },
  {
    name: "Eurolink Осигурување",
    contactName: "Маркетинг Еуролинк",
    email: "info@eurolink.mk",
    phone: "+38922095000",
    website: "https://www.eurolink.mk",
    notes: "Осигурување на возила и имот.",
  },
];

// ─── Ad definitions (one per advertiser, different placements) ────────────────

function makeAds(ids: Record<string, string>) {
  return [
    // Telekom — Top Banner (shows everywhere)
    {
      title: "Telekom Magenta 5G Топ Банер",
      advertiserId: ids["Telekom MK"]!,
      imageUrl: "https://placehold.co/970x90/E20074/FFFFFF?text=Telekom+MK+%E2%80%94+5G+за+сите",
      altText: "Telekom MK — 5G за сите",
      type: "TOP_BANNER" as const,
      placement: "TOP_BANNER" as const,
      deviceTarget: "ALL" as const,
      categoryTargets: [] as string[],   // ← empty = show everywhere
      pageTargets: [] as string[],
      destinationUrl: "https://www.telekom.mk/privatni-korisnici",
      utmSource: "newsplus",
      utmMedium: "display",
      utmCampaign: "telekom-5g-2026",
      startDate: now,
      endDate: future(30),
      priority: 8,
      weight: 120,
    },

    // Halkbank — Sidebar Right
    {
      title: "Halkbank Станбен Кредит Сајдбар",
      advertiserId: ids["Halkbank AD Skopje"]!,
      imageUrl: "https://placehold.co/300x600/003087/FFFFFF?text=Halkbank+%E2%80%94+Станбен+кредит",
      altText: "Halkbank — Станбен кредит со ниска каматна стапка",
      type: "SIDEBAR" as const,
      placement: "SIDEBAR_RIGHT" as const,
      deviceTarget: "DESKTOP" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.halkbank.mk/krediti/stanbeni-krediti",
      utmSource: "newsplus",
      utmMedium: "sidebar",
      utmCampaign: "halkbank-krediti-2026",
      startDate: now,
      endDate: future(60),
      priority: 7,
      weight: 100,
    },

    // Stopanska Banka — Feed Inline
    {
      title: "Stopanska Banka Дигитална Банка Инлајн",
      advertiserId: ids["Stopanska Banka"]!,
      imageUrl: "https://placehold.co/600x200/1A237E/FFFFFF?text=Stopanska+Banka+%E2%80%94+Дигитална+банка",
      altText: "Stopanska Banka — Дигитална банка во твоите раце",
      type: "INLINE_FEED" as const,
      placement: "FEED_INLINE" as const,
      deviceTarget: "ALL" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.stb.com.mk/digitalno-bankarstvo",
      utmSource: "newsplus",
      utmMedium: "feed",
      utmCampaign: "stb-digital-2026",
      startDate: now,
      endDate: future(45),
      priority: 6,
      weight: 100,
    },

    // NLB — Popup (once per day)
    {
      title: "NLB Тутунска Попап Промоција",
      advertiserId: ids["NLB Banka"]!,
      imageUrl: "https://placehold.co/600x400/00843D/FFFFFF?text=NLB+Banka+%E2%80%94+Специјална+понуда",
      altText: "NLB Banka — Специјална понуда за нови клиенти",
      type: "POPUP" as const,
      placement: "POPUP" as const,
      deviceTarget: "ALL" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.nlb.mk/ponudi",
      utmSource: "newsplus",
      utmMedium: "popup",
      utmCampaign: "nlb-promo-2026",
      popupDelaySec: 3,
      popupHomepageOnly: false,
      startDate: now,
      endDate: future(21),
      priority: 9,
      weight: 150,
    },

    // A1 — Sticky Bottom (mobile-focused)
    {
      title: "A1 5G Стики Банер Мобилен",
      advertiserId: ids["A1 Makedonija"]!,
      imageUrl: "https://placehold.co/728x90/FF0000/FFFFFF?text=A1+Makedonija+%E2%80%94+5G+мрежа",
      altText: "A1 Makedonija — Прво 5G во Македонија",
      type: "STICKY_BOTTOM" as const,
      placement: "STICKY_BOTTOM" as const,
      deviceTarget: "MOBILE" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.a1.mk/5g",
      utmSource: "newsplus",
      utmMedium: "sticky",
      utmCampaign: "a1-5g-mobile-2026",
      startDate: now,
      endDate: future(30),
      priority: 7,
      weight: 100,
    },

    // Setec — Sponsored Card (инлајн во фидот)
    {
      title: "Setec ИТ Опрема Спонзорирана Картичка",
      advertiserId: ids["Setec"]!,
      imageUrl: "https://placehold.co/400x300/0D47A1/FFFFFF?text=Setec+%E2%80%94+ИТ+решенија",
      altText: "Setec — Врвна ИТ опрема за твојот бизнис",
      type: "SPONSORED_CARD" as const,
      placement: "SPONSORED_CARD" as const,
      deviceTarget: "ALL" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.setec.mk/produkti",
      utmSource: "newsplus",
      utmMedium: "sponsored-card",
      utmCampaign: "setec-it-2026",
      startDate: now,
      endDate: future(90),
      priority: 5,
      weight: 80,
    },

    // Eurolink — Article Inline
    {
      title: "Eurolink Осигурување Артикл Инлајн",
      advertiserId: ids["Eurolink Осигурување"]!,
      imageUrl: "https://placehold.co/600x200/B71C1C/FFFFFF?text=Eurolink+%E2%80%94+Осигурај+го+твоето+возило",
      altText: "Eurolink Осигурување — Осигурај го твоето возило онлајн",
      type: "INLINE_FEED" as const,
      placement: "ARTICLE_INLINE" as const,
      deviceTarget: "ALL" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.eurolink.mk/avtomobilsko",
      utmSource: "newsplus",
      utmMedium: "article-inline",
      utmCampaign: "eurolink-auto-2026",
      startDate: now,
      endDate: future(60),
      priority: 6,
      weight: 90,
    },

    // Second Telekom ad — Article Inline (desktop only)
    {
      title: "Telekom Magenta TV Артикл Инлајн",
      advertiserId: ids["Telekom MK"]!,
      imageUrl: "https://placehold.co/600x200/E20074/FFFFFF?text=Telekom+Magenta+TV+%E2%80%94+Гледај+сè",
      altText: "Telekom Magenta TV — Гледај сè на едно место",
      type: "INLINE_FEED" as const,
      placement: "ARTICLE_INLINE" as const,
      deviceTarget: "DESKTOP" as const,
      categoryTargets: [] as string[],
      pageTargets: [] as string[],
      destinationUrl: "https://www.telekom.mk/magenta-tv",
      utmSource: "newsplus",
      utmMedium: "article-inline",
      utmCampaign: "telekom-tv-2026",
      startDate: now,
      endDate: future(30),
      priority: 7,
      weight: 110,
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Macedonian advertisers and ads...\n");

  // Upsert advertisers
  const advertiserIds: Record<string, string> = {};

  for (const adv of ADVERTISERS) {
    const existing = await prisma.advertiser.findFirst({ where: { name: adv.name } });
    const record = existing
      ? await prisma.advertiser.update({ where: { id: existing.id }, data: adv })
      : await prisma.advertiser.create({ data: adv });
    advertiserIds[adv.name] = record.id;
    console.log(`  ${existing ? "↩ " : "✓ "} Advertiser: ${adv.name} (${record.id})`);
  }

  console.log();

  // Create ads (skip if title already exists for that advertiser)
  const ads = makeAds(advertiserIds);
  let created = 0;
  let skipped = 0;

  for (const ad of ads) {
    const existing = await prisma.ad.findFirst({
      where: { title: ad.title, advertiserId: ad.advertiserId },
    });

    if (existing) {
      console.log(`  ↩  Skipped (exists): ${ad.title}`);
      skipped++;
      continue;
    }

    await prisma.ad.create({
      data: {
        ...ad,
        status: "APPROVED",   // auto-approve seed ads
        isEnabled: true,
      },
    });
    console.log(`  ✓ Ad created: ${ad.title}`);
    created++;
  }

  console.log(`\n✅  Done — ${created} ads created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
