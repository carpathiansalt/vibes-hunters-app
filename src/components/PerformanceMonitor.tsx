'use client';

import { useEffect } from 'react';

interface PerformanceMetrics {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  TTFB?: number;
  bundleSize?: number;
  loadTime?: number;
}

export function PerformanceMonitor() {
  useEffect(() => {
    const metrics: PerformanceMetrics = {};

    // Monitor Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metrics.FCP = entry.startTime;
              console.log('🎨 First Contentful Paint:', entry.startTime.toFixed(2), 'ms');
            }
            break;
          case 'largest-contentful-paint':
            metrics.LCP = entry.startTime;
            console.log('🖼️ Largest Contentful Paint:', entry.startTime.toFixed(2), 'ms');
            break;
          case 'first-input':
            metrics.FID = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            console.log('⚡ First Input Delay:', metrics.FID?.toFixed(2), 'ms');
            break;
          case 'layout-shift':
            const layoutEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!layoutEntry.hadRecentInput) {
              metrics.CLS = (metrics.CLS || 0) + layoutEntry.value;
              console.log('🔄 Cumulative Layout Shift:', metrics.CLS?.toFixed(4));
            }
            break;
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
            metrics.loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
            console.log('🚀 Time to First Byte:', metrics.TTFB?.toFixed(2), 'ms');
            console.log('⏰ Total Load Time:', metrics.loadTime?.toFixed(2), 'ms');
            break;
        }
      });
    });

    // Observe different types of performance entries
    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });
    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const memoryInfo = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      console.log('💾 Memory Usage:', {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      });
    }

    // Monitor network information (if available)
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection: { effectiveType: string; downlink: number; rtt: number; saveData: boolean } }).connection;
      console.log('📡 Network Info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink + ' Mbps',
        rtt: connection.rtt + ' ms',
        saveData: connection.saveData
      });
    }

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          
          // Log slow resources (> 1 second)
          if (resource.duration > 1000) {
            console.warn('🐌 Slow Resource:', {
              name: resource.name,
              duration: resource.duration.toFixed(2) + ' ms',
              size: resource.transferSize ? Math.round(resource.transferSize / 1024) + ' KB' : 'unknown'
            });
          }

          // Track bundle sizes
          if (resource.name.includes('_next/static')) {
            metrics.bundleSize = (metrics.bundleSize || 0) + (resource.transferSize || 0);
          }
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource Observer not supported:', error);
    }

    // Log performance summary after page load
    const logPerformanceSummary = () => {
      console.group('📊 Performance Summary');
      console.log('First Contentful Paint:', metrics.FCP ? metrics.FCP.toFixed(2) + ' ms' : 'Not measured');
      console.log('Largest Contentful Paint:', metrics.LCP ? metrics.LCP.toFixed(2) + ' ms' : 'Not measured');
      console.log('First Input Delay:', metrics.FID ? metrics.FID.toFixed(2) + ' ms' : 'Not measured');
      console.log('Cumulative Layout Shift:', metrics.CLS ? metrics.CLS.toFixed(4) : 'Not measured');
      console.log('Time to First Byte:', metrics.TTFB ? metrics.TTFB.toFixed(2) + ' ms' : 'Not measured');
      console.log('Total Load Time:', metrics.loadTime ? metrics.loadTime.toFixed(2) + ' ms' : 'Not measured');
      console.log('Bundle Size:', metrics.bundleSize ? Math.round(metrics.bundleSize / 1024) + ' KB' : 'Not measured');
      
      // Performance scoring
      const scores = {
        FCP: metrics.FCP ? (metrics.FCP < 1800 ? 'Good' : metrics.FCP < 3000 ? 'Needs Improvement' : 'Poor') : 'N/A',
        LCP: metrics.LCP ? (metrics.LCP < 2500 ? 'Good' : metrics.LCP < 4000 ? 'Needs Improvement' : 'Poor') : 'N/A',
        FID: metrics.FID ? (metrics.FID < 100 ? 'Good' : metrics.FID < 300 ? 'Needs Improvement' : 'Poor') : 'N/A',
        CLS: metrics.CLS ? (metrics.CLS < 0.1 ? 'Good' : metrics.CLS < 0.25 ? 'Needs Improvement' : 'Poor') : 'N/A'
      };
      
      console.log('Performance Scores:', scores);
      console.groupEnd();
    };

    const timeoutId = setTimeout(logPerformanceSummary, 3000);

    return () => {
      observer.disconnect();
      resourceObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
}