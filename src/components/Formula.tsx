import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

export function MathInline({ children }: { children: string }) {
  return <InlineMath math={children} />;
}

export function MathBlock({ children, caption }: { children: string; caption?: string }) {
  return (
    <div className="rounded-2xl border bg-muted/40 px-4 py-3 overflow-x-auto">
      <BlockMath math={children} />
      {caption && <p className="mt-1 text-center text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}