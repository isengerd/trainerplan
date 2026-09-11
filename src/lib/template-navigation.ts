export type TemplateMode = "browse" | "save";
type NavigationHost = {
  location: { href: string };
  history: Pick<History, "state" | "pushState" | "replaceState" | "back">;
};

export function templateModeFromUrl(href: string): TemplateMode | null {
  const url = new URL(href);
  const mode = url.searchParams.get("vorlagen");
  return url.searchParams.get("bereich") === "plan" && (mode === "browse" || mode === "save") ? mode : null;
}

export function openTemplateNavigation(host: NavigationHost, mode: TemplateMode, date: string, replace: boolean) {
  const url = new URL(host.location.href);
  url.searchParams.set("bereich", "plan");
  url.searchParams.set("vorlagen", mode);
  const state = { ...host.history.state, nextSessionTemplatePage: true, templateDate: date };
  if (replace) host.history.replaceState(state, "", url);
  else host.history.pushState(state, "", url);
}

/** Returns true when the popstate listener will finish closing the view. */
export function closeTemplateNavigation(host: NavigationHost): boolean {
  if (host.history.state?.nextSessionTemplatePage) {
    host.history.back();
    return true;
  }
  // A direct link has no app-owned parent entry: stay in this app.
  const url = new URL(host.location.href);
  url.searchParams.delete("vorlagen");
  host.history.replaceState(host.history.state, "", url);
  return false;
}
