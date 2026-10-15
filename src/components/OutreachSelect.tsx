import { Activity, HailerApi } from '@hailer/app-sdk';
import { Select, Text, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { Customers_FieldIds } from '../../../../workspace/enums';

export const OUTREACH_OPTIONS = ['Not contacted', 'Contacted, waiting', 'Wants a calibration', "Doesn't need one now", "Can't reach them"] as const;
export const OUTREACH_COLOR: Record<string, string> = {
  'Not contacted': 'gray', 'Contacted, waiting': 'blue', 'Wants a calibration': 'green', "Doesn't need one now": 'purple', "Can't reach them": 'orange',
};

export const outreachOf = (c: Activity): string => (c.fields?.[Customers_FieldIds.calibration_outreach_dfa] as string | undefined) || 'Not contacted';
export const outreachDateOf = (c: Activity): number =>
  typeof c.fields?.[Customers_FieldIds.calibration_outreach_last_contacted_dfe] === 'number'
    ? (c.fields?.[Customers_FieldIds.calibration_outreach_last_contacted_dfe] as number) : 0;

const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

interface Props {
  hailer: HailerApi;
  customer: Activity;
  size?: 'xs' | 'sm';
  showDate?: boolean;
  // Called after a successful save so a parent can update its own copy of the customer.
  onSaved?: (customerId: string, status: string, contactedMs: number) => void;
}

// One dropdown per customer. Choosing a status saves it and stamps today as the last-contacted date.
export default function OutreachSelect({ hailer, customer, size = 'sm', showDate = true, onSaved }: Props) {
  const toast = useToast();
  const [value, setValue] = useState(outreachOf(customer));
  const [date, setDate] = useState(outreachDateOf(customer));
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const prev = { value, date };
    const now = Date.now();
    setValue(next); setDate(now); setSaving(true);
    try {
      await hailer.activity.update([{
        _id: customer._id,
        fields: {
          [Customers_FieldIds.calibration_outreach_dfa]: next,
          [Customers_FieldIds.calibration_outreach_last_contacted_dfe]: now,
        },
      }], {});
      onSaved?.(customer._id, next, now);
    } catch (err) {
      setValue(prev.value); setDate(prev.date);
      toast({ title: 'Could not save the outreach status', description: String((err as { msg?: string })?.msg ?? err), status: 'error', duration: 5000 });
    }
    setSaving(false);
  }

  return (
    <VStack align="stretch" spacing={0.5} onClick={(e) => e.stopPropagation()}>
      <Select
        size={size} value={value} isDisabled={saving} onChange={(e) => void change(e.target.value)}
        borderColor={`${OUTREACH_COLOR[value] ?? 'gray'}.400`} minW="170px"
      >
        {OUTREACH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
      {showDate && <Text fontSize="xs" color="subtleText">{date > 0 ? `Last contacted ${fmt(date)}` : 'Not contacted yet'}</Text>}
    </VStack>
  );
}
