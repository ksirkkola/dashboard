import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import { Badge, Box, CardBody, Center, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Rentals_FieldIds, Rentals_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate, formatMoney } from '../hailer/api-helpers';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { TruckIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [Rentals_PhaseIds.discovery_0ce]: { label: 'Discovery', color: 'gray', accent: 'gray.400' },
  [Rentals_PhaseIds.proposal_50d]: { label: 'Proposal', color: 'blue', accent: 'blue.400' },
  [Rentals_PhaseIds.agreement_529]: { label: 'Agreement', color: 'purple', accent: 'purple.400' },
  [Rentals_PhaseIds.out_on_rental_549]: { label: 'Out on Rental', color: 'orange', accent: 'orange.400' },
  [Rentals_PhaseIds.returned_56a]: { label: 'Returned', color: 'teal', accent: 'teal.400' },
  [Rentals_PhaseIds.closed_completed_58c]: { label: 'Closed - Completed', color: 'green', accent: 'green.400' },
  [Rentals_PhaseIds.closed_lost_5a3]: { label: 'Closed - Lost', color: 'red', accent: 'red.400' },
};

function readLinkName(v: unknown): string | null {
  if (Array.isArray(v)) return (v[0] as { name?: string } | undefined)?.name || null;
  if (v && typeof v === 'object') return (v as { name?: string }).name || null;
  return null;
}

export default function RentalGrid({ hailer, customerId, onCount }: Props) {
  const [rentals, setRentals] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.rentals, PHASES.rentals);
        if (cancelled) return;
        const mine = filterByLink(all, Rentals_FieldIds.customer_654, customerId);
        setRentals(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load rentals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hailer, customerId]);

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (rentals.length === 0)
    return <EmptyState icon={TruckIcon} text="No rentals on file for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
      {rentals.map((r) => {
        const f = r.fields ?? {};
        const phase = PHASE_LABELS[r.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const unitName = readLinkName(f[Rentals_FieldIds.rental_unit_658]);
        const startMs = f[Rentals_FieldIds.rental_start_date_666] as number | undefined;
        const returnDueMs = f[Rentals_FieldIds.return_due_date_66b] as number | undefined;
        const actualReturnMs = f[Rentals_FieldIds.actual_return_date_66f] as number | undefined;
        const fee = f[Rentals_FieldIds.rental_fee_for_desired_time_length_679] as number | undefined;
        const shipTo = f[Rentals_FieldIds.ship_to_69f] as string | undefined;
        const overdue = r.currentPhase === Rentals_PhaseIds.out_on_rental_549
          && returnDueMs != null && returnDueMs < Date.now() && actualReturnMs == null;

        return (
          <ClickableCard
            key={r._id}
            accentColor={overdue ? 'red.400' : phase.accent}
            onOpen={() => void hailer.ui.activity.open(r._id)}
          >
            <CardBody>
              <HStack justify="space-between" align="start" mb={2}>
                <Heading fontSize="sm" noOfLines={1}>{unitName || r.name}</Heading>
                <Badge colorScheme={overdue ? 'red' : phase.color} flexShrink={0}>{overdue ? 'Overdue' : phase.label}</Badge>
              </HStack>
              <Box fontSize="xs" color="subtleText">
                {startMs != null && <Text>Start: {formatDate(startMs)}</Text>}
                {returnDueMs != null && (
                  <Text color={overdue ? 'red.400' : undefined} fontWeight={overdue ? 'semibold' : undefined}>
                    Due back: {formatDate(returnDueMs)}
                  </Text>
                )}
                {actualReturnMs != null && <Text>Returned: {formatDate(actualReturnMs)}</Text>}
                {fee != null && <Text>Fee: {formatMoney(fee)}</Text>}
                {shipTo && <Text noOfLines={1}>Ship to: {shipTo}</Text>}
              </Box>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
