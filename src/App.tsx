import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Container,
  Heading,
  HStack,
  Icon,
  Link,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import AssetGrid from './components/AssetGrid';
import CustomerPicker from './components/CustomerPicker';
import CustomerHeader from './components/CustomerHeader';
import TicketsGrid from './components/TicketsGrid';
import ContactsList from './components/ContactsList';
import OpportunitiesGrid from './components/OpportunitiesGrid';
import { useApp } from './hailer/use-app';
import { CubeIcon, TicketIcon, UsersIcon, TrendingIcon } from './components/Icons';

interface TabLabelProps {
  label: string;
  count: number | null;
  icon: typeof CubeIcon;
}

function TabLabel({ label, count, icon }: TabLabelProps) {
  return (
    <HStack spacing={2}>
      <Icon as={icon} boxSize={4} />
      <Text>{label}</Text>
      {count != null && count > 0 && (
        <Badge colorScheme="blue" fontSize="2xs" borderRadius="full" px={2}>
          {count}
        </Badge>
      )}
    </HStack>
  );
}

export default function App() {
  const { hailer, api, inside, settings } = useApp();
  const { setColorMode } = useColorMode();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [oppCount, setOppCount] = useState<number | null>(null);

  useEffect(() => {
    void api.init();
  }, [api]);

  useEffect(() => {
    if (settings) {
      setColorMode(settings.theme === 'dark' ? 'dark' : 'light');
    }
  }, [settings, setColorMode]);

  useEffect(() => {
    setAssetCount(null);
    setTicketCount(null);
    setContactCount(null);
    setOppCount(null);
  }, [customerId]);

  if (inside === null) {
    return (
      <Box margin="2em">
        <Heading fontSize="lg" color="subtleText">
          Connecting to Hailer…
        </Heading>
      </Box>
    );
  }

  if (inside === false) {
    return (
      <Box margin="2em">
        <Heading fontSize="lg" color="subtleText" mb={2}>
          You are outside of Hailer
        </Heading>
        {!hailer?.options.allowedUrls ? (
          <Text>
            This app must be loaded inside Hailer — see{' '}
            <Link href="https://www.npmjs.com/package/@hailer/create-app">
              @hailer/create-app
            </Link>{' '}
            for details.
          </Text>
        ) : (
          <>
            <Text>Tried to find Hailer parent from:</Text>
            <ul>
              {hailer.options.allowedUrls.map((url) => (
                <li key={url}>{url}</li>
              ))}
            </ul>
          </>
        )}
      </Box>
    );
  }

  if (!hailer) return null;

  return (
    <Container maxW="container.xl" py={6}>
      <HStack justify="space-between" align="center" mb={6}>
        <HStack spacing={2}>
          <Heading
            fontSize="xl"
            bgGradient="linear(to-r, blue.400, purple.400)"
            bgClip="text"
            fontWeight="extrabold"
          >
            Customer Portal
          </Heading>
        </HStack>
        <CustomerPicker
          hailer={hailer}
          selectedId={customerId}
          onSelect={(id) => setCustomerId(id)}
        />
      </HStack>

      {customerId ? (
        <>
          <CustomerHeader hailer={hailer} customerId={customerId} />
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList overflowX="auto" overflowY="hidden" sx={{ scrollbarWidth: 'none' }} pb={2}>
              <Tab><TabLabel label="Assets" count={assetCount} icon={CubeIcon} /></Tab>
              <Tab><TabLabel label="Support" count={ticketCount} icon={TicketIcon} /></Tab>
              <Tab><TabLabel label="Contacts" count={contactCount} icon={UsersIcon} /></Tab>
              <Tab><TabLabel label="Opportunities" count={oppCount} icon={TrendingIcon} /></Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={4}>
                <AssetGrid hailer={hailer} customerId={customerId} onCount={setAssetCount} />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <TicketsGrid hailer={hailer} customerId={customerId} onCount={setTicketCount} />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <ContactsList hailer={hailer} customerId={customerId} onCount={setContactCount} />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <OpportunitiesGrid hailer={hailer} customerId={customerId} onCount={setOppCount} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      ) : (
        <Text color="subtleText">Select a customer to view details.</Text>
      )}
    </Container>
  );
}
