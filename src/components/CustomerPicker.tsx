import { Activity, HailerApi } from '@hailer/app-sdk';
import {
  Box, Button, Input, Popover, PopoverBody, PopoverContent, PopoverTrigger, Skeleton, Text,
  VStack, useColorModeValue, useDisclosure,
} from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
}

// Searchable dropdown in the same style as the HR Employee Directory list:
// a search box above clickable rows, selected row highlighted, "x of N" count underneath.
export default function CustomerPicker({ hailer, selectedId, onSelect }: Props) {
  const [customers, setCustomers] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const searchRef = useRef<HTMLInputElement>(null);

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.600');
  const popBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchAllPhases(hailer, WORKFLOWS.customers, PHASES.customers);
      if (cancelled) return;
      const sorted = [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setCustomers(sorted);
      setLoading(false);
      if (!selectedId && sorted.length > 0) {
        onSelect(sorted[0]._id, sorted[0].name);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hailer]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? customers.filter((c) => (c.name ?? '').toLowerCase().includes(q)) : customers;
  }, [customers, search]);

  const selected = customers.find((c) => c._id === selectedId) ?? null;

  function choose(c: Activity) {
    onSelect(c._id, c.name);
    setSearch('');
    onClose();
  }

  if (loading) return <Skeleton height="2.5rem" maxW="20rem" />;

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={() => { setSearch(''); onClose(); }}
      placement="bottom-start"
      initialFocusRef={searchRef}
      isLazy
    >
      <PopoverTrigger>
        <Button
          size="sm" variant="outline" w="20rem" maxW="100%" justifyContent="space-between"
          fontWeight="medium" rightIcon={<Text as="span" fontSize="xs">▾</Text>}
        >
          <Text as="span" isTruncated>{selected?.name ?? 'Select a customer'}</Text>
        </Button>
      </PopoverTrigger>
      <PopoverContent w="20rem" maxW="90vw" bg={popBg}>
        <PopoverBody p={3}>
          <Input
            ref={searchRef} size="sm" mb={3} placeholder="Search customers..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && filtered.length > 0) choose(filtered[0]); }}
          />
          <VStack
            align="stretch" spacing={0} border="1px" borderColor={borderColor} borderRadius="md"
            overflowY="auto" maxH="18rem"
          >
            {filtered.length === 0 ? (
              <Text fontSize="sm" color={mutedText} p={3}>No customers match.</Text>
            ) : (
              filtered.map((c) => (
                <Box
                  key={c._id} px={3} py={2} cursor="pointer"
                  bg={c._id === selectedId ? selectedBg : undefined}
                  _hover={{ bg: c._id === selectedId ? selectedBg : hoverBg }}
                  onClick={() => choose(c)}
                  borderBottom="1px" borderColor={borderColor}
                  sx={{ '&:last-child': { borderBottom: 'none' } }}
                >
                  <Text fontSize="sm" fontWeight={c._id === selectedId ? 'semibold' : 'medium'} noOfLines={1}>
                    {c.name}
                  </Text>
                </Box>
              ))
            )}
          </VStack>
          <Text fontSize="xs" color={mutedText} mt={2}>
            {filtered.length} of {customers.length} customer{customers.length === 1 ? '' : 's'}
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
