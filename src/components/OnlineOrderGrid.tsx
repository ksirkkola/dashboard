import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import { Badge, Box, CardBody, Center, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Online_Orders_FieldIds, Online_Orders_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate } from '../hailer/api-helpers';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { PackageIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  refreshKey?: number;
  onCount?: (n: number) => void;
}

const PHASE_LABELS: Record<string, { label: string; color: string; accent: string }> = {
  [Online_Orders_PhaseIds.pending_702]: { label: 'Pending', color: 'yellow', accent: 'yellow.400' },
  [Online_Orders_PhaseIds.picked_f95]: { label: 'Picked', color: 'blue', accent: 'blue.400' },
  [Online_Orders_PhaseIds.backordered_fc4]: { label: 'Backordered', color: 'red', accent: 'red.400' },
  [Online_Orders_PhaseIds.fulfilled_ff2]: { label: 'Fulfilled', color: 'green', accent: 'green.400' },
};

export default function OnlineOrderGrid({ hailer, customerId, refreshKey, onCount }: Props) {
  const [orders, setOrders] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.onlineOrders, PHASES.onlineOrders);
        if (cancelled) return;
        const mine = filterByLink(all, Online_Orders_FieldIds.client_a88, customerId);
        setOrders(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load online orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hailer, customerId, refreshKey]);

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (orders.length === 0)
    return <EmptyState icon={PackageIcon} text="No online orders on file for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
      {orders.map((o) => {
        const f = o.fields ?? {};
        const phase = PHASE_LABELS[o.currentPhase] ?? { label: 'Unknown', color: 'gray', accent: 'gray.400' };
        const orderNumber = f[Online_Orders_FieldIds.bigcommerce_order_7ac] as string | undefined;
        const orderDateMs = f[Online_Orders_FieldIds.order_date_7af] as number | undefined;
        const destinationCountry = f[Online_Orders_FieldIds.destination_country_dbf] as string | undefined;
        const carrier = f[Online_Orders_FieldIds.shipping_carrier_732] as string | undefined;
        const tracking = f[Online_Orders_FieldIds.tracking_number_735] as string | undefined;
        const shippedMs = f[Online_Orders_FieldIds.shipped_date_738] as number | undefined;

        return (
          <ClickableCard
            key={o._id}
            accentColor={phase.accent}
            onOpen={() => void hailer.ui.activity.open(o._id)}
          >
            <CardBody>
              <HStack justify="space-between" align="start" mb={2}>
                <Heading fontSize="sm" noOfLines={1}>{orderNumber ? `Order #${orderNumber}` : o.name}</Heading>
                <Badge colorScheme={phase.color} flexShrink={0}>{phase.label}</Badge>
              </HStack>
              <Box fontSize="xs" color="subtleText">
                {orderDateMs != null && <Text>Ordered: {formatDate(orderDateMs)}</Text>}
                {destinationCountry && <Text>Destination: {destinationCountry}</Text>}
                {carrier && <Text>Carrier: {carrier}{tracking ? ` · ${tracking}` : ''}</Text>}
                {shippedMs != null && <Text>Shipped: {formatDate(shippedMs)}</Text>}
              </Box>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
