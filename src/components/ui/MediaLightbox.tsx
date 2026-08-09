import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MediaLightboxProps {
  images: string[];
  activeIndex: number;
  alt: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export default function MediaLightbox({ images, activeIndex, alt, onIndexChange, onClose }: MediaLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && images.length > 1) {
        onIndexChange((activeIndex - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        onIndexChange((activeIndex + 1) % images.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousActive?.focus();
    };
  }, [activeIndex, images.length, onClose, onIndexChange]);

  if (images.length === 0) return null;
  const currentImage = images[Math.min(activeIndex, images.length - 1)];

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-3 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} 图片预览`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <button ref={closeRef} type="button" onClick={onClose} className="icon-button absolute right-4 top-4 z-10" title="关闭图片预览" aria-label="关闭图片预览">
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <button type="button" onClick={() => onIndexChange((activeIndex - 1 + images.length) % images.length)} className="icon-button absolute left-3 top-1/2 z-10 -translate-y-1/2 md:left-6" title="上一张" aria-label="上一张图片">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <figure className="flex h-full w-full max-w-[96rem] flex-col items-center justify-center gap-3">
        <img src={currentImage} alt={alt} className="max-h-[86dvh] max-w-full object-contain" referrerPolicy="no-referrer" decoding="async" />
        <figcaption className="text-xs text-studio-muted">
          {alt}{images.length > 1 ? ` · ${activeIndex + 1} / ${images.length}` : ''}
        </figcaption>
      </figure>

      {images.length > 1 && (
        <button type="button" onClick={() => onIndexChange((activeIndex + 1) % images.length)} className="icon-button absolute right-3 top-1/2 z-10 -translate-y-1/2 md:right-6" title="下一张" aria-label="下一张图片">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>,
    document.body,
  );
}
