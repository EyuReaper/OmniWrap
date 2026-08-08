'use client';

import { motion } from 'framer-motion';

type Variant = 'up' | 'down' | 'fade' | 'scale';

const variants: Record<Variant, { initial: Record<string, number>; animate: Record<string, number> }> = {
  up: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
  down: { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  scale: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
};

/**
 * Minimal client island for entrance animation, so pages that are otherwise
 * static can stay Server Components and ship their markup as HTML.
 * Reduced-motion is honoured globally by <MotionConfig reducedMotion="user">.
 */
export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 0.6,
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const { initial, animate } = variants[variant];
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
