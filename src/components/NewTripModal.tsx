import { Activity, HailerApi } from '@hailer/app-sdk';
import {
  Alert, AlertIcon, Badge, Box, Button, Center, Checkbox, Flex, HStack, Modal, ModalBody, ModalCloseButton, ModalContent,
  ModalFooter, ModalHeader, ModalOverlay, Select, Spinner, Text, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Assets_FieldIds, TRIPS_IHS_FieldIds, TRIPS_IHS_PhaseIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, formatDate } from '../hailer/api-helpers';

const SERVICE_TYPES = ['Calibration', 'In House Service / Repair', 'Startup', 'Testing', 'Training', 'ThermDAC Upgrade'];
const NEEDS_ASSET = ['Calibration', 'In House Service / Repair'];
const LINK_FIELDS = [TRIPS_IHS_FieldIds.asset_1_b28, TRIPS_IHS_FieldIds.asset_2_881, TRIPS_IHS_FieldIds.asset_3_a02];

interface Props {
  hailer: HailerApi;
  customer: Activity;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const familyOf = (a: Activity) => ((a.fields?.[Assets_FieldIds.product_family_23a] as string | undefined) ?? '').replace(/^\d+-/, '');
const dueOf = (a: Activity) => {
  const d = a.fields?.[Assets_FieldIds.calibration_due_f5e];
  return typeof d === 'number' ? d : 0;
};

// Pick which of the customer's assets a trip is for, then open Hailer's own create form with it all filled in.
export default function NewTripModal({ hailer, customer, isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const [assets, setAssets] = useState<Activity[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [serviceType, setServiceType] = useState('Calibration');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const border = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAssets(null);
    setSelected(new Set());
    setServiceType('Calibration');
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.assets, PHASES.assets);
        if (cancelled) return;
        // Assets in service only, overdue ones first.
        const mine = filterByLink(all, Assets_FieldIds.company_340, customer._id)
          .filter((a) => a.fields?.[Assets_FieldIds.status_9b5] !== 'Retired');
        const now = Date.now();
        const overdue = (a: Activity) => (dueOf(a) > 0 && dueOf(a) < now ? 0 : 1);
        setAssets(mine.sort((a, b) => overdue(a) - overdue(b) || a.name.localeCompare(b.name)));
      } catch {
        if (!cancelled) setAssets([]);
      }
    })();
    return () => { cancelled = true; };
  }, [hailer, customer._id, isOpen]);

  const now = Date.now();
  const isOverdue = (a: Activity) => dueOf(a) > 0 && dueOf(a) < now;
  const chosen = useMemo(() => (assets ?? []).filter((a) => selected.has(a._id)), [assets, selected]);
  const needsAsset = NEEDS_ASSET.includes(serviceType);
  const canCreate = !needsAsset || chosen.length > 0;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function summaryOf(list: Activity[]): string {
    const counts = new Map<string, number>();
    list.forEach((a) => { const f = familyOf(a) || 'asset'; counts.set(f, (counts.get(f) ?? 0) + 1); });
    return [...counts.entries()].map(([f, n]) => (n > 1 ? `${f} x${n}` : f)).join(', ');
  }

  function createTrip() {
    const summary = summaryOf(chosen);
    const fields: Record<string, string> = {
      [TRIPS_IHS_FieldIds.customer_b16]: customer._id,
      [TRIPS_IHS_FieldIds.service_type_dbb]: serviceType,
      [TRIPS_IHS_FieldIds.asset_b23]: chosen.length ? chosen.map((a) => a.name).join(', ') : 'TBC',
    };
    chosen.slice(0, LINK_FIELDS.length).forEach((a, i) => { fields[LINK_FIELDS[i]] = a._id; });
    onClose();
    // The create form can be cancelled, in which case the promise never settles: so nothing waits on it.
    void hailer.ui.activity.create(WORKFLOWS.trips, {
      name: `${customer.name.trim()} - ${serviceType}${summary ? ' - ' + summary : ''}`,
      phaseId: TRIPS_IHS_PhaseIds.triage_from_support_tickets_b0e,
      fields,
    }).then((created) => {
      if (created) {
        toast({ title: 'Trip created', status: 'success', duration: 3000 });
        onCreated?.();
      }
    }).catch((err: { msg?: string }) => {
      toast({ title: "Couldn't open the trip form", description: err?.msg ?? String(err), status: 'error', duration: 6000 });
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pb={1}>
          New trip
          <Text fontSize="sm" fontWeight="normal" color={muted} noOfLines={1}>{customer.name.trim()}</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="xs" color={muted} mb={1}>Type of visit</Text>
          <Select size="sm" value={serviceType} onChange={(e) => setServiceType(e.target.value)} mb={4}>
            {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>

          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="xs" color={muted}>Which assets? {chosen.length > 0 && `(${chosen.length} selected)`}</Text>
            {assets && assets.length > 0 && (
              <HStack spacing={1}>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set(assets.filter(isOverdue).map((a) => a._id)))}>Select overdue</Button>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set(assets.map((a) => a._id)))}>Select all</Button>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              </HStack>
            )}
          </Flex>

          {assets === null ? (
            <Center py={8}><Spinner /></Center>
          ) : assets.length === 0 ? (
            <Text fontSize="sm" color={muted} py={3}>This customer has no assets in service{needsAsset ? ', so this type of visit cannot be created from here yet.' : '. You can still create the trip without one.'}</Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {assets.map((a) => (
                <Box key={a._id} border="1px" borderColor={selected.has(a._id) ? 'blue.400' : border} borderRadius="md" px={3} py={2} cursor="pointer" onClick={() => toggle(a._id)}>
                  <Checkbox isChecked={selected.has(a._id)} onChange={() => toggle(a._id)} onClick={(e) => e.stopPropagation()} w="100%">
                    <HStack spacing={2} wrap="wrap">
                      <Text fontWeight="semibold">{a.name}</Text>
                      <Text fontSize="xs" color={muted}>{familyOf(a)}</Text>
                      {isOverdue(a) && <Badge colorScheme="orange" fontSize="2xs">Calibration overdue</Badge>}
                      {dueOf(a) > 0 && <Text fontSize="xs" color={isOverdue(a) ? 'red.400' : muted}>due {formatDate(dueOf(a))}</Text>}
                    </HStack>
                  </Checkbox>
                </Box>
              ))}
            </VStack>
          )}

          {chosen.length > LINK_FIELDS.length && (
            <Alert status="info" mt={3} fontSize="sm" borderRadius="md">
              <AlertIcon />
              A trip can link {LINK_FIELDS.length} assets. The first {LINK_FIELDS.length} are linked, and all {chosen.length} are listed in its Asset text.
            </Alert>
          )}
          <Text fontSize="xs" color={muted} mt={3}>Next, Hailer's trip form opens with this filled in so you can add dates and details before saving.</Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" isDisabled={!canCreate} onClick={createTrip}>Create trip</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
