import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import { Badge, Box, CardBody, Center, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { TRIPS_IHS_FieldIds, TRIPS_IHS_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate } from '../hailer/api-helpers';
import { useApp } from '../hailer/use-app';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { MapPinIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [TRIPS_IHS_PhaseIds.triage_from_support_tickets_b0e]: { label: 'Triage', color: 'gray', accent: 'gray.400' },
  [TRIPS_IHS_PhaseIds.waiting_on_dates_b14]: { label: 'Waiting on Dates', color: 'yellow', accent: 'yellow.400' },
  [TRIPS_IHS_PhaseIds.waiting_on_po_b13]: { label: 'Waiting on PO', color: 'orange', accent: 'orange.400' },
  [TRIPS_IHS_PhaseIds.pretravel_activities_b0f]: { label: 'Pre-Travel', color: 'blue', accent: 'blue.400' },
  [TRIPS_IHS_PhaseIds.in_progress_b11]: { label: 'In Progress', color: 'purple', accent: 'purple.400' },
  [TRIPS_IHS_PhaseIds.followup_activities_b12]: { label: 'Follow-Up', color: 'teal', accent: 'teal.400' },
  [TRIPS_IHS_PhaseIds.closed_b10]: { label: 'Closed', color: 'green', accent: 'green.400' },
};

export default function TripGrid({ hailer, customerId, onCount }: Props) {
  const { user } = useApp();
  const [trips, setTrips] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.trips, PHASES.trips);
        if (cancelled) return;
        const mine = filterByLink(all, TRIPS_IHS_FieldIds.customer_b16, customerId);
        setTrips(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load trips');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hailer, customerId]);

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (trips.length === 0)
    return <EmptyState icon={MapPinIcon} text="No trips / IHS visits on file for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
      {trips.map((t) => {
        const f = t.fields ?? {};
        const phase = PHASE_LABELS[t.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const ticketCode = f[TRIPS_IHS_FieldIds.ticket_code_b27] as string | undefined;
        const purpose = f[TRIPS_IHS_FieldIds.purpose_for_onsite_trip_b2b] as string | undefined;
        const tripType = f[TRIPS_IHS_FieldIds.service_trip_type_b2e] as string | undefined;
        const arrivalMs = f[TRIPS_IHS_FieldIds.estimated_arrival_date_b35] as number | undefined;
        const daysOnsite = f[TRIPS_IHS_FieldIds.days_onsite_b39] as number | undefined;
        const engineerId = f[TRIPS_IHS_FieldIds.assigned_engineer_b37] as string | undefined;
        const engineer = engineerId ? user.map[engineerId] : undefined;
        const engineerName = engineer ? `${engineer.firstname} ${engineer.lastname}`.trim() : undefined;

        return (
          <ClickableCard
            key={t._id}
            accentColor={phase.accent}
            onOpen={() => void hailer.ui.activity.open(t._id)}
          >
            <CardBody>
              <HStack justify="space-between" align="start" mb={2}>
                <Heading fontSize="sm" noOfLines={1}>{ticketCode || t.name}</Heading>
                <Badge colorScheme={phase.color} flexShrink={0}>{phase.label}</Badge>
              </HStack>
              {(purpose || tripType) && (
                <Text fontSize="xs" color="subtleText" mb={2}>
                  {[purpose, tripType].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Box fontSize="xs" color="subtleText">
                {arrivalMs != null && <Text>Arrival: {formatDate(arrivalMs)}</Text>}
                {daysOnsite != null && <Text>Onsite: {daysOnsite} day{daysOnsite === 1 ? '' : 's'}</Text>}
                {engineerName && <Text>Engineer: {engineerName}</Text>}
              </Box>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
