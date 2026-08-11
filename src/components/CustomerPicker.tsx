import { Activity, HailerApi } from '@hailer/app-sdk';
import { Select, Skeleton } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
}

export default function CustomerPicker({ hailer, selectedId, onSelect }: Props) {
  const [customers, setCustomers] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchAllPhases(hailer, WORKFLOWS.customers, PHASES.customers);
      if (cancelled) return;
      const sorted = [...list].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      );
      setCustomers(sorted);
      setLoading(false);
      if (!selectedId && sorted.length > 0) {
        onSelect(sorted[0]._id, sorted[0].name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hailer]);

  if (loading) return <Skeleton height="2.5rem" maxW="20rem" />;

  return (
    <Select
      maxW="20rem"
      size="sm"
      value={selectedId ?? ''}
      onChange={(e) => {
        const id = e.target.value;
        const c = customers.find((x) => x._id === id);
        if (c) onSelect(c._id, c.name);
      }}
    >
      {customers.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
