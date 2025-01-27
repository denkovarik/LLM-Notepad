import { useState, useEffect, useCallback } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initial state from local storage
    const darkModePref = localStorage.getItem('darkMode');
    return darkModePref ? JSON.parse(darkModePref) : false;
  });

  useEffect(() => {
    // Load dark mode preference on mount
    const darkModePref = localStorage.getItem('darkMode');
    if (darkModePref) {
      setIsDarkMode(JSON.parse(darkModePref));
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
   
  }, []);

  return { isDarkMode, toggleDarkMode };
}