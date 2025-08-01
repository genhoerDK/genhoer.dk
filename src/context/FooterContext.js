'use client';

import { createContext, useContext, useState } from "react";

const FooterContext = createContext();

export function FooterProvider({ children }) {
  const [buttons, setButtons] = useState([]);

  return (
    <FooterContext.Provider value={{ buttons, setButtons }}>
      {children}
    </FooterContext.Provider>
  );
}

export function useFooter() {
  return useContext(FooterContext);
}