import "katex/dist/katex.min.css";
import katex from "katex";

function renderMath(math: string, displayMode: boolean) {
  return katex.renderToString(math, { displayMode, throwOnError: false, trust: false });
}

export function MathInline({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderMath(children, false) }} />;
}

export function MathBlock({ children, caption }: { children: string; caption?: string }) {
  return (
    <div className="rounded-2xl border bg-muted/40 px-4 py-3 overflow-x-auto">
      <div dangerouslySetInnerHTML={{ __html: renderMath(children, true) }} />
      {caption && <p className="mt-1 text-center text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}