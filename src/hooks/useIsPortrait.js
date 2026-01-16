import { useEffect, useState } from "react";

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