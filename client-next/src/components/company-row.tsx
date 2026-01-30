/**
 * This component adds a subtle gradient effect to company rows in the table
 */
import { useEffect } from "react";
import './company-table.tsx';  // Import to access styles

export function addGradientStyles() {
  useEffect(() => {
    // Find all company rows and add gradient styles
    const companyRows = document.querySelectorAll('.company-row');
    
    companyRows.forEach((row) => {
      // Add gradient styles
      row.classList.add('bg-gradient-to-r', 'from-blue-50/30', 'to-cyan-50/20', 'dark:from-blue-950/30', 'dark:to-cyan-950/20');
    });
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  return null;
}