import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  alt: string;
  showFallbackText?: boolean;
}

export default function SmartImage({ src, alt, className = '', showFallbackText = false, onError, ...props }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span className={`flex items-center justify-center gap-2 bg-studio-surface text-studio-faint ${className}`} role="img" aria-label={`${alt || '图片'}暂不可用`}>
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        {showFallbackText && <span className="text-[10px]">图片暂不可用</span>}
      </span>
    );
  }

  return <img {...props} src={src} alt={alt} className={className} onError={(event) => {
    setFailed(true);
    onError?.(event);
  }} />;
}
