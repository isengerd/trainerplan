import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { emailValue, readJson, textValue } from "./api-security";
import { validatePlans, validateTemplates } from "./validators";
import { library } from "@/data/demo";
import { escapeCalendarText, mailSubject } from "./output-encoding";

test("Kalender- und Mailausgabe verhindern zusätzliche Eigenschaften und Header", () => {
  for (const separator of ["\r", "\n", "\r\n"]) {
    assert.equal(escapeCalendarText(`Titel${separator}BEGIN:VEVENT`), "Titel\\nBEGIN:VEVENT");
    assert.equal(mailSubject(`Titel${separator}Bcc: attacker@example.org`), "Titel Bcc: attacker@example.org");
  }
  assert.equal(escapeCalendarText("A,B;C\\D"), "A\\,B\\;C\\\\D");
});

test("Text bleibt Klartext; React escaped HTML bei der Ausgabe", () => {
  const input = '<img src=x onerror="alert(1)"> & Fußball';
  assert.equal(textValue(input, "Name", 200), input);
  const html = renderToStaticMarkup(createElement("span", null, input));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&amp;"));
  assert.equal(textValue(" A\r\nB\rC ", "Text", 100), "A\nB\nC");
  assert.throws(() => textValue("A\u0000B", "Name", 100));
  assert.throws(() => textValue({}, "Name", 100));
});

test("E-Mail-Felder akzeptieren genau eine Adresse ohne Header- oder Empfängerinjektion", () => {
  for (const value of ["a@example.org\r\nBcc:x@example.org", "a,b@example.org", "Name<a@example.org>", "a@example.org;evil@example.org"]) assert.throws(() => emailValue(value));
  assert.equal(emailValue(" O'Neil+team@example.org "), "o'neil+team@example.org");
});

test("JSON verwirft primitive Bodies, gefährliche Schlüssel und übermäßige Verschachtelung", async () => {
  for (const body of ['null', '"text"', '{"__proto__":{"admin":true}}', '{"nested":{"constructor":{"prototype":{}}}}', '['.repeat(34) + '0' + ']'.repeat(34)]) {
    await assert.rejects(readJson(new NextRequest("https://nextsession.de/api", { method: "POST", body })));
  }
  const password = "  secret<&>  ";
  const result = await readJson<{ password: string }>(new NextRequest("https://nextsession.de/api", { method: "POST", body: JSON.stringify({ password }) }));
  assert.equal(result.password, password);
});

test("Pläne und Vorlagen speichern ausschließlich geprüfte Felder und normalisierte Texte", () => {
  const exercise = { ...library[0], title: "  Sicher  ", unsafeExtra: { html: "<script>" } };
  const plan = validatePlans({ plans: { "2026-09-13": [exercise] }, planMeta: {} });
  assert.equal(plan.plans["2026-09-13"][0].title, "Sicher");
  assert.ok(!("unsafeExtra" in plan.plans["2026-09-13"][0]));
  const input = { id: "template", name: "  Test  ", kind: "plan", exercises: [exercise], unsafeExtra: "x" };
  const [template] = validateTemplates([input]);
  assert.equal(template.name, "Test");
  assert.ok(!("unsafeExtra" in template));
  assert.throws(() => validateTemplates([{ ...input, focus: [{}] }]));
  assert.throws(() => validateTemplates([{ ...input, autoApply: "true" }]));
  assert.throws(() => validateTemplates([{ ...input, kind: "phase", phase: "unknown" }]));
});
