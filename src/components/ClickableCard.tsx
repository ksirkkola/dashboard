import { Card, CardProps, useColorModeValue } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface Props extends Omit<CardProps, 'onClick' | 'children'> {
  onOpen: () => void;
  accentColor?: string;
  children: ReactNode;
}

export default function ClickableCard({ onOpen, accentColor, children, ...rest }: Props) {
  const hoverBorder = useColorModeValue('blue.400', 'blue.300');
  const cardBg = useColorModeValue('white', 'gray.700');
  const cardShadow = useColorModeValue('sm', 'none');
  const hoverShadow = useColorModeValue('lg', 'dark-lg');

  return (
    <Card
      bg={cardBg}
      cursor="pointer"
      transition="all 0.18s ease"
      shadow={cardShadow}
      borderLeft={accentColor ? '4px solid' : undefined}
      borderLeftColor={accentColor}
      _hover={{
        borderColor: hoverBorder,
        shadow: hoverShadow,
        transform: 'translateY(-2px) scale(1.01)',
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      {...rest}
    >
      {children}
    </Card>
  );
}
