import { Card, CardBody, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function StatTile(props: { label: string; value: ReactNode; accent?: string; valueColor?: string; hint?: string; small?: boolean }) {
  return (
    <Card size="sm" borderTop="3px solid" borderColor={`${props.accent ?? 'gray'}.400`}>
      <CardBody py={3} px={4}>
        <Text fontSize="xs" color="subtleText" mb={1} noOfLines={1}>{props.label}</Text>
        <Text fontSize={props.small ? 'xl' : '3xl'} fontWeight="bold" lineHeight="1.1" color={props.valueColor} noOfLines={1}>{props.value}</Text>
        {props.hint && <Text fontSize="xs" color="subtleText" mt={1} noOfLines={1}>{props.hint}</Text>}
      </CardBody>
    </Card>
  );
}
