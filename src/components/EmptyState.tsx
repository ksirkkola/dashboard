import { Center, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { ComponentType } from 'react';

interface Props {
  icon: ComponentType<{ boxSize?: number | string; color?: string }>;
  text: string;
}

export default function EmptyState({ icon, text }: Props) {
  const iconBg = useColorModeValue('gray.50', 'gray.700');
  const iconColor = useColorModeValue('gray.300', 'gray.500');

  return (
    <Center py={16}>
      <VStack spacing={3}>
        <Center bg={iconBg} borderRadius="full" boxSize="3.5rem">
          <Icon as={icon} boxSize={6} color={iconColor} />
        </Center>
        <Text color="subtleText" fontSize="sm">{text}</Text>
      </VStack>
    </Center>
  );
}
