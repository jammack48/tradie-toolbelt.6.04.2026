export function getTable(base: string, isDemo: boolean): string {
  return isDemo ? `demo_${base}` : `prod_${base}`;
}
