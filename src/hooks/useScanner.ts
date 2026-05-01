import { useEffect, useRef } from 'react';

/**
 * Hook to listen for HID scanner inputs (USB keyboard emulation).
 * It buffers keystrokes that happen rapidly and triggers a callback on 'Enter'.
 */
export const useScanner = (onScan: (code: string) => void, enabled: boolean = true) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // If the delay between keys is too long, it's likely a human typing, not a scanner.
      // Scanners are extremely fast (usually < 30ms between characters).
      if (now - lastKeyTimeRef.current > 100 && bufferRef.current.length > 0) {
        bufferRef.current = ''; // Reset buffer if it's too slow
      }

      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length > 0) {
          onScan(bufferRef.current);
          bufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        // Collect single characters
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, enabled]);
};
