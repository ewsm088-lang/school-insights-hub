import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import * as model from "../src/lib/descartes";

const source = readFileSync(new URL("../supabase/functions/generate-school-report/index.ts", import.meta.url), "utf8")
  .replace(/^import .*;\n/, "")
  .split("Deno.serve")[0];
if (!source) throw new Error("Missing report implementation");
const js = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
const report = new Function(`${js}; return {calcAcademico,calcSocial,calcSocioemocional,calcModuloVDI,calcSubdimensoes,createGroup,toPromptGroup};`)();

test("deployed report calculations match the application", () => {
  const survey = Object.fromEntries([...model.SOCIAL_KEYS, ...model.SOCIO_KEYS].map((key, i) => [key, i % 5 + 1])) as model.SurveyRow;
  expect(report.calcAcademico(7.54, 0, 10)).toBe(model.calcAcademico(7.54, 0, 10));
  expect(report.calcSocial(survey)).toBe(model.calcSocial(survey));
  expect(report.calcSocioemocional(survey)).toBe(model.calcSocioemocional(survey));
  expect(report.calcModuloVDI(null, 0.5, 0.75)).toBe(model.calcModuloVDI(null, 0.5, 0.75));
  expect(report.calcSubdimensoes(survey)).toEqual(model.calcSubdimensoes(survey));
});

test("report suppresses groups under ten and sends the socioemotional metric", () => {
  const row = { academic: 0.754, social: 0.5, socioemotional: 0.75, vdi: 1.176, subdimensions: {} };
  expect(report.createGroup("school", "school", "Escola", Array(9).fill(row))).toBeNull();
  const group = report.createGroup("school", "school", "Escola", Array(10).fill(row));
  expect(report.toPromptGroup(group).indicadores.eixoSocioemocional).toBe(0.75);
});