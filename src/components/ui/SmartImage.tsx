import { ImgHTMLAttributes, useEffect, useState } from 'react';
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

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
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

  return (
    <>
      {!loaded && <span className={`skeleton absolute inset-0 ${className}`} aria-hidden="true" />}
      <img
        {...props}
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
      />
    </>
  );
}
