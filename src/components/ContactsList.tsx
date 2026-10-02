import { Activity, HailerApi, HailerError } from '@hailer/app-sdk';
import {
  Avatar,
  CardBody,
  Center,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Contact_persons_FieldIds } from '../../../../workspace/enums';
import { WORKFLOWS, PHASES } from '../config';
import { fetchAllPhases, filterByLink } from '../hailer/api-helpers';
import ClickableCard from './ClickableCard';
import EmptyState from './EmptyState';
import { UsersIcon } from './Icons';

interface Props {
  hailer: HailerApi;
  customerId: string;
  onCount?: (n: number) => void;
}

export default function ContactsList({ hailer, customerId, onCount }: Props) {
  const [contacts, setContacts] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await fetchAllPhases(hailer, WORKFLOWS.contactPersons, PHASES.contactPersons);
        if (cancelled) return;
        const mine = filterByLink(all, Contact_persons_FieldIds.company_8e4, customerId);
        setContacts(mine);
        onCount?.(mine.length);
      } catch (err) {
        if (!cancelled) setError((err as HailerError).msg ?? 'Failed to load contacts');
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
  if (contacts.length === 0)
    return <EmptyState icon={UsersIcon} text="No contacts on file for this customer." />;

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
      {contacts.map((c) => {
        const f = c.fields ?? {};
        const first = (f[Contact_persons_FieldIds.first_name_8e0] as string | undefined) ?? '';
        const last = (f[Contact_persons_FieldIds.last_name_8e1] as string | undefined) ?? '';
        const title = f[Contact_persons_FieldIds.title_8e3] as string | undefined;
        const email = f[Contact_persons_FieldIds.email_8c5] as string | undefined;
        const phone = f[Contact_persons_FieldIds.phone_8e2] as string | undefined;
        const fullName = `${first} ${last}`.trim() || c.name;

        return (
          <ClickableCard
            key={c._id}
            onOpen={() => void hailer.ui.activity.open(c._id)}
          >
            <CardBody>
              <HStack spacing={3} align="start">
                <Avatar name={fullName} size="sm" />
                <VStack align="stretch" spacing={0.5} flex="1" minW={0}>
                  <Heading fontSize="sm" noOfLines={1}>{fullName}</Heading>
                  {title && <Text fontSize="xs" color="subtleText" noOfLines={1}>{title}</Text>}
                  {email && (
                    <Link
                      href={`mailto:${email}`}
                      fontSize="sm"
                      color="blue.400"
                      onClick={(e) => e.stopPropagation()}
                      isTruncated
                    >
                      {email}
                    </Link>
                  )}
                  {phone && (
                    <Link
                      href={`tel:${phone}`}
                      fontSize="sm"
                      color="blue.400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {phone}
                    </Link>
                  )}
                </VStack>
              </HStack>
            </CardBody>
          </ClickableCard>
        );
      })}
    </SimpleGrid>
  );
}
