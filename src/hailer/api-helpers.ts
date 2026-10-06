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
    // activity.currentPhase coming back from list() is unreliable — but since this call
    // itself specified phaseId, we already know with certainty which phase every item in
    // this page belongs to. Stamp it, overriding whatever (possibly wrong) value came back.
    all.push(...page.map((a) => ({ ...a, currentPhase: phaseId })));
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

// A file-modifier field's value is a JSON-stringified array of file IDs.
// Returns the first one, or null if the field is empty/unset.
export function firstFileId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0]);
  } catch {
    // not JSON — ignore
  }
  return null;
}

export function hailerImageUrl(fileId: string, size: 'hires' | 'thumb' = 'hires'): string {
  return `https://api.hailer.com/image/${size}/${fileId}`;
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
