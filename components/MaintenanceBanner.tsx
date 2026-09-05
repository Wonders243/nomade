'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'maintenance-banner-dismissed';

export default function MaintenanceBanner() {
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        closeBanner();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeBanner();
      }
    };

    // Délai pour éviter la fermeture immédiate
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [expanded]);

  const closeBanner = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setExpanded(false);
    // Retourne le focus au bouton après fermeture
    setTimeout(() => buttonRef.current?.focus(), 100);
  };

  const openBanner = () => {
    setExpanded(true);
  };

  if (!isMaintenance || !mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-40">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="
              w-[320px]
              md:w-[380px]
              bg-stone-900/95
              backdrop-blur-md
              border
              border-stone-700
              rounded-2xl
              shadow-2xl
              p-5
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-title"
          >
            <div className="flex items-start justify-between mb-3">
              <span 
                id="maintenance-title"
                className="text-white tracking-[0.25em] text-xs font-medium"
              >
                NOMADE
              </span>

              <button
                onClick={closeBanner}
                className="
                  text-stone-400 
                  hover:text-white 
                  transition-colors 
                  p-1 
                  -mt-1 
                  -mr-1
                  focus:outline-none 
                  focus:ring-2 
                  focus:ring-stone-400 
                  focus:ring-offset-2 
                  focus:ring-offset-stone-900
                  rounded-full
                "
                aria-label="Fermer la bannière de maintenance"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-stone-300 text-sm leading-relaxed">
              La collection 1 est en cours de création.
              Pour être informé dès son lancement, inscrivez-vous à la
              newsletter.
            </p>

            <Link
              href="/contact"
              className="
                inline-block
                mt-4
                text-white
                text-sm
                underline
                underline-offset-4
                hover:text-stone-300
                transition-colors
                focus:outline-none
                focus:ring-2
                focus:ring-stone-400
                focus:ring-offset-2
                focus:ring-offset-stone-900
                rounded
              "
            >
              Contactez-nous
            </Link>

            <div className="mt-4 flex gap-1">
              <span className="w-1 h-1 rounded-full bg-stone-400" />
              <span className="w-1 h-1 rounded-full bg-stone-600" />
              <span className="w-1 h-1 rounded-full bg-stone-600" />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            ref={buttonRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openBanner}
            className="
              bg-stone-900/95
              backdrop-blur-md
              border
              border-stone-700
              text-white
              rounded-full
              px-5
              py-3
              shadow-xl
              text-xs
              tracking-[0.25em]
              hover:bg-stone-800
              transition-colors
              focus:outline-none
              focus:ring-2
              focus:ring-stone-400
              focus:ring-offset-2
              focus:ring-offset-stone-900
            "
            aria-label="Ouvrir la bannière de maintenance"
          >
            NOMADE
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}