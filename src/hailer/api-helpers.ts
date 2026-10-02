import { Activity, HailerApi } from '@hailer/app-sdk';

const LIST_PAGE_SIZE = 200;

async function fetchAllInPhase(
  hailer: HailerApi,
  workflowId: string,
  phaseId: string,
): Promise<Activity[]> {
  const all: Activity[] = [];
  let skip = 0;
  for (;;) {
    let page: Activity[];
    try {
      page = await hailer.activity.list(workflowId, phaseId, {
        limit: LIST_PAGE_SIZE,
        skip,
      });
    } catch {
      break;
    }
    all.push(...page);
    if (page.length < LIST_PAGE_SIZE) break;
    skip += LIST_PAGE_SIZE;
  }
  return all;
}

export async function fetchAllPhases(
  hailer: HailerApi,
  workflowId: string,
  phaseIds: string[],
): Promise<Activity[]> {
  const results = await Promise.all(
    phaseIds.map((p) => fetchAllInPhase(hailer, workflowId, p)),
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
