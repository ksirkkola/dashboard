import { Activity, HailerApi } from '@hailer/app-sdk';
import {
  Avatar,
  Box,
  Flex,
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

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const tileBg = useColorModeValue('gray.50', 'gray.800');
  const tileBorder = useColorModeValue('gray.200', 'gray.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const mapBg = useColorModeValue('gray.100', 'gray.800');

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

  if (loading) return <Skeleton height="9rem" mb={6} borderRadius="md" />;
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
  const paymentTerms = f[Customers_FieldIds.client_payment_terms_6cd] as string | undefined;
  const accountManagerId = f[Customers_FieldIds.account_manager_b90] as string | undefined;
  const accountManager = accountManagerId ? user.map[accountManagerId] : undefined;
  const accountManagerName = accountManager
    ? `${accountManager.firstname} ${accountManager.lastname}`.trim()
    : undefined;

  const logoFileId = firstFileId(f[Customers_FieldIds.company_logo_f89]);
  const logoUrl = logoFileId ? `https://api.hailer.com/image/hires/${logoFileId}` : undefined;

  const address = [streetAddress, city].filter(Boolean).join(', ');

  // No API key needed — Google Maps' plain embed mode geocodes a free-text query
  // server-side. Falls back from full street address down to just the country.
  const mapQuery = [streetAddress, city, country].filter(Boolean).join(', ') || country || null;
  const mapUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : null;

  const stats: Stat[] = [];
  if (address) stats.push({ label: 'Address', value: address, icon: MapPinIcon, color: 'red.400' });
  if (country) stats.push({ label: 'Country', value: country, icon: GlobeIcon, color: 'cyan.500' });
  if (industry) stats.push({ label: 'Industry', value: industry, icon: TagIcon, color: 'orange.400' });
  if (vat) stats.push({ label: 'VAT', value: vat, icon: BuildingIcon, color: 'blue.400' });
  if (paymentTerms)
    stats.push({ label: 'Payment Terms', value: paymentTerms, icon: CreditCardIcon, color: 'pink.400' });
  if (accountType && accountType !== 'No')
    stats.push({ label: 'Account', value: accountType, icon: AwardIcon, color: 'yellow.500' });
  if (isoLab && isoLab !== 'No')
    stats.push({ label: 'ISO 17025', value: isoLab, icon: AwardIcon, color: 'purple.400' });
  if (totalWon != null && totalWon > 0)
    stats.push({ label: 'Total Won', value: formatMoney(totalWon), icon: EuroIcon, color: 'green.500' });

  return (
    <Box
      mb={6}
      bg={cardBg}
      border="1px"
      borderColor={borderColor}
      borderRadius="md"
      shadow="sm"
      overflow="hidden"
    >
      <Flex direction={{ base: 'column', md: 'row' }}>
        {/* Map */}
        <Box flex={{ base: 'none', md: '0 0 300px' }} h={{ base: '180px', md: 'auto' }} minH={{ md: '220px' }} bg={mapBg}>
          {mapUrl ? (
            <iframe
              title={`${customer.name} location`}
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block', minHeight: '180px' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <Flex h="100%" minH="180px" align="center" justify="center">
              <VStack spacing={2}>
                <Icon as={MapPinIcon} boxSize={6} color={mutedText} />
                <Text fontSize="xs" color={mutedText}>No address on file</Text>
              </VStack>
            </Flex>
          )}
        </Box>

        {/* Details */}
        <Box flex="1" p={5} cursor="pointer" onClick={() => void hailer.ui.activity.open(customer._id)}
          _hover={{ bg: tileBg }} transition="background 0.15s ease">
          <HStack spacing={4} align="center" mb={stats.length > 0 ? 4 : 0} wrap="wrap" rowGap={3}>
            {logoUrl && !logoError ? (
              <Box
                boxSize="4rem"
                borderRadius="md"
                bg="white"
                border="1px"
                borderColor={borderColor}
                p={2}
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
              <Avatar name={customer.name} size="lg" flexShrink={0} />
            )}
            <Box flex="1" minW={0}>
              <Text fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="wider" mb={0.5}>
                Customer
              </Text>
              <Heading fontSize="2xl" noOfLines={1}>
                {customer.name}
              </Heading>
            </Box>
            {accountManagerName && (
              <HStack
                bg={tileBg}
                border="1px"
                borderColor={tileBorder}
                borderRadius="md"
                px={3}
                py={2}
                spacing={2.5}
                flexShrink={0}
              >
                <Avatar name={accountManagerName} size="sm" />
                <VStack spacing={0} align="start">
                  <Text fontSize="2xs" color={mutedText} textTransform="uppercase" letterSpacing="wider" lineHeight="1">
                    Account Manager
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" lineHeight="1.3">
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
                    border="1px"
                    borderColor={tileBorder}
                    borderRadius="md"
                    px={3}
                    py={2}
                    spacing={2.5}
                  >
                    <Icon as={s.icon} boxSize={4} color={s.color} flexShrink={0} />
                    <VStack spacing={0} align="start" maxW="14rem">
                      <Text
                        fontSize="2xs"
                        color={mutedText}
                        textTransform="uppercase"
                        letterSpacing="wider"
                        lineHeight="1"
                      >
                        {s.label}
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold" lineHeight="1.3" noOfLines={2}>
                        {s.value}
                      </Text>
                    </VStack>
                  </HStack>
                </WrapItem>
              ))}
            </Wrap>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
