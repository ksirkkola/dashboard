import { Activity, HailerApi } from '@hailer/app-sdk';
import {
  Avatar,
  Box,
  Heading,
  HStack,
  Icon,
  Image,
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
import { useApp } from '../hailer/use-app';
import {
  AwardIcon,
  BuildingIcon,
  CreditCardIcon,
  EuroIcon,
  GlobeIcon,
  MapPinIcon,
  TagIcon,
} from './Icons';

function firstFileId(raw: unknown): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed[0];
  } catch {
    if (typeof raw === 'string') return raw;
  }
  return undefined;
}

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
  const { user } = useApp();
  const [customer, setCustomer] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  const tileBg = useColorModeValue('whiteAlpha.900', 'whiteAlpha.200');
  const tileBorder = useColorModeValue('whiteAlpha.500', 'whiteAlpha.300');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLogoError(false);
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
  const streetAddress = f[Customers_FieldIds.company_street_address_d68] as string | undefined;
  const city = f[Customers_FieldIds.company_city_897] as string | undefined;
  const country = f[Customers_FieldIds.company_country_9a0] as string | undefined;
  const industry = f[Customers_FieldIds.industry_2af] as string | undefined;
  const accountType = f[Customers_FieldIds.is_this_an_agent_client_0eb] as string | undefined;
  const isoLab = f[Customers_FieldIds.iso_17025_lab_a29] as string | undefined;
  const totalWon = f[Customers_FieldIds.total_won_898] as number | undefined;
  const paymentTerms = f[Customers_FieldIds.client_payment_terms_688] as string | undefined;
  const accountManagerId = f[Customers_FieldIds.account_manager_b90] as string | undefined;
  const accountManager = accountManagerId ? user.map[accountManagerId] : undefined;
  const accountManagerName = accountManager
    ? `${accountManager.firstname} ${accountManager.lastname}`.trim()
    : undefined;

  const logoFileId = firstFileId(f[Customers_FieldIds.company_logo_f89]);
  const logoUrl = logoFileId ? `https://api.hailer.com/image/hires/${logoFileId}` : undefined;

  const address = [streetAddress, city].filter(Boolean).join(', ');

  const stats: Stat[] = [];
  if (address) stats.push({ label: 'Address', value: address, icon: MapPinIcon, color: 'red.300' });
  if (country) stats.push({ label: 'Country', value: country, icon: GlobeIcon, color: 'cyan.300' });
  if (industry) stats.push({ label: 'Industry', value: industry, icon: TagIcon, color: 'orange.300' });
  if (vat) stats.push({ label: 'VAT', value: vat, icon: BuildingIcon, color: 'blue.300' });
  if (paymentTerms)
    stats.push({ label: 'Payment Terms', value: paymentTerms, icon: CreditCardIcon, color: 'pink.300' });
  if (accountType && accountType !== 'No')
    stats.push({ label: 'Account', value: accountType, icon: AwardIcon, color: 'yellow.300' });
  if (isoLab && isoLab !== 'No')
    stats.push({ label: 'ISO 17025', value: isoLab, icon: AwardIcon, color: 'purple.300' });
  if (totalWon != null && totalWon > 0)
    stats.push({ label: 'Total Won', value: formatMoney(totalWon), icon: EuroIcon, color: 'green.300' });

  return (
    <Box
      mb={6}
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      cursor="pointer"
      onClick={() => void hailer.ui.activity.open(customer._id)}
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-1px)' }}
      bgGradient="linear(135deg, customColors.baseBlue, #1a1a4e)"
      shadow="lg"
    >
      {/* Ambient glow accents */}
      <Box
        position="absolute"
        top="-30%"
        right="-8%"
        boxSize="18rem"
        borderRadius="full"
        bg="customColors.accentGreen"
        opacity={0.25}
        filter="blur(70px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-40%"
        left="10%"
        boxSize="14rem"
        borderRadius="full"
        bg="customColors.baseBlueLight"
        opacity={0.2}
        filter="blur(70px)"
        pointerEvents="none"
      />
      {/* Subtle dot pattern */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.15}
        pointerEvents="none"
        backgroundImage="radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)"
        backgroundSize="18px 18px"
      />

      <Box p={6} position="relative">
        <HStack spacing={5} align="center" mb={stats.length > 0 ? 5 : 0} wrap="wrap" rowGap={3}>
          {logoUrl && !logoError ? (
            <Box
              boxSize="4.5rem"
              borderRadius="lg"
              bg="white"
              p={2}
              boxShadow="0 0 0 4px rgba(255,255,255,0.25)"
              flexShrink={0}
            >
              <Image
                src={logoUrl}
                alt={`${customer.name} logo`}
                boxSize="100%"
                objectFit="contain"
                onError={() => setLogoError(true)}
              />
            </Box>
          ) : (
            <Avatar
              name={customer.name}
              size="xl"
              bg="whiteAlpha.300"
              color="white"
              boxShadow="0 0 0 4px rgba(255,255,255,0.25)"
            />
          )}
          <Box flex="1" minW={0}>
            <Text fontSize="xs" color="whiteAlpha.800" textTransform="uppercase" letterSpacing="wider" mb={1}>
              Customer
            </Text>
            <Heading fontSize="3xl" color="white" noOfLines={1}>
              {customer.name}
            </Heading>
          </Box>
          {accountManagerName && (
            <HStack
              bg="whiteAlpha.200"
              borderRadius="md"
              px={3}
              py={2}
              spacing={2.5}
              backdropFilter="blur(8px)"
              flexShrink={0}
            >
              <Avatar name={accountManagerName} size="sm" />
              <VStack spacing={0} align="start">
                <Text fontSize="2xs" color="whiteAlpha.800" textTransform="uppercase" letterSpacing="wider" lineHeight="1">
                  Your Account Manager
                </Text>
                <Text fontSize="sm" fontWeight="semibold" color="white" lineHeight="1.3">
                  {accountManagerName}
                </Text>
              </VStack>
            </HStack>
          )}
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
                  <Icon as={s.icon} boxSize={4} color={s.color} flexShrink={0} />
                  <VStack spacing={0} align="start" maxW="14rem">
                    <Text
                      fontSize="2xs"
                      color="whiteAlpha.800"
                      textTransform="uppercase"
                      letterSpacing="wider"
                      lineHeight="1"
                    >
                      {s.label}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color="white" lineHeight="1.3" noOfLines={2}>
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
