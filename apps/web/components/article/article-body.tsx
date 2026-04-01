import Image from "next/image";
import type { ArticleSection } from "@repo/types";

interface Props {
  sections: ArticleSection[];
}

export function ArticleBody({ sections }: Props) {
  return (
    <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}

function SectionRenderer({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case "PARAGRAPH":
      return (
        <p className="leading-relaxed text-neutral-800 dark:text-neutral-200">
          {section.content}
        </p>
      );

    case "HEADING": {
      const Tag = `h${section.level ?? 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag className="font-bold tracking-tight">{section.content}</Tag>;
    }

    case "QUOTE":
      return (
        <blockquote className="border-l-4 border-accent pl-6 italic text-neutral-600 dark:text-neutral-400 my-8">
          <p className="text-xl leading-relaxed">{section.content}</p>
          {section.attribution && (
            <footer className="mt-2 text-sm not-italic font-medium text-neutral-500">
              — {section.attribution}
            </footer>
          )}
        </blockquote>
      );

    case "IMAGE":
      if (!section.url) return null;
      return (
        <figure className="my-8 overflow-hidden rounded-2xl">
          <Image
            src={section.url}
            alt={section.caption ?? ""}
            width={800}
            height={450}
            className="w-full object-cover"
          />
          {section.caption && (
            <figcaption className="mt-2 text-center text-sm text-neutral-500">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );

    case "CODE":
      return (
        <pre className="overflow-x-auto rounded-xl bg-neutral-950 text-neutral-100 p-6 text-sm font-mono leading-relaxed my-6">
          <code>{section.content}</code>
        </pre>
      );

    case "DIVIDER":
      return <hr className="my-10 border-neutral-200 dark:border-neutral-800" />;

    case "LIST":
      return (
        <ul className="list-disc list-inside space-y-2">
          {section.items?.map((item, i) => (
            <li key={i} className="text-neutral-800 dark:text-neutral-200">
              {item}
            </li>
          ))}
        </ul>
      );

    default:
      return null;
  }
}
