import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Badge,
  Button,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { MouseEvent, useState } from 'react';
import {
  Assets_FieldIds, Support_Tickets_FieldIds, Support_Tickets_PhaseIds,
} from '../../../../workspace/enums';
import { WORKFLOWS } from '../config';
import ClickableCard from './ClickableCard';
import { formatDate } from '../hailer/api-helpers';

interface AssetCardProps {
  hailer: HailerApi;
  activity: Activity;
  customerId?: string;
}

function isOverdue(unixMs: number): boolean {
  return unixMs < Date.now();
}

interface FieldRowProps {
  label: string;
  value: string;
  alert?: boolean;
}

function FieldRow({ label, value, alert }: FieldRowProps) {
  return (
    <HStack justify="space-between" align="baseline" spacing={2}>
      <Text fontSize="xs" color="subtleText" flexShrink={0}>
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight={alert ? 'semibold' : 'normal'}
        color={alert ? 'red.400' : undefined}
        textAlign="right"
      >
        {value}
      </Text>
    </HStack>
  );
}

export default function AssetCard({ hailer, activity, customerId }: AssetCardProps) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const f = activity.fields ?? {};

  const assetName = f[Assets_FieldIds.asset_name_8c8] as string | undefined;
  const productFamily = f[Assets_FieldIds.product_family_23a] as string | undefined;
  const productName = f[Assets_FieldIds.description_f72] as string | undefined;
  const purchaseDateMs = f[Assets_FieldIds.purchase_date_e8b] as number | undefined;
  const warrantyExpiresMs = f[Assets_FieldIds.warranty_expires_c05] as number | undefined;
  const calibrationDueMs = f[Assets_FieldIds.calibration_due_f5e] as number | undefined;
  const assetAge = f[Assets_FieldIds.asset_age_d2b] as number | undefined;

  const warrantyExpired = warrantyExpiresMs != null && isOverdue(warrantyExpiresMs);
  const calibrationOverdue = calibrationDueMs != null && isOverdue(calibrationDueMs);

  const accent = warrantyExpired
    ? 'red.400'
    : calibrationOverdue
      ? 'orange.400'
      : 'green.400';

  // Native create dialog doesn't reliably accept an arbitrary non-initial phaseId — create
  // at the workflow's default phase, then move it to Software Upgrade as a separate step.
  async function createSupportTicket(e: MouseEvent) {
    e.stopPropagation();
    setCreating(true);
    try {
      const created = await hailer.activity.create(WORKFLOWS.supportTickets, [{
        name: `ThermDAC quote + remote install — ${assetName ?? activity.name}`.slice(0, 200),
        fields: {
          [Support_Tickets_FieldIds.asset_792]: activity._id,
          ...(customerId ? { [Support_Tickets_FieldIds.customer_bd7]: customerId } : {}),
          [Support_Tickets_FieldIds.deployment_ed0]: 'Remote Session',
        },
      }]);
      const ticket = created?.[0];
      if (!ticket) { setCreating(false); return; }
      await hailer.activity.update([{ _id: ticket._id, phaseId: Support_Tickets_PhaseIds.software_upgrade_4d5 }], {});
      toast({ title: 'Support ticket created', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: "Couldn't create the support ticket", description: (err as HailerError).msg ?? String(err), status: 'error', duration: 6000 });
    }
    setCreating(false);
  }

  return (
    <ClickableCard
      accentColor={accent}
      onOpen={() => void hailer.ui.activity.open(activity._id)}
    >
      <CardHeader pb={1}>
        <Heading fontSize="md" noOfLines={1}>
          {assetName ?? activity.name ?? '—'}
        </Heading>
        {(productFamily || productName) && (
          <Text fontSize="xs" color="subtleText" mt={0.5} noOfLines={2}>
            {[productFamily, productName].filter(Boolean).join(' · ')}
          </Text>
        )}
        {(warrantyExpired || calibrationOverdue) && (
          <HStack mt={2} spacing={1} flexWrap="wrap">
            {warrantyExpired && (
              <Badge colorScheme="red" fontSize="2xs">
                Warranty Expired
              </Badge>
            )}
            {calibrationOverdue && (
              <Badge colorScheme="orange" fontSize="2xs">
                Calibration Overdue
              </Badge>
            )}
          </HStack>
        )}
      </CardHeader>
      <CardBody pt={2}>
        <VStack spacing={1} align="stretch">
          {purchaseDateMs != null && (
            <FieldRow label="Purchased" value={formatDate(purchaseDateMs)} />
          )}
          {warrantyExpiresMs != null && (
            <FieldRow
              label="Warranty"
              value={formatDate(warrantyExpiresMs)}
              alert={warrantyExpired}
            />
          )}
          {calibrationDueMs != null && (
            <FieldRow
              label="Calibration"
              value={formatDate(calibrationDueMs)}
              alert={calibrationOverdue}
            />
          )}
          {assetAge != null && (
            <FieldRow
              label="Age"
              value={`${assetAge} year${assetAge === 1 ? '' : 's'}`}
            />
          )}
          {purchaseDateMs == null &&
            warrantyExpiresMs == null &&
            calibrationDueMs == null &&
            assetAge == null && (
              <Text fontSize="sm" color="subtleText">
                No details available
              </Text>
            )}
        </VStack>
        <Button
          mt={3} size="xs" variant="outline" isLoading={creating}
          onClick={createSupportTicket}
        >
          + Support Ticket
        </Button>
      </CardBody>
    </ClickableCard>
  );
}
