import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import { SimpleGrid, Spinner, Text, Center } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import AssetCard from './AssetCard';
import { Assets_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

export default function AssetGrid({ hailer, customerId, onCount }: Props) {
  const [assets, setAssets] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.assets, PHASES.assets);
        if (cancelled) return;
        const mine = filterByLink(all, Assets_FieldIds.company_340, customerId);
        setAssets(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) {
          setError((err as HailerError).msg ?? 'Failed to load assets');
        }
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
  if (assets.length === 0)
    return <Center py={12}><Text color="subtleText">No assets for this customer.</Text></Center>;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
      {assets.map((a) => (
        <AssetCard key={a._id} hailer={hailer} activity={a} />
      ))}
    </SimpleGrid>
  );
}
