## Rendering
- Render formulas with KaTeX directly rather than react-katex named imports, because its UMD exports fail during server rendering.
- Keep the existing school-report function self-contained and test its calculation parity with src/lib/descartes.ts, because deployments exclude imports outside the functions directory.