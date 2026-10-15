import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Center, Spinner, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Assets_FieldIds, Customers_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases } from '../hailer/api-helpers';
import EmptyState from './EmptyState';
import { UsersIcon } from './Icons';

const str = (a: Activity, id: string) => (a.fields?.[id] as string | undefined) ?? '';
const linkId = (v: unknown): string | null => {
  if (Array.isArray(v)) return (v[0] as { _id?: string } | undefined)?._id ?? null;
  if (v && typeof v === 'object') return (v as { _id?: string })._id ?? null;
  return null;
};
const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

interface Props {
  hailer: HailerApi;
  agentId: string;
  refreshKey?: number;
  onCount?: (n: number) => void;
  onSelectCustomer: (id: string, name: string) => void;
}

// The customers that buy through this agent, with how many assets they hold and how many are overdue.
export default function AgentClients({ hailer, agentId, refreshKey, onCount, onSelectCustomer }: Props) {
  const [customers, setCustomers] = useState<Activity[] | null>(null);
  const [assets, setAssets] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const muted = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [c, a] = await Promise.all([
          fetchAllPhases(hailer, WORKFLOWS.customers, PHASES.customers),
          fetchAllPhases(hailer, WORKFLOWS.assets, PHASES.assets).catch(() => [] as Activity[]),
        ]);
        if (cancelled) return;
        setCustomers(c);
        setAssets(a);
        const n = c.filter((x) => linkId(x.fields?.[Customers_FieldIds.agent_e39]) === agentId && !['Inactive', 'Prospect'].includes(str(x, Customers_FieldIds.client_status_7d2))).length;
        onCount?.(n);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load the clients');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hailer, agentId, refreshKey]);

  const rows = useMemo(() => {
    if (!customers) return [];
    const now = Date.now();
    return customers
      .filter((c) => linkId(c.fields?.[Customers_FieldIds.agent_e39]) === agentId && !['Inactive', 'Prospect'].includes(str(c, Customers_FieldIds.client_status_7d2)))
      .map((c) => {
        const mine = assets.filter((a) => linkId(a.fields?.[Assets_FieldIds.company_340]) === c._id && a.fields?.[Assets_FieldIds.status_9b5] !== 'Retired');
        const dues = mine.map((a) => a.fields?.[Assets_FieldIds.calibration_due_f5e]).filter((d): d is number => typeof d === 'number' && d > 0);
        const overdue = dues.filter((d) => d < now);
        return { c, assets: mine.length, overdue: overdue.length, oldest: overdue.length ? Math.min(...overdue) : 0 };
      })
      .sort((x, y) => x.c.name.localeCompare(y.c.name));
  }, [customers, assets, agentId]);

  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (!customers) return <Center py={12}><Spinner /></Center>;
  if (rows.length === 0) return <EmptyState icon={UsersIcon} text="No clients are linked to this agent." />;

  return (
    <>
      <Text fontSize="sm" color={muted} mb={3}>The clients that buy through this agent (prospects are not listed). Click a client to open it.</Text>
      <TableContainer>
        <Table size="sm">
          <Thead><Tr><Th>Client</Th><Th>Country</Th><Th isNumeric>Assets</Th><Th isNumeric>Overdue</Th><Th>Oldest due</Th></Tr></Thead>
          <Tbody>
            {rows.map(({ c, assets: n, overdue, oldest }) => (
              <Tr key={c._id} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} onClick={() => onSelectCustomer(c._id, c.name)}>
                <Td fontWeight="medium" maxW="320px" whiteSpace="normal">
                  {c.name.trim()}
                </Td>
                <Td>{str(c, Customers_FieldIds.company_country_9a0) || '—'}</Td>
                <Td isNumeric>{n}</Td>
                <Td isNumeric color={overdue ? 'red.400' : muted} fontWeight={overdue ? 'semibold' : undefined}>{overdue || '–'}</Td>
                <Td whiteSpace="nowrap" color={oldest ? 'red.400' : muted}>{oldest ? fmt(oldest) : '–'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}
