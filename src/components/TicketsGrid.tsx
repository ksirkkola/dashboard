import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Avatar,
  Badge,
  Box,
  CardBody,
  Center,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Support_Tickets_FieldIds, Support_Tickets_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatMoney } from '../hailer/api-helpers';
import { useApp } from '../hailer/use-app';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { TicketIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [Support_Tickets_PhaseIds.new_ticket_bea]: { label: 'New', color: 'blue', accent: 'blue.400' },
  [Support_Tickets_PhaseIds.triage_2aa]: { label: 'Triage', color: 'yellow', accent: 'yellow.400' },
  [Support_Tickets_PhaseIds.working_with_client_015]: { label: 'Working with Client', color: 'teal', accent: 'teal.400' },
  [Support_Tickets_PhaseIds.software_upgrade_4d5]: { label: 'Software Upgrade', color: 'cyan', accent: 'cyan.400' },
  [Support_Tickets_PhaseIds.followup_activities_beb]: { label: 'Follow-Up', color: 'purple', accent: 'purple.400' },
  [Support_Tickets_PhaseIds.waiting_on_billing_511]: { label: 'Waiting on Billing', color: 'orange', accent: 'orange.400' },
  [Support_Tickets_PhaseIds.done_bee]: { label: 'Done', color: 'gray', accent: 'gray.400' },
};

export default function TicketsGrid({ hailer, customerId, onCount }: Props) {
  const { user } = useApp();
  const [tickets, setTickets] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.supportTickets, PHASES.supportTickets);
        if (cancelled) return;
        const mine = filterByLink(all, Support_Tickets_FieldIds.customer_bd7, customerId);
        setTickets(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load tickets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hailer, customerId]);

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (tickets.length === 0)
    return <EmptyState icon={TicketIcon} text="No support tickets yet." />;

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {tickets.map((t) => {
        const f = t.fields ?? {};
        const phase = PHASE_LABELS[t.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const description = f[Support_Tickets_FieldIds.client_identified_issues_bd9] as string | undefined;
        const assetLinkValue = f[Support_Tickets_FieldIds.asset_792] as { name?: string } | { name?: string }[] | undefined;
        const asset = Array.isArray(assetLinkValue) ? assetLinkValue[0]?.name : assetLinkValue?.name;
        const budget = f[Support_Tickets_FieldIds.project_budget_bda] as number | undefined;
        const duration = f[Support_Tickets_FieldIds.project_duration_be8] as number | undefined;
        const engineerId = f[Support_Tickets_FieldIds.support_engineer_bdd] as string | undefined;
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
                <Heading fontSize="sm" noOfLines={1}>{t.name}</Heading>
                <Badge colorScheme={phase.color} flexShrink={0}>{phase.label}</Badge>
              </HStack>
              {description && (
                <Text fontSize="sm" color="subtleText" noOfLines={3} mb={2}>
                  {description}
                </Text>
              )}
              {engineerName && (
                <HStack spacing={2} mb={2}>
                  <Avatar name={engineerName} size="2xs" />
                  <VStack spacing={0} align="start">
                    <Text fontSize="2xs" color="subtleText" textTransform="uppercase" letterSpacing="wider" lineHeight="1">
                      Support Engineer
                    </Text>
                    <Text fontSize="xs" fontWeight="semibold" lineHeight="1.3">{engineerName}</Text>
                  </VStack>
                </HStack>
              )}
              <Box fontSize="xs" color="subtleText">
                {asset && <Text noOfLines={1}>Asset: {asset}</Text>}
                {budget != null && <Text>Budget: {formatMoney(budget)}</Text>}
                {duration != null && <Text>Duration: {duration} day{duration === 1 ? '' : 's'}</Text>}
              </Box>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
