'use client';

// Make scrolling overlay possible
// Make scroll lock when loading page with open overlay (?kort or ?lyt)

import { useEffect } from 'react';

export function useScrollLock(locked) {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (locked) {
      body.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
    } else {
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
    }

    return () => {
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
    };
  }, [locked]);
}