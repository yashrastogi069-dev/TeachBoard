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
          <p className="pb-3 text-sm leading-relaxed text-ink-muted last:pb-0" {...props} />
        ),
        strong: (props) => <strong className="font-semibold text-ink" {...props} />,
        em: (props) => <em className="italic text-ink" {...props} />,
        a: (props) => (
          <a
            className="text-accent-bright underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        ul: (props) => (
          <ul className="flex list-disc flex-col gap-1.5 pb-3 pl-5 text-sm text-ink-muted" {...props} />
        ),
        ol: (props) => (
          <ol className="flex list-decimal flex-col gap-1.5 pb-3 pl-5 text-sm text-ink-muted" {...props} />
        ),
        li: (props) => <li className="leading-relaxed" {...props} />,
        h1: (props) => (
          <h3 className="font-display pb-2 pt-1 text-base font-semibold text-ink" {...props} />
        ),
        h2: (props) => (
          <h3 className="font-display pb-2 pt-1 text-base font-semibold text-ink" {...props} />
        ),
        h3: (props) => (
          <h4 className="pb-2 pt-1 text-sm font-semibold text-ink" {...props} />
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
            className="mb-3 border-l-2 border-accent/50 pl-3 text-sm italic text-ink-muted"
            {...props}
          />
        ),
        table: (props) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs" {...props} />
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
