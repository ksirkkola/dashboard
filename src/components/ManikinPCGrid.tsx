import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Badge, Box, Button, CardBody, Center, Heading, HStack, SimpleGrid, Spinner, Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import {
  ManikinPC_FieldIds, ManikinPC_PhaseIds, Support_Tickets_FieldIds, Support_Tickets_PhaseIds,
} from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate, formatMoney } from '../hailer/api-helpers';
import { useApp } from '../hailer/use-app';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { CreditCardIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [ManikinPC_PhaseIds.prospect_ab0]: { label: 'Prospect', color: 'gray', accent: 'gray.400' },
  [ManikinPC_PhaseIds.contacted_55c]: { label: 'Contacted', color: 'blue', accent: 'blue.400' },
  [ManikinPC_PhaseIds.active_license_579]: { label: 'Active License', color: 'green', accent: 'green.400' },
  [ManikinPC_PhaseIds.expired_596]: { label: 'Expired', color: 'red', accent: 'red.400' },
  [ManikinPC_PhaseIds.not_interested_7fe]: { label: 'Not Interested', color: 'gray', accent: 'gray.300' },
};

// Marketing Notes only makes sense pre-sale — once a license exists the general Notes
// field takes over (support/technical context), matching the field's own description.
const PRE_SALE_PHASES = new Set<string>([ManikinPC_PhaseIds.prospect_ab0, ManikinPC_PhaseIds.contacted_55c]);

export default function ManikinPCGrid({ hailer, customerId, onCount }: Props) {
  const { user } = useApp();
  const toast = useToast();
  const [records, setRecords] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllPhases(hailer, WORKFLOWS.manikinpc, PHASES.manikinpc);
      const mine = filterByLink(all, ManikinPC_FieldIds.customer_4df, customerId);
      setRecords(mine);
      onCount?.(mine.length);
    } catch (err) {
      setError((err as HailerError).msg ?? 'Failed to load ManikinPC records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => { await load(); if (cancelled) return; })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hailer, customerId]);

  // Create a quote/install support ticket for this ManikinPC relationship — mirrors the
  // Asset card's shortcut. The native create dialog doesn't reliably accept an arbitrary
  // non-initial phaseId, so create at the workflow's default phase, then move it to
  // Software Upgrade as a separate step, then link it back onto the ManikinPC record.
  async function createSupportTicket(record: Activity) {
    setCreatingId(record._id);
    try {
      const created = await hailer.activity.create(WORKFLOWS.supportTickets, [{
        name: `ManikinPC quote + remote install — ${record.name}`.slice(0, 200),
        fields: {
          [Support_Tickets_FieldIds.customer_bd7]: customerId,
          [Support_Tickets_FieldIds.deployment_ed0]: 'Remote Session',
        },
      }]);
      const ticket = created?.[0];
      if (!ticket) { setCreatingId(null); return; }
      await hailer.activity.update([{ _id: ticket._id, phaseId: Support_Tickets_PhaseIds.software_upgrade_4d5 }], {});
      await hailer.activity.update([{ _id: record._id, fields: { [ManikinPC_FieldIds.related_support_ticket_d53]: ticket._id } }], {});
      toast({ title: 'Support ticket created', status: 'success', duration: 3000 });
      await load();
    } catch (err) {
      toast({ title: 'Could not create support ticket', description: (err as HailerError).msg ?? String(err), status: 'error', duration: 4000 });
    }
    setCreatingId(null);
  }

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (records.length === 0)
    return <EmptyState icon={CreditCardIcon} text="No ManikinPC relationship on file for this customer yet." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
      {records.map((r) => {
        const f = r.fields ?? {};
        const phase = PHASE_LABELS[r.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const version = f[ManikinPC_FieldIds.version_4e5] as string | undefined;
        const expiryMs = f[ManikinPC_FieldIds.license_expiry_date_4ed] as number | undefined;
        const estValue = f[ManikinPC_FieldIds.est_deal_value_4f1] as number | undefined;
        const ownerId = f[ManikinPC_FieldIds.owner_4f5] as string | undefined;
        const owner = ownerId ? user.map[ownerId] : undefined;
        const ownerName = owner ? `${owner.firstname} ${owner.lastname}`.trim() : undefined;
        const marketingNotes = f[ManikinPC_FieldIds.marketing_notes_d56] as string | undefined;
        const showMarketingNotes = PRE_SALE_PHASES.has(r.currentPhase) && !!marketingNotes;
        const hasTicket = !!f[ManikinPC_FieldIds.related_support_ticket_d53];
        const expired = expiryMs != null && expiryMs < Date.now();

        return (
          <ClickableCard
            key={r._id}
            accentColor={expired ? 'red.400' : phase.accent}
            onOpen={() => void hailer.ui.activity.open(r._id)}
          >
            <CardBody>
              <HStack justify="space-between" align="start" mb={2}>
                <Heading fontSize="sm" noOfLines={1}>{r.name}</Heading>
                <Badge colorScheme={expired ? 'red' : phase.color} flexShrink={0}>{expired ? 'Expired' : phase.label}</Badge>
              </HStack>
              <Box fontSize="xs" color="subtleText" mb={2}>
                {version && <Text>Version: {version}</Text>}
                {expiryMs != null && <Text color={expired ? 'red.400' : undefined}>License expires: {formatDate(expiryMs)}</Text>}
                {estValue != null && <Text>Est. deal value: {formatMoney(estValue)}</Text>}
                {ownerName && <Text>Owner: {ownerName}</Text>}
              </Box>
              {showMarketingNotes && (
                <Text fontSize="xs" color="subtleText" noOfLines={3} mb={2}>{marketingNotes}</Text>
              )}
              {!hasTicket && (
                <Button
                  size="xs" variant="outline" isLoading={creatingId === r._id}
                  onClick={(e) => { e.stopPropagation(); void createSupportTicket(r); }}
                >
                  + Support Ticket
                </Button>
              )}
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
