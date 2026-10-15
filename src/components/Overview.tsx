import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Badge, Box, Button, Center, Flex, Heading, HStack, Progress, Select, SimpleGrid, Skeleton, Spinner, Table, TableContainer,
  Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import {
  Assets_FieldIds, Customers_FieldIds, Opportunity_PhaseIds, Support_Tickets_PhaseIds,
} from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, formatMoney } from '../hailer/api-helpers';
import StatTile from './StatTile';
import OutreachSelect, { OUTREACH_OPTIONS, outreachDateOf, outreachOf } from './OutreachSelect';
import OverviewMap from './OverviewMap';

const DAY = 24 * 60 * 60 * 1000;
const str = (a: Activity, id: string) => (a.fields?.[id] as string | undefined) ?? '';
const num = (a: Activity, id: string) => (typeof a.fields?.[id] === 'number' ? (a.fields?.[id] as number) : 0);
const linkId = (v: unknown): string | null => {
  if (Array.isArray(v)) return (v[0] as { _id?: string } | undefined)?._id ?? null;
  if (v && typeof v === 'object') return (v as { _id?: string })._id ?? null;
  return null;
};
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const overdueText = (days: number) => {
  const m = Math.floor(days / 30.44);
  if (m < 1) return `${days} day${days === 1 ? '' : 's'}`;
  if (m < 24) return `${m} month${m === 1 ? '' : 's'}`;
  const y = Math.floor(m / 12);
  return `${y} year${y === 1 ? '' : 's'}`;
};

interface Props {
  hailer: HailerApi;
  refreshKey?: number;
  onSelectCustomer: (id: string, name: string) => void;
}

interface Data {
  customers: Activity[];
  assets: Activity[];
  tickets: Activity[];
  opps: Activity[];
}

export default function Overview({ hailer, refreshKey, onSelectCustomer }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const [outreachFilter, setOutreachFilter] = useState('Not contacted');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [customers, assets, tickets, opps] = await Promise.all([
          fetchAllPhases(hailer, WORKFLOWS.customers, PHASES.customers),
          fetchAllPhases(hailer, WORKFLOWS.assets, PHASES.assets),
          fetchAllPhases(hailer, WORKFLOWS.supportTickets, PHASES.supportTickets).catch(() => [] as Activity[]),
          fetchAllPhases(hailer, WORKFLOWS.opportunity, PHASES.opportunity).catch(() => [] as Activity[]),
        ]);
        if (!cancelled) setData({ customers, assets, tickets, opps });
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load the overview');
      }
    })();
    return () => { cancelled = true; };
  }, [hailer, refreshKey]);

  const calc = useMemo(() => {
    if (!data) return null;
    const statusOf = (c: Activity) => str(c, Customers_FieldIds.client_status_7d2);
    // Inactive customers, and their assets, are left out everywhere (same as the customer list).
    const visible = data.customers.filter((c) => statusOf(c) !== 'Inactive');
    const byId = new Map(visible.map((c) => [c._id, c]));
    const active = visible.filter((c) => statusOf(c) !== 'Prospect');
    const prospects = visible.filter((c) => statusOf(c) === 'Prospect');

    const countryOf = (c: Activity) => str(c, Customers_FieldIds.company_country_9a0) || 'Unknown';
    const byCountry: Record<string, { all: number; active: number; prospects: number }> = {};
    visible.forEach((c) => {
      const k = countryOf(c);
      const e = (byCountry[k] ??= { all: 0, active: 0, prospects: 0 });
      e.all += 1;
      if (statusOf(c) === 'Prospect') e.prospects += 1; else e.active += 1;
    });
    const countries = Object.entries(byCountry).sort((a, b) => b[1].all - a[1].all || a[0].localeCompare(b[0]));

    // Assets: not retired, and owned by a customer shown on the dashboard.
    const assets = data.assets.filter((a) => str(a, 'status') !== 'Retired' && byId.has(linkId(a.fields?.[Assets_FieldIds.company_340]) ?? ''));
    const familyCount: Record<string, number> = {};
    assets.forEach((a) => {
      const k = str(a, Assets_FieldIds.product_family_23a) || 'No family set';
      familyCount[k] = (familyCount[k] ?? 0) + 1;
    });
    const families = Object.entries(familyCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const now = Date.now();
    const withDue = assets.filter((a) => num(a, Assets_FieldIds.calibration_due_f5e) > 0);
    const overdue = withDue
      .filter((a) => num(a, Assets_FieldIds.calibration_due_f5e) < now)
      .map((a) => {
        const due = num(a, Assets_FieldIds.calibration_due_f5e);
        const cust = byId.get(linkId(a.fields?.[Assets_FieldIds.company_340]) ?? '');
        return { a, due, days: Math.floor((now - due) / DAY), cust };
      })
      .sort((x, y) => y.days - x.days);
    const dueSoon = withDue.filter((a) => {
      const d = num(a, Assets_FieldIds.calibration_due_f5e);
      return d >= now && d < now + 90 * DAY;
    }).length;
    const noDue = assets.length - withDue.length;
    const iso = assets.filter((a) => str(a, Assets_FieldIds.iso_17025_04e) === 'Yes').length;
    const buckets = [
      { label: 'Under 6 months', n: overdue.filter((o) => o.days < 183).length },
      { label: '6 to 12 months', n: overdue.filter((o) => o.days >= 183 && o.days < 365).length },
      { label: '1 to 3 years', n: overdue.filter((o) => o.days >= 365 && o.days < 1095).length },
      { label: 'Over 3 years', n: overdue.filter((o) => o.days >= 1095).length },
    ];
    const customersOverdue = new Set(overdue.map((o) => o.cust?._id)).size;

    const openTickets = data.tickets.filter((t) => t.currentPhase !== Support_Tickets_PhaseIds.done_bee && t.currentPhase !== Support_Tickets_PhaseIds.duplicate_455).length;
    const openOpps = data.opps.filter((o) => o.currentPhase !== Opportunity_PhaseIds.closed_won_dc0 && o.currentPhase !== Opportunity_PhaseIds.closed_lost_0ee).length;
    const totalWon = visible.reduce((t, c) => t + num(c, Customers_FieldIds.total_won_898), 0);
    const withAssets = new Set(assets.map((a) => linkId(a.fields?.[Assets_FieldIds.company_340])));
    // Agents: customers that other customers name as their Agent. They sell on our behalf and hold no equipment.
    const agentOf = (c: Activity) => linkId(c.fields?.[Customers_FieldIds.agent_e39]);
    const agentClients = new Map<string, number>();
    visible.forEach((c) => { const id = agentOf(c); if (id) agentClients.set(id, (agentClients.get(id) ?? 0) + 1); });
    const agents = [...agentClients.entries()]
      .map(([id, n]) => ({
        id, n, name: byId.get(id)?.name ?? data.customers.find((c) => c._id === id)?.name ?? 'Unknown',
        clients: visible.filter((c) => agentOf(c) === id).sort((x, y) => x.name.localeCompare(y.name)),
      }))
      .sort((x, y) => y.n - x.n);
    const agentIds = new Set(agentClients.keys());
    const unlinkedAgentClients = visible.filter((c) => str(c, Customers_FieldIds.is_this_an_agent_client_0eb) === 'Yes' && !agentOf(c) && !agentIds.has(c._id)).length;
    const noAssets = active.filter((c) => !agentIds.has(c._id) && !withAssets.has(c._id)).length;

    // Calibration outreach is per client. Prospects, agents and clients that buy through an agent are not on the list.
    const agentNameOf = (c: Activity) => {
      const v = c.fields?.[Customers_FieldIds.agent_e39] as { name?: string } | { name?: string }[] | undefined;
      return (Array.isArray(v) ? v[0]?.name : v?.name) ?? '';
    };
    const inScope = active.filter((c) => !agentIds.has(c._id) && !agentOf(c) && withAssets.has(c._id));
    const contacted = inScope.filter((c) => outreachOf(c) !== 'Not contacted').length;
    const wants = inScope.filter((c) => outreachOf(c) === 'Wants a calibration');
    const clientRowsMap = new Map<string, { cust: Activity; n: number; oldestDays: number; oldestDue: number }>();
    overdue.forEach((o) => {
      if (!o.cust) return;
      const e = clientRowsMap.get(o.cust._id);
      if (!e) clientRowsMap.set(o.cust._id, { cust: o.cust, n: 1, oldestDays: o.days, oldestDue: o.due });
      else { e.n += 1; if (o.days > e.oldestDays) { e.oldestDays = o.days; e.oldestDue = o.due; } }
    });
    const clientRows = [...clientRowsMap.values()].map((r) => ({ ...r, agent: agentNameOf(r.cust) }));

    return {
      visible, active, prospects, byCountry, countries, countryOf, assets, families, overdue, dueSoon, noDue, iso, buckets,
      customersOverdue, openTickets, openOpps, totalWon, noAssets, agents, unlinkedAgentClients, inScope, contacted, wants, clientRows, now,
    };
  }, [data]);

  if (error) return <Center py={16}><Text color="red.500">{error}</Text></Center>;
  if (!calc) {
    return (
      <Box>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="84px" borderRadius="md" />)}</SimpleGrid>
        <Center py={10}><Spinner /></Center>
      </Box>
    );
  }

  const mapCounts = Object.fromEntries(calc.countries.map(([k, v]) => [k, v.all]));
  const maxFamily = Math.max(1, ...calc.families.map((f) => f[1]));
  const inCountry = country ? calc.visible.filter((c) => calc.countryOf(c) === country).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const rowsFiltered = calc.clientRows
    .filter((r) => outreachFilter === 'All' ? true : outreachFilter === 'Via agent' ? !!r.agent : !r.agent && outreachOf(r.cust) === outreachFilter)
    .sort((a, b) => (a.agent ? 1 : 0) - (b.agent ? 1 : 0) || b.oldestDays - a.oldestDays);
  const rowsShown = showAllOverdue ? rowsFiltered : rowsFiltered.slice(0, 10);
  const saved = (id: string, status: string, ms: number) =>
    setData((d) => d && ({ ...d, customers: d.customers.map((c) => c._id === id ? { ...c, fields: { ...c.fields, [Customers_FieldIds.calibration_outreach_dfa]: status, [Customers_FieldIds.calibration_outreach_last_contacted_dfe]: ms } } : c) }));
  const overdueAccent = calc.overdue.length > 0 ? 'red' : 'green';

  return (
    <Box>
      <Heading fontSize="2xl" mb={1}>Overview</Heading>
      <Text fontSize="sm" color={muted} mb={5}>
        Customers, equipment and calibrations at a glance. Inactive customers and retired assets are not counted. Click a customer, country or overdue row to open it.
      </Text>

      <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} spacing={3} mb={6}>
        <StatTile label="Clients" value={calc.active.length} accent="blue" hint={calc.agents.length > 0 ? `${calc.agents.length} agent${calc.agents.length === 1 ? '' : 's'} included` : 'active customers'} />
        <StatTile label="Prospects" value={calc.prospects.length} accent="orange" valueColor="orange.400" hint={`${calc.prospects.length + calc.active.length} incl. clients`} />
        <StatTile label="Countries" value={calc.countries.filter(([k]) => k !== 'Unknown').length} accent="cyan" />
        <StatTile label="Assets in service" value={calc.assets.length} accent="purple" hint={`${calc.iso} ISO 17025`} />
        <StatTile label="Calibrations overdue" value={calc.overdue.length} accent={overdueAccent} valueColor={calc.overdue.length > 0 ? 'red.400' : 'green.400'} hint={`${calc.customersOverdue} customer${calc.customersOverdue === 1 ? '' : 's'}`} />
        <StatTile label="Outreach: contacted" value={`${calc.contacted} of ${calc.inScope.length}`} accent="blue" hint="clients with equipment" />
        <StatTile label="Want a calibration" value={calc.wants.length} accent="green" valueColor={calc.wants.length > 0 ? 'green.400' : undefined} />
        <StatTile label="Due in 90 days" value={calc.dueSoon} accent={calc.dueSoon > 0 ? 'orange' : 'gray'} valueColor={calc.dueSoon > 0 ? 'orange.400' : undefined} />
        <StatTile label="Open support tickets" value={calc.openTickets} accent="teal" />
        <StatTile label="Open opportunities" value={calc.openOpps} accent="yellow" />
        <StatTile label="Total won" value={formatMoney(calc.totalWon)} accent="green" small />
      </SimpleGrid>

      <Flex gap={6} direction={{ base: 'column', xl: 'row' }} mb={6} align="flex-start">
        <Box flex="1.6" w="100%" minW={0} bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" p={4}>
          <Heading fontSize="md" mb={1}>Clients by country</Heading>
          <Text fontSize="xs" color={muted} mb={3}>The number in each circle is the clients in that country. Click a country to list them.</Text>
          <OverviewMap counts={mapCounts} selected={country} onSelect={setCountry} />
          {mapCounts.Unknown ? <Text fontSize="xs" color={muted} mt={2}>{mapCounts.Unknown} customer(s) have no country set.</Text> : null}
        </Box>

        <Box flex="1" w="100%" minW={0} bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" p={4}>
          <HStack justify="space-between" mb={2}>
            <Heading fontSize="md">{country ? country : 'Clients by country'}</Heading>
            {country && <Button size="xs" variant="ghost" onClick={() => setCountry(null)}>Show all countries</Button>}
          </HStack>
          {country ? (
            <Box>
              {inCountry.map((c) => (
                <Flex key={c._id} py={1.5} px={2} borderBottom="1px" borderColor={borderColor} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} justify="space-between" onClick={() => onSelectCustomer(c._id, c.name)}>
                  <Text fontSize="sm" noOfLines={1}>{c.name}</Text>
                  <HStack spacing={1}>
                    {str(c, Customers_FieldIds.client_status_7d2) === 'Prospect' && <Badge colorScheme="orange" variant="subtle" fontSize="2xs">Prospect</Badge>}
                    {calc.agents.some((g) => g.id === c._id) && <Badge colorScheme="purple" variant="subtle" fontSize="2xs">Agent</Badge>}
                  </HStack>
                </Flex>
              ))}
            </Box>
          ) : (
            <TableContainer maxH="640px" overflowY="auto">
              <Table size="sm">
                <Thead><Tr><Th>Country</Th><Th isNumeric>Clients</Th><Th isNumeric>Prospects</Th></Tr></Thead>
                <Tbody>
                  {calc.countries.map(([k, v]) => (
                    <Tr key={k} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} onClick={() => setCountry(k)}>
                      <Td fontWeight="medium">{k}</Td>
                      <Td isNumeric>{v.active}</Td>
                      <Td isNumeric color={v.prospects ? undefined : muted}>{v.prospects || '–'}</Td>
                    </Tr>
                  ))}
                  <Tr fontWeight="bold"><Td>Total</Td><Td isNumeric>{calc.active.length}</Td><Td isNumeric>{calc.prospects.length || '–'}</Td></Tr>
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Flex>

      <Flex gap={6} direction={{ base: 'column', xl: 'row' }} align="flex-start" mb={6}>
        <Box flex="1" w="100%" minW={0} bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" p={4}>
          <Heading fontSize="md" mb={3}>Assets by type <Text as="span" fontWeight="normal" color={muted} fontSize="sm">({calc.assets.length} in service)</Text></Heading>
          {calc.families.map(([name, n]) => (
            <Box key={name} mb={2.5}>
              <Flex justify="space-between" fontSize="sm"><Text fontWeight="medium">{name}</Text><Text fontWeight="semibold">{n}</Text></Flex>
              <Progress value={(n / maxFamily) * 100} size="xs" borderRadius="full" colorScheme="purple" />
            </Box>
          ))}
        </Box>

        <Box flex="1.4" w="100%" minW={0} bg={cardBg} border="1px" borderColor={calc.overdue.length > 0 ? 'red.300' : borderColor} borderRadius="md" p={4}>
          <Heading fontSize="md" mb={1}>Overdue calibrations <Text as="span" fontWeight="normal" color={muted} fontSize="sm">({calc.overdue.length})</Text></Heading>
          <Text fontSize="xs" color={muted} mb={3}>
            Assets in service whose calibration due date has passed. {calc.noDue > 0 ? `${calc.noDue} asset${calc.noDue === 1 ? ' has' : 's have'} no due date and ${calc.noDue === 1 ? 'is' : 'are'} not counted. ` : ''}
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2} mb={4}>
            {calc.buckets.map((b) => (
              <Box key={b.label} border="1px" borderColor={borderColor} borderRadius="md" px={3} py={2}>
                <Text fontSize="2xs" color={muted} textTransform="uppercase" letterSpacing="wider">{b.label}</Text>
                <Text fontSize="xl" fontWeight="bold" color={b.n > 0 ? 'red.400' : undefined}>{b.n}</Text>
              </Box>
            ))}
          </SimpleGrid>
          {calc.overdue.length === 0 ? (
            <Text color={muted} fontSize="sm">Nothing is overdue.</Text>
          ) : (
            <>
              <HStack mb={3} spacing={3} flexWrap="wrap">
                <Text fontSize="sm" fontWeight="semibold">Clients to call</Text>
                <Select size="sm" maxW="230px" value={outreachFilter} onChange={(e) => { setOutreachFilter(e.target.value); setShowAllOverdue(false); }}>
                  <option value="Not contacted">Not contacted yet</option>
                  {OUTREACH_OPTIONS.filter((o) => o !== 'Not contacted').map((o) => <option key={o} value={o}>{o}</option>)}
                  <option value="Via agent">Through an agent</option>
                  <option value="All">All with overdue assets</option>
                </Select>
                <Text fontSize="xs" color={muted}>{rowsFiltered.length} client{rowsFiltered.length === 1 ? '' : 's'}</Text>
              </HStack>
              {rowsFiltered.length === 0 ? (
                <Text color={muted} fontSize="sm" py={2}>No clients in this group.</Text>
              ) : (
                <TableContainer>
                  <Table size="sm">
                    <Thead><Tr><Th>Client</Th><Th isNumeric>Overdue assets</Th><Th>Oldest due</Th><Th>Outreach</Th></Tr></Thead>
                    <Tbody>
                      {rowsShown.map((r) => (
                        <Tr key={r.cust._id} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} onClick={() => onSelectCustomer(r.cust._id, r.cust.name)}>
                          <Td maxW="240px" whiteSpace="normal"><Text fontWeight="medium" noOfLines={1}>{r.cust.name}</Text><Text fontSize="xs" color={muted}>{calc.countryOf(r.cust)}</Text></Td>
                          <Td isNumeric>{r.n}</Td>
                          <Td whiteSpace="nowrap"><Text color="red.400" fontWeight="semibold">{overdueText(r.oldestDays)}</Text><Text fontSize="xs" color={muted}>{fmtDate(r.oldestDue)}</Text></Td>
                          <Td>
                            {r.agent ? (
                              <Text fontSize="sm" color={muted}>Through {r.agent}</Text>
                            ) : (
                              <OutreachSelect key={r.cust._id} hailer={hailer} customer={r.cust} size="xs" onSaved={saved} />
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
              {rowsFiltered.length > 10 && (
                <Button size="sm" variant="ghost" mt={2} onClick={() => setShowAllOverdue((v) => !v)}>
                  {showAllOverdue ? 'Show fewer' : `Show all ${rowsFiltered.length}`}
                </Button>
              )}
            </>
          )}
        </Box>
      </Flex>

      {calc.wants.length > 0 && (
        <Box bg={cardBg} border="1px" borderColor="green.300" borderRadius="md" p={4} mb={6}>
          <Heading fontSize="md" mb={1}>Want a calibration <Text as="span" fontWeight="normal" color={muted} fontSize="sm">({calc.wants.length})</Text></Heading>
          <Text fontSize="xs" color={muted} mb={3}>Clients that said yes when contacted. These are for sales to follow up. Click one to open it.</Text>
          {[...calc.wants].sort((a, b) => outreachDateOf(b) - outreachDateOf(a)).map((c) => (
            <Flex key={c._id} py={1.5} px={2} borderBottom="1px" borderColor={borderColor} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} justify="space-between" onClick={() => onSelectCustomer(c._id, c.name)}>
              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{c.name} <Text as="span" color={muted} fontWeight="normal">{calc.countryOf(c)}</Text></Text>
              <Text fontSize="xs" color={muted} whiteSpace="nowrap">{outreachDateOf(c) > 0 ? fmtDate(outreachDateOf(c)) : ''}</Text>
            </Flex>
          ))}
        </Box>
      )}

      {calc.agents.length > 0 && (
        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" p={4} mb={6}>
          <Heading fontSize="md" mb={1}>Clients through agents</Heading>
          <Text fontSize="xs" color={muted} mb={3}>The clients that buy through each agent. Click a name to open it.</Text>
          {calc.agents.map((g) => (
            <Box key={g.id} mb={4}>
              <Flex py={1.5} px={2} borderBottom="1px" borderColor={borderColor} cursor="pointer" _hover={{ bg: 'blackAlpha.100' }} justify="space-between" onClick={() => onSelectCustomer(g.id, g.name)}>
                <HStack><Text fontSize="sm" fontWeight="semibold">{g.name}</Text><Badge colorScheme="purple" variant="subtle" fontSize="2xs">Agent</Badge></HStack>
                <Text fontSize="sm" fontWeight="semibold">{g.n} client{g.n === 1 ? '' : 's'}</Text>
              </Flex>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacingX={4} px={2} pt={2}>
                {g.clients.map((c) => (
                  <Text key={c._id} fontSize="sm" py={0.5} noOfLines={1} cursor="pointer" _hover={{ textDecoration: 'underline' }} onClick={() => onSelectCustomer(c._id, c.name)}>
                    {c.name.trim()} <Text as="span" fontSize="xs" color={muted}>{calc.countryOf(c)}</Text>
                  </Text>
                ))}
              </SimpleGrid>
            </Box>
          ))}
          {calc.unlinkedAgentClients > 0 && (
            <Text fontSize="xs" color="orange.400" mt={3}>{calc.unlinkedAgentClients} customer{calc.unlinkedAgentClients === 1 ? ' is' : 's are'} marked as an agent client but {calc.unlinkedAgentClients === 1 ? 'has' : 'have'} no agent linked yet.</Text>
          )}
        </Box>
      )}

      <Text fontSize="xs" color={muted}>
        {calc.noAssets > 0 ? `${calc.noAssets} active customer${calc.noAssets === 1 ? ' has' : 's have'} no assets on record. ` : ''}Agents are not counted there. Total won is the sum of Total Won on the customer records.
      </Text>
    </Box>
  );
}
