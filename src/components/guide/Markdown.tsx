import ReactMarkdown from "react-markdown";

/** Rendu Markdown sobre (pas de HTML brut : react-markdown l'ignore par défaut). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed md:text-base">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ children }) => (
            <code className="bg-surface-2 rounded px-1.5 py-0.5 font-mono text-[0.9em]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-strong underline underline-offset-4"
            >
              {children}
            </a>
          ),
          h3: ({ children }) => <h3 className="font-display text-base font-bold">{children}</h3>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Lignes « - élément » d'un texte Markdown. */
export function bulletItems(md: string): string[] {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}
