import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATE_SECRET = process.env["REVALIDATE_SECRET"];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (REVALIDATE_SECRET && secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { type: string; slug?: string; tag?: string };

  switch (body.type) {
    case "article":
      if (body.slug) {
        revalidateTag(`article:${body.slug}`);
        revalidatePath(`/article/${body.slug}`);
      }
      break;
    case "homepage":
      revalidateTag("homepage");
      revalidatePath("/");
      break;
    case "category":
      if (body.slug) {
        revalidatePath(`/category/${body.slug}`);
      }
      break;
    case "tag":
      if (body.tag) revalidateTag(body.tag);
      break;
    default:
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}
