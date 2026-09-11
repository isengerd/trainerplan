import assert from "node:assert/strict";
import test from "node:test";
import { closeTemplateNavigation, openTemplateNavigation, templateModeFromUrl } from "./template-navigation";

function browser(href: string) {
  const entries = [{ href, state: { nextSessionView: "plan" } as Record<string, unknown> }];
  let index = 0;
  return {
    location: { get href() { return entries[index].href; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state: Record<string, unknown>, _title: string, url?: string | URL | null) {
        entries.splice(index + 1);
        entries.push({ href: String(url), state });
        index++;
      },
      replaceState(state: Record<string, unknown>, _title: string, url?: string | URL | null) { entries[index] = { href: String(url), state }; },
      back() { index = Math.max(0, index - 1); },
    },
    forward() { index = Math.min(entries.length - 1, index + 1); },
    get length() { return entries.length; },
  };
}

test("Template tabs share one entry; Back returns to the original plan and Forward restores the mode and date", () => {
  const host = browser("https://nextsession.de/app?bereich=plan&team=f2");
  openTemplateNavigation(host, "browse", "2026-09-18", false);
  openTemplateNavigation(host, "save", "2026-09-18", true);
  assert.equal(host.length, 2);
  assert.equal(templateModeFromUrl(host.location.href), "save");
  assert.equal(host.history.state.templateDate, "2026-09-18");
  assert.equal(closeTemplateNavigation(host), true);
  assert.equal(host.location.href, "https://nextsession.de/app?bereich=plan&team=f2");
  host.forward();
  assert.equal(templateModeFromUrl(host.location.href), "save");
  assert.equal(host.history.state.templateDate, "2026-09-18");
});

test("Closing a direct template link stays in the app instead of navigating to an external predecessor", () => {
  const host = browser("https://nextsession.de/app?bereich=plan&vorlagen=browse");
  assert.equal(closeTemplateNavigation(host), false);
  assert.equal(host.location.href, "https://nextsession.de/app?bereich=plan");
  assert.equal(host.length, 1);
});

test("Unrelated pages and invalid template modes do not open the template view", () => {
  assert.equal(templateModeFromUrl("https://nextsession.de/app?bereich=team&vorlagen=save"), null);
  assert.equal(templateModeFromUrl("https://nextsession.de/app?bereich=plan&vorlagen=unknown"), null);
  assert.equal(templateModeFromUrl("https://nextsession.de/app?bereich=plan"), null);
});
