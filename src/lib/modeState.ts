export function getIsDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("isDemo") === "true";
}
