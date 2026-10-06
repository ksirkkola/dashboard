import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import { SimpleGrid, Spinner, Text, Center } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import AssetCard from './AssetCard';
import EmptyState from './EmptyState';
import { CubeIcon } from './Icons';
import { Assets_FieldIds, Asset_Type_Images_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink, firstFileId } from '../hailer/api-helpers';

interface Props {
  hailer: HailerApi;
  customerId: string;
  refreshKey?: number;
  onCount?: (n: number) => void;
}

export default function AssetGrid({ hailer, customerId, refreshKey, onCount }: Props) {
  const [assets, setAssets] = useState<Activity[]>([]);
  const [imagesByFamily, setImagesByFamily] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [all, imageRecords] = await Promise.all([
          fetchAllPhases(hailer, WORKFLOWS.assets, PHASES.assets),
          // Small reference dataset (one row per product family, ~7-27 rows) —
          // fetched alongside the assets themselves rather than per-card, so
          // every card's lookup is instant and there's only one network round trip.
          fetchAllPhases(hailer, WORKFLOWS.assetTypeImages, PHASES.assetTypeImages),
        ]);
        if (cancelled) return;
        const mine = filterByLink(all, Assets_FieldIds.company_340, customerId);
        setAssets(mine);
        onCount?.(mine.length);

        const map: Record<string, string> = {};
        imageRecords.forEach((r) => {
          const family = r.fields?.[Asset_Type_Images_FieldIds.product_family_f4b] as string | undefined;
          const fileId = firstFileId(r.fields?.[Asset_Type_Images_FieldIds.image_f4e]);
          if (family && fileId) map[family] = fileId;
        });
        setImagesByFamily(map);
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
  }, [hailer, customerId, refreshKey]);

  if (loading) return <Center py={12}><Spinner /></Center>;
  if (error) return <Center py={12}><Text color="red.500">{error}</Text></Center>;
  if (assets.length === 0)
    return <EmptyState icon={CubeIcon} text="No assets on file for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
      {assets.map((a) => {
        const family = a.fields?.[Assets_FieldIds.product_family_23a] as string | undefined;
        const imageFileId = family ? imagesByFamily[family] : undefined;
        return (
          <AssetCard
            key={a._id}
            hailer={hailer}
            activity={a}
            customerId={customerId}
            imageFileId={imageFileId}
          />
        );
      })}
    </SimpleGrid>
  );
}
