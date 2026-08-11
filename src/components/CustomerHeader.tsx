import { Activity, HailerApi } from '@hailer/app-sdk';
import {
  Avatar,
  Box,
  Heading,
  HStack,
  Icon,
  Skeleton,
  Text,
  VStack,
  Wrap,
  WrapItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { ComponentType, useEffect, useState } from 'react';
import { Customers_FieldIds } from '../../../../workspace/enums';
import { formatMoney } from '../hailer/api-helpers';
import {
  AwardIcon,
  BuildingIcon,
  EuroIcon,
  MapPinIcon,
  TagIcon,
} from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
}

interface Stat {
  label: string;
  value: string;
  icon: ComponentType<{ boxSize?: number | string; color?: string }>;
  color: string;
}

export default function CustomerHeader({ hailer, customerId }: Props) {
  const [customer, setCustomer] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  const gradFrom = useColorModeValue('blue.500', 'blue.600');
  const gradTo = useColorModeValue('purple.500', 'purple.600');
  const tileBg = useColorModeValue('whiteAlpha.900', 'whiteAlpha.200');
  const tileBorder = useColorModeValue('whiteAlpha.500', 'whiteAlpha.300');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const c = await hailer.activity.get(customerId);
        if (!cancelled) setCustomer(c ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hailer, customerId]);

  if (loading) return <Skeleton height="9rem" mb={6} borderRadius="lg" />;
  if (!customer) return null;

  const f = customer.fields ?? {};
  const vat = f[Customers_FieldIds.vat_number_896] as string | undefined;
  const location = f[Customers_FieldIds.company_location_897] as string | undefined;
  const industry = f[Customers_FieldIds.industry_2af] as string | undefined;
  const accountType = f[Customers_FieldIds.is_this_an_agent_client_0eb] as string | undefined;
  const isoLab = f[Customers_FieldIds.iso_17025_lab_a29] as string | undefined;
  const totalWon = f[Customers_FieldIds.total_won_898] as number | undefined;

  const stats: Stat[] = [];
  if (location) stats.push({ label: 'Location', value: location, icon: MapPinIcon, color: 'red.300' });
  if (industry) stats.push({ label: 'Industry', value: industry, icon: TagIcon, color: 'orange.300' });
  if (vat) stats.push({ label: 'VAT', value: vat, icon: BuildingIcon, color: 'blue.300' });
  if (accountType && accountType !== 'No')
    stats.push({ label: 'Account', value: accountType, icon: AwardIcon, color: 'yellow.300' });
  if (isoLab && isoLab !== 'No')
    stats.push({ label: 'ISO 17025', value: isoLab, icon: AwardIcon, color: 'purple.300' });
  if (totalWon != null && totalWon > 0)
    stats.push({ label: 'Total Won', value: formatMoney(totalWon), icon: EuroIcon, color: 'green.300' });

  return (
    <Box
      mb={6}
      borderRadius="lg"
      overflow="hidden"
      cursor="pointer"
      onClick={() => void hailer.ui.activity.open(customer._id)}
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-1px)' }}
      bgGradient={`linear(135deg, ${gradFrom}, ${gradTo})`}
      shadow="lg"
    >
      <Box p={6}>
        <HStack spacing={5} align="center" mb={stats.length > 0 ? 5 : 0}>
          <Avatar
            name={customer.name}
            size="xl"
            bg="whiteAlpha.300"
            color="white"
            border="3px solid"
            borderColor="whiteAlpha.500"
          />
          <Box flex="1" minW={0}>
            <Text fontSize="xs" color="whiteAlpha.800" textTransform="uppercase" letterSpacing="wider" mb={1}>
              Customer
            </Text>
            <Heading fontSize="3xl" color="white" noOfLines={1}>
              {customer.name}
            </Heading>
          </Box>
        </HStack>

        {stats.length > 0 && (
          <Wrap spacing={3}>
            {stats.map((s) => (
              <WrapItem key={s.label}>
                <HStack
                  bg={tileBg}
                  border="1px solid"
                  borderColor={tileBorder}
                  borderRadius="md"
                  px={3}
                  py={2}
                  spacing={2.5}
                  backdropFilter="blur(8px)"
                >
                  <Icon as={s.icon} boxSize={4} color={s.color} />
                  <VStack spacing={0} align="start">
                    <Text
                      fontSize="2xs"
                      color="whiteAlpha.800"
                      textTransform="uppercase"
                      letterSpacing="wider"
                      lineHeight="1"
                    >
                      {s.label}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="white" lineHeight="1.3">
                      {s.value}
                    </Text>
                  </VStack>
                </HStack>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Box>
    </Box>
  );
}
