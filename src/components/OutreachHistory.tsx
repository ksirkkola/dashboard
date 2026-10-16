import { Activity, HailerApi } from '@hailer/app-sdk';
import { Box, Button, HStack, Spinner, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useState } from 'react';
import { Customers_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { useApp } from '../hailer/use-app';

const AUTOMATION_USER = '6ac75f092c2e4a4f134afba6';
const STATUS_ID = Customers_FieldIds.calibration_outreach_dfa;

interface Change { when: number; who: string; status: string }

// Hailer keeps a snapshot of the record at every edit. A change is a snapshot whose status differs from the one before.
function statusOf(entry: any): string {
  const raw = entry?.[STATUS_ID] ?? entry?.fields?.[STATUS_ID] ?? entry?.fields?.calibrationOutreach ?? entry?.calibrationOutreach;
  const v = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw;
  return typeof v === 'string' && v ? v : 'Not contacted';
}

function changesOf(history: any[]): Change[] {
  const entries = [...history].sort((a, b) => (a?.updated ?? 0) - (b?.updated ?? 0));
  const out: Change[] = [];
  let prev = 'Not contacted';
  for (const e of entries) {
    const s = statusOf(e);
    if (typeof e?.updated === 'number' && s !== prev) out.push({ when: e.updated, who: e.uid ?? '', status: s });
    prev = s;
  }
  return out.reverse();
}

const fmt = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// The dated list of outreach status changes for one customer. Loads only when opened.
export default function OutreachHistory({ hailer, customer }: { hailer: HailerApi; customer: Activity }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Change[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const muted = useColorModeValue('gray.500', 'gray.400');

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || rows) return;
    setLoading(true);
    setError(null);
    try {
      const list = await hailer.activity.list(WORKFLOWS.customers, PHASES.customers[0], { includeHistory: true, limit: 200 });
      const me = list.find((a) => a._id === customer._id) as (Activity & { history?: any[] }) | undefined;
      setRows(changesOf(me?.history ?? []));
    } catch (err) {
      setError((err as { msg?: string })?.msg ?? 'Could not load the history');
    }
    setLoading(false);
  }

  const nameOf = (c: Change) => {
    if (c.who === AUTOMATION_USER) return 'Automatic';
    const u = user?.map?.[c.who];
    return u ? `${u.firstname} ${u.lastname}`.trim() : 'Someone';
  };

  return (
    <Box mt={1} onClick={(e) => e.stopPropagation()}>
      <Button size="xs" variant="link" onClick={() => void toggle()}>
        {open ? 'Hide history' : 'Outreach history'}
      </Button>
      {open && (
        <VStack align="stretch" spacing={1} mt={2}>
          {loading && <HStack><Spinner size="xs" /><Text fontSize="xs" color={muted}>Loading…</Text></HStack>}
          {error && <Text fontSize="xs" color="red.400">{error}</Text>}
          {rows && rows.length === 0 && <Text fontSize="xs" color={muted}>No outreach changes recorded yet.</Text>}
          {rows?.slice(0, 12).map((c, i) => (
            <Text key={i} fontSize="xs">
              <Text as="span" color={muted}>{fmt(c.when)} · {nameOf(c)} · </Text>
              <Text as="span" fontWeight="semibold">{c.status}</Text>
              {c.who === AUTOMATION_USER && c.status === 'Not contacted' && <Text as="span" color={muted}> (reset after a calibration or 10 months)</Text>}
            </Text>
          ))}
        </VStack>
      )}
    </Box>
  );
}
