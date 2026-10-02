import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Badge,
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
import { Opportunity_FieldIds, Opportunity_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate, formatMoney } from '../hailer/api-helpers';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { TrendingIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

const CLOSED_PHASES: string[] = [Opportunity_PhaseIds.closed_won_dc0, Opportunity_PhaseIds.closed_lost_0ee];

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [Opportunity_PhaseIds.discovery_639]: { label: 'Discovery', color: 'blue', accent: 'blue.400' },
  [Opportunity_PhaseIds.proposal_aa6]: { label: 'Proposal', color: 'purple', accent: 'purple.400' },
  [Opportunity_PhaseIds.negotiations_eb1]: { label: 'Negotiations', color: 'orange', accent: 'orange.400' },
  [Opportunity_PhaseIds.closed_won_dc0]: { label: 'Won', color: 'green', accent: 'green.400' },
  [Opportunity_PhaseIds.closed_lost_0ee]: { label: 'Lost', color: 'red', accent: 'red.400' },
};

export default function OpportunitiesGrid({ hailer, customerId, onCount }: Props) {
  const [opps, setOpps] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.opportunity, PHASES.opportunity);
        if (cancelled) return;
        const mine = filterByLink(all, Opportunity_FieldIds.lead_information_8ba, customerId);
        const open = mine.filter((o) => !CLOSED_PHASES.includes(o.currentPhase));
        setOpps(open);
        onCount?.(open.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load opportunities');
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
  if (opps.length === 0)
    return <EmptyState icon={TrendingIcon} text="No open opportunities for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {opps.map((o) => {
        const f = o.fields ?? {};
        const phase = PHASE_LABELS[o.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const productFamily = f[Opportunity_FieldIds.product_family_e3f] as string | undefined;
        const proposalDate = f[Opportunity_FieldIds.proposal_date_241] as number | undefined;
        const initialContact = f[Opportunity_FieldIds.initial_lead_contact_cc5] as number | undefined;
        const quoted = f[Opportunity_FieldIds.quoted_total_revenue_ab5] as number | undefined;
        const po = f[Opportunity_FieldIds.po_amount_5b4] as number | undefined;
        const lossReason = f[Opportunity_FieldIds.loss_reason_ee6] as string | undefined;

        return (
          <ClickableCard
            key={o._id}
            accentColor={phase.accent}
            onOpen={() => void hailer.ui.activity.open(o._id)}
          >
            <CardBody>
              <HStack justify="space-between" align="start" mb={2}>
                <Heading fontSize="sm" noOfLines={1}>{o.name}</Heading>
                <Badge colorScheme={phase.color} flexShrink={0}>{phase.label}</Badge>
              </HStack>
              {productFamily && (
                <Text fontSize="xs" color="subtleText" mb={2}>
                  {productFamily}
                </Text>
              )}
              <VStack align="stretch" spacing={0.5} fontSize="xs">
                {quoted != null && (
                  <HStack justify="space-between">
                    <Text color="subtleText">Quoted</Text>
                    <Text fontWeight="semibold">{formatMoney(quoted)}</Text>
                  </HStack>
                )}
                {po != null && (
                  <HStack justify="space-between">
                    <Text color="subtleText">PO Amount</Text>
                    <Text fontWeight="semibold" color="green.300">{formatMoney(po)}</Text>
                  </HStack>
                )}
                {initialContact != null && (
                  <HStack justify="space-between">
                    <Text color="subtleText">First Contact</Text>
                    <Text>{formatDate(initialContact)}</Text>
                  </HStack>
                )}
                {proposalDate != null && (
                  <HStack justify="space-between">
                    <Text color="subtleText">Proposal</Text>
                    <Text>{formatDate(proposalDate)}</Text>
                  </HStack>
                )}
                {lossReason && (
                  <HStack justify="space-between">
                    <Text color="subtleText">Loss Reason</Text>
                    <Text>{lossReason}</Text>
                  </HStack>
                )}
              </VStack>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
