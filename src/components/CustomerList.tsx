import { Activity, HailerApi } from '@hailer/app-sdk';
import { Badge, Box, HStack, Input, Skeleton, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Customers_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onOverview: () => void;
  onAgents?: (ids: Set<string>) => void;
  refreshKey?: number;
}

// Permanent customer list for the left side of the page, in the style of the HR Employee Directory:
// search box, clickable rows (name + country), selected row highlighted, "x of N" count underneath.
export default function CustomerList({ hailer, selectedId, onSelect, onOverview, onAgents, refreshKey }: Props) {
  const [customers, setCustomers] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchAllPhases(hailer, WORKFLOWS.customers, PHASES.customers);
      if (cancelled) return;
      // Inactive customers (and with them their assets) are not shown on the dashboard. Their records are untouched.
      const sorted = list
        .filter((c) => c.fields?.[Customers_FieldIds.client_status_7d2] !== 'Inactive')
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setCustomers(sorted);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hailer, refreshKey]);

  const countryOf = (c: Activity) => {
    const v = c.fields?.[Customers_FieldIds.company_country_9a0] as unknown;
    return typeof v === 'string' ? v : '';
  };

  // An agent is any customer that other customers name as their Agent.
  const agentIds = useMemo(() => {
    const s = new Set<string>();
    customers.forEach((c) => {
      const v = c.fields?.[Customers_FieldIds.agent_e39] as { _id?: string } | { _id?: string }[] | undefined;
      const id = Array.isArray(v) ? v[0]?._id : v?._id;
      if (id) s.add(id);
    });
    return s;
  }, [customers]);
  useEffect(() => { onAgents?.(agentIds); }, [agentIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const isAgent = (c: Activity) => agentIds.has(c._id);
  const isProspect = (c: Activity) => c.fields?.[Customers_FieldIds.client_status_7d2] === 'Prospect';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name ?? ''} ${countryOf(c)}`.toLowerCase().includes(q));
  }, [customers, search]);

  if (loading) return <Skeleton height="20rem" />;

  return (
    <Box>
      <Box
        px={3} py={2} mb={3} cursor="pointer" border="1px" borderColor={borderColor} borderRadius="md"
        bg={selectedId === null ? selectedBg : undefined} _hover={{ bg: selectedId === null ? selectedBg : hoverBg }}
        onClick={onOverview}
      >
        <Text fontSize="sm" fontWeight="semibold">Overview</Text>
        <Text fontSize="xs" color={mutedText}>Map, totals and calibrations</Text>
      </Box>
      <Input
        size="sm" mb={3} placeholder="Search customers..."
        value={search} onChange={(e) => setSearch(e.target.value)}
      />
      <VStack
        align="stretch" spacing={0} border="1px" borderColor={borderColor} borderRadius="md"
        overflowY="auto" maxH="calc(100vh - 11rem)"
      >
        {filtered.length === 0 ? (
          <Text fontSize="sm" color={mutedText} p={3}>No customers match.</Text>
        ) : (
          filtered.map((c) => (
            <Box
              key={c._id} px={3} py={2} cursor="pointer" flexShrink={0}
              bg={c._id === selectedId ? selectedBg : undefined}
              _hover={{ bg: c._id === selectedId ? selectedBg : hoverBg }}
              onClick={() => onSelect(c._id, c.name)}
              borderBottom="1px" borderColor={borderColor}
              sx={{ '&:last-child': { borderBottom: 'none' } }}
            >
              <HStack spacing={2} align="center">
                <Text fontSize="sm" fontWeight={c._id === selectedId ? 'semibold' : 'medium'} noOfLines={1}>{c.name}</Text>
                {isProspect(c) && <Badge colorScheme="orange" variant="subtle" fontSize="2xs" flexShrink={0}>Prospect</Badge>}
                {isAgent(c) && <Badge colorScheme="purple" variant="subtle" fontSize="2xs" flexShrink={0}>Agent</Badge>}
              </HStack>
              <Text fontSize="xs" color={mutedText} noOfLines={1}>{countryOf(c) || '—'}</Text>
            </Box>
          ))
        )}
      </VStack>
      <Text fontSize="xs" color={mutedText} mt={2}>
        {filtered.length} of {customers.length} customer{customers.length === 1 ? '' : 's'}
        {customers.some(isProspect) ? ` (${customers.filter(isProspect).length} prospects` : ''}{agentIds.size > 0 ? `${customers.some(isProspect) ? ', ' : ' ('}${agentIds.size} agent${agentIds.size === 1 ? '' : 's'})` : customers.some(isProspect) ? ')' : ''}
      </Text>
    </Box>
  );
}
