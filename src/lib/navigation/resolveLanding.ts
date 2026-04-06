export type AppLandingMode = "manage" | "work" | "sole-trader" | "timesheet" | "intro";

export function resolveLandingPath(mode: AppLandingMode): string {
  switch (mode) {
    case "timesheet":
      return "/timesheet";
    case "intro":
      return "/";
    case "manage":
    case "work":
    case "sole-trader":
    default:
      return "/";
  }
}
