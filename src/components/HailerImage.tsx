import { Image, ImageProps, Icon } from '@chakra-ui/react';
import { HailerImage as HailerImageIcon } from '../hailer/theme/icons/HailerImage';
import { useState, useEffect } from 'react';
import { useApp } from '../hailer/use-app';

interface HailerImageProps extends Omit<ImageProps, 'src'> {
  hailerImageUrl?: string;
  fallbackIcon?: boolean;
}

// Same-origin Hailer app with an active session — see hailer-apps-pictures skill
// for the full URL-format reference (external/cookieless contexts need
// /public/image/... instead, which doesn't apply here).
export const HailerImage = ({
  hailerImageUrl,
  fallbackIcon = true,
  alt = 'Image',
  ...imageProps
}: HailerImageProps) => {
  const { inside } = useApp();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!hailerImageUrl) { setIsError(true); setIsLoading(false); return; }
    if (!inside) { setIsLoading(true); return; }

    const isHailerApiUrl = hailerImageUrl.includes('api.hailer.com');
    const isLocalDevelopment = window.location.hostname === 'localhost';
    if (isLocalDevelopment && isHailerApiUrl) {
      // CORS blocks api.hailer.com in localhost dev — works fine once published.
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setBlobUrl(hailerImageUrl);
    setIsError(false);
    setIsLoading(false);
  }, [hailerImageUrl, inside]);

  if (isLoading || isError || !blobUrl) {
    return fallbackIcon ? (
      <Icon as={HailerImageIcon} color="gray.200" boxSize={imageProps.boxSize} w={imageProps.w} h={imageProps.h} />
    ) : null;
  }

  return (
    <Image
      {...imageProps}
      src={blobUrl}
      alt={alt}
      onError={() => setIsError(true)}
    />
  );
};
