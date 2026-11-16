import { useRef, useEffect } from 'react';
import { performanceTracker } from '../services/performanceTracker';

/**
 * React hook to profile component render cycles and duration.
 * Uses high-resolution performance.now() across mount and update cycles.
 */
export function useRenderTracker(componentName: string): void {
  const renderStartTime = useRef<number>(performance.now());
  const isFirstRender = useRef<boolean>(true);

  // Mark start of render calculation
  renderStartTime.current = performance.now();

  useEffect(() => {
    const duration = performance.now() - renderStartTime.current;
    
    // Ignore first render if we only want update cycles, or include it as initial mount
    performanceTracker.recordRender(componentName, duration);
    
    isFirstRender.current = false;
  });
}
