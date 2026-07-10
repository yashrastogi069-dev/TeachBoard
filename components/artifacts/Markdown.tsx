import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/*
  Themed markdown renderer for lesson prose. Styles are mapped per element
  so we stay on design tokens without a typography plugin.
*/
export default function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (props) => (
          <p
            className="max-w-[70ch] pb-4 text-base leading-[1.75] text-ink-muted text-pretty last:pb-0"
            {...props}
          />
        ),
        strong: (props) => <strong className="font-semibold text-ink" {...props} />,
        em: (props) => <em className="italic text-ink" {...props} />,
        a: (props) => (
          <a
            className="text-accent-bright underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        ul: (props) => (
          <ul className="flex list-disc flex-col gap-2 pb-4 pl-5 text-base text-ink-muted marker:text-accent" {...props} />
        ),
        ol: (props) => (
          <ol className="flex list-decimal flex-col gap-2 pb-4 pl-5 text-base text-ink-muted marker:text-accent" {...props} />
        ),
        li: (props) => <li className="leading-[1.7]" {...props} />,
        h1: (props) => (
          <h3 className="font-display pb-2 pt-2 text-lg font-semibold text-ink text-balance" {...props} />
        ),
        h2: (props) => (
          <h3 className="font-display pb-2 pt-2 text-lg font-semibold text-ink text-balance" {...props} />
        ),
        h3: (props) => (
          <h4 className="font-display pb-2 pt-1 text-base font-semibold text-ink" {...props} />
        ),
        code: (props) => (
          <code
            className="rounded bg-bg-overlay px-1.5 py-0.5 font-mono text-[12px] text-accent-bright"
            {...props}
          />
        ),
        pre: (props) => (
          <pre
            className="mb-3 overflow-x-auto rounded-xl border border-line bg-bg/60 p-3 font-mono text-[12px] leading-relaxed text-ink-muted"
            {...props}
          />
        ),
        blockquote: (props) => (
          <blockquote
            className="mb-4 rounded-r-lg border-l-2 border-accent/60 bg-accent-soft/20 py-2 pl-4 pr-3 text-base italic text-ink-muted"
            {...props}
          />
        ),
        table: (props) => (
          <div className="mb-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-left text-sm" {...props} />
          </div>
        ),
        th: (props) => (
          <th className="border-b border-line-strong px-2 py-1.5 font-semibold text-ink" {...props} />
        ),
        td: (props) => (
          <td className="border-b border-line px-2 py-1.5 text-ink-muted" {...props} />
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
