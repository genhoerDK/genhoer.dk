import { useEffect, useState } from "react";

/**
 * True when the viewport is narrower than Tailwind's md breakpoint (768px).
 * Always false during the first render, then updates on mount and resize.
 * @returns {boolean} Use as: const isPortrait = useIsPortrait();
 */
export function useIsPortrait() {
  const [isPortrait, setIsPortrait] = useState(false);  // default safe value

  useEffect(() => {
    const checkViewport = () => {
      setIsPortrait(window.innerWidth < 768); // Tailwind CSS md-value
    };

    checkViewport();    // set initial value
    window.addEventListener("resize", checkViewport);

    return () => {
      window.removeEventListener("resize", checkViewport);
    };
  }, []);

  return isPortrait;
}
