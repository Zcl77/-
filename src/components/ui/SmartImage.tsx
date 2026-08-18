import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  alt: string;
  showFallbackText?: boolean;
}

export default function SmartImage({
  src,
  alt,
  className = '',
  showFallbackText = false,
  onError,
  ...props
}: SmartImageProps) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  // Handle cached / synchronously-loaded images (notably data URIs):
  // the native onLoad event can fire before React attaches the listener,
  // leaving the image stuck at opacity-0 with a skeleton overlay.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className={`flex items-center justify-center gap-2 bg-studio-surface-solid text-studio-faint ${className}`}
        role="img"
        aria-label={`${alt || t('图片')} ${t('图片暂不可用')}`}
      >
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        {showFallbackText && <span className="text-[10px]">{t('图片暂不可用')}</span>}
      </span>
    );
  }

  // The wrapper is the positioning context for the skeleton. Without
  // `relative` here, an absolutely-positioned skeleton escapes to a
  // distant ancestor (or the initial containing block) when the call
  // site's parent is `position: static`, blanketing the page with the
  // skeleton's opaque background.
  return (
    <span className="relative block h-full w-full overflow-hidden">
      {!loaded && <span className="skeleton absolute inset-0" aria-hidden="true" />}
      <img
        {...props}
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
      />
    </span>
  );
}
