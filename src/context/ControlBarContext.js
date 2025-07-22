'use client';

import { createContext, useContext, useState } from "react";

const ControlBarContext = createContext();

export function ControlBarProvider({ children }) {
  const [buttons, setButtons] = useState([]);

  return (
    <ControlBarContext.Provider value={{ buttons, setButtons }}>
      {children}
    </ControlBarContext.Provider>
  );
}

export function useControlBar() {
  return useContext(ControlBarContext);
}