import React, { createContext, useContext, useMemo } from 'react';
import { createStyles, lightColors, darkColors } from './styles';
const light = { s: createStyles(lightColors), C: lightColors, dark: false };
const ThemeContext = createContext(light);
export function ThemeProvider({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  const value = useMemo(() => {
    const C = dark ? darkColors : lightColors;
    return { C, s: createStyles(C), dark };
  }, [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
