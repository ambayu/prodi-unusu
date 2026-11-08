import React, { useEffect, useRef, useState } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'none';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: RevealDirection;
  delayMs?: number;
  durationMs?: number;
  threshold?: number;
  className?: string;
}

/**
 * Komponen Reveal untuk menganimasikan elemen individu saat masuk viewport scroll.
 * Mendukung delay bertingkat (stagger) antar-komponen.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  delayMs = 0,
  durationMs = 700,
  threshold = 0.15,
  className = '',
  style,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getTransform = () => {
    if (isVisible) return 'none';
    switch (direction) {
      case 'up':
        return 'translateY(36px)';
      case 'down':
        return 'translateY(-36px)';
      case 'left':
        return 'translateX(36px)';
      case 'right':
        return 'translateX(-36px)';
      case 'zoom':
        return 'scale(0.92)';
      case 'none':
        return 'none';
      default:
        return 'translateY(36px)';
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
