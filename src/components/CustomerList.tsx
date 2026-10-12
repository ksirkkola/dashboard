import { Activity, HailerApi } from '@hailer/app-sdk';
import { Box, Input, Skeleton, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Customers_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  refreshKey?: number;
}

// Permanent customer list for the left side of the page, in the style of the HR Employee Directory:
// search box, clickable rows (name + country), selected row highlighted, "x of N" count underneath.
export default function CustomerList({ hailer, selectedId, onSelect, refreshKey }: Props) {
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
      const sorted = [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setCustomers(sorted);
      setLoading(false);
      if (!selectedId && sorted.length > 0) onSelect(sorted[0]._id, sorted[0].name);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hailer, refreshKey]);

  const countryOf = (c: Activity) => {
    const v = c.fields?.[Customers_FieldIds.company_country_9a0] as unknown;
    return typeof v === 'string' ? v : '';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name ?? ''} ${countryOf(c)}`.toLowerCase().includes(q));
  }, [customers, search]);

  if (loading) return <Skeleton height="20rem" />;

  return (
    <Box>
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
              <Text fontSize="sm" fontWeight={c._id === selectedId ? 'semibold' : 'medium'} noOfLines={1}>{c.name}</Text>
              <Text fontSize="xs" color={mutedText} noOfLines={1}>{countryOf(c) || '—'}</Text>
            </Box>
          ))
        )}
      </VStack>
      <Text fontSize="xs" color={mutedText} mt={2}>
        {filtered.length} of {customers.length} customer{customers.length === 1 ? '' : 's'}
      </Text>
    </Box>
  );
}
