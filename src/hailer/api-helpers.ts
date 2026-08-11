import { Activity, HailerApi } from '@hailer/app-sdk';

export async function fetchAllPhases(
  hailer: HailerApi,
  workflowId: string,
  phaseIds: string[],
): Promise<Activity[]> {
  const results = await Promise.all(
    phaseIds.map((p) => hailer.activity.list(workflowId, p).catch(() => [] as Activity[])),
  );
  return results.flat();
}

export function filterByLink(
  activities: Activity[],
  linkFieldId: string,
  targetId: string,
): Activity[] {
  return activities.filter((a) => {
    const v = a.fields?.[linkFieldId] as
      | { _id?: string }
      | { _id?: string }[]
      | undefined;
    if (!v) return false;
    if (Array.isArray(v)) return v.some((x) => x?._id === targetId);
    return v._id === targetId;
  });
}

export function formatDate(unixMs: number | undefined | null): string {
  if (unixMs == null) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(unixMs));
}

export function formatMoney(value: number | undefined | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}
