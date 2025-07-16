/**
 * Performance monitoring utility for Vibes Hunters
 * Tracks performance metrics and provides optimization insights
 */

import React from 'react';

interface PerformanceMetrics {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
    participantCount: number;
    audioLatency: number;
    networkLatency: number;
    errorCount: number;
    timestamp: number;
}

interface ComponentMetrics {
    name: string;
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
    memoryDelta: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics[] = [];
    private componentMetrics: Map<string, ComponentMetrics> = new Map();
    private startTime: number = performance.now();
    private observers: Map<string, PerformanceObserver> = new Map();
    private isEnabled: boolean = true;

    constructor() {
        this.initializeObservers();
        this.startMemoryMonitoring();
    }

    /**
     * Initialize performance observers
     */
    private initializeObservers(): void {
        try {
            // Monitor navigation timing
            if ('PerformanceObserver' in window) {
                const navObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'navigation') {
                            const navEntry = entry as PerformanceNavigationTiming;
                            this.recordMetric('navigation', navEntry.loadEventEnd - navEntry.fetchStart);
                        }
                    });
                });
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.set('navigation', navObserver);

                // Monitor long tasks
                const longTaskObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.duration > 50) { // Tasks longer than 50ms
                            console.warn('Long task detected:', entry.duration + 'ms');
                            this.recordMetric('longTask', entry.duration);
                        }
                    });
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            }
        } catch (error) {
            console.warn('Performance observers not supported:', error);
        }
    }

    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring(): void {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
                this.recordMetric('memory', memory.usedJSHeapSize);
            }, 10000); // Check every 10 seconds
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name: string, value: number): void {
        if (!this.isEnabled) return;

        const metric: PerformanceMetrics = {
            loadTime: name === 'loadTime' ? value : 0,
            renderTime: name === 'renderTime' ? value : 0,
            memoryUsage: name === 'memory' ? value : 0,
            participantCount: name === 'participantCount' ? value : 0,
            audioLatency: name === 'audioLatency' ? value : 0,
            networkLatency: name === 'networkLatency' ? value : 0,
            errorCount: name === 'errorCount' ? value : 0,
            timestamp: performance.now()
        };

        this.metrics.push(metric);

        // Keep only last 100 metrics to prevent memory bloat
        if (this.metrics.length > 100) {
            this.metrics = this.metrics.slice(-100);
        }

        // Log significant performance issues
        if (name === 'renderTime' && value > 100) {
            console.warn(`Slow render detected: ${value}ms`);
        }
    }

    /**
     * Start timing a component render
     */
    startComponentTiming(componentName: string): () => void {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const renderTime = endTime - startTime;

            this.recordComponentMetric(componentName, renderTime);
        };
    }

    /**
     * Record component-specific metrics
     */
    private recordComponentMetric(name: string, renderTime: number): void {
        const existing = this.componentMetrics.get(name);

        if (existing) {
            existing.renderCount++;
            existing.averageRenderTime = (existing.averageRenderTime * (existing.renderCount - 1) + renderTime) / existing.renderCount;
            existing.lastRenderTime = renderTime;
        } else {
            this.componentMetrics.set(name, {
                name,
                renderCount: 1,
                averageRenderTime: renderTime,
                lastRenderTime: renderTime,
                memoryDelta: 0
            });
        }
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        averageLoadTime: number;
        averageRenderTime: number;
        currentMemoryUsage: number;
        totalErrors: number;
        slowestComponents: ComponentMetrics[];
    } {
        const loadTimes = this.metrics.filter(m => m.loadTime > 0).map(m => m.loadTime);
        const renderTimes = this.metrics.filter(m => m.renderTime > 0).map(m => m.renderTime);
        const memoryUsages = this.metrics.filter(m => m.memoryUsage > 0).map(m => m.memoryUsage);
        const errorCounts = this.metrics.filter(m => m.errorCount > 0).map(m => m.errorCount);

        const slowestComponents = Array.from(this.componentMetrics.values())
            .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
            .slice(0, 5);

        return {
            averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
            averageRenderTime: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
            currentMemoryUsage: memoryUsages.length > 0 ? memoryUsages[memoryUsages.length - 1] : 0,
            totalErrors: errorCounts.reduce((a, b) => a + b, 0),
            slowestComponents
        };
    }

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions(): string[] {
        const suggestions: string[] = [];
        const summary = this.getPerformanceSummary();

        if (summary.averageLoadTime > 3000) {
            suggestions.push('Consider implementing code splitting to reduce initial load time');
        }

        if (summary.averageRenderTime > 50) {
            suggestions.push('Optimize component re-renders using React.memo and useMemo');
        }

        if (summary.currentMemoryUsage > 100 * 1024 * 1024) { // 100MB
            suggestions.push('Memory usage is high, check for memory leaks');
        }

        if (summary.slowestComponents.length > 0) {
            const slowest = summary.slowestComponents[0];
            if (slowest.averageRenderTime > 100) {
                suggestions.push(`${slowest.name} component is rendering slowly (${slowest.averageRenderTime.toFixed(2)}ms)`);
            }
        }

        return suggestions;
    }

    /**
     * Log performance report
     */
    logPerformanceReport(): void {
        const summary = this.getPerformanceSummary();
        const suggestions = this.getOptimizationSuggestions();

        console.group('🚀 Performance Report');
        console.log('📊 Summary:', summary);
        console.log('🔧 Optimization Suggestions:', suggestions);
        console.log('⏱️ Component Performance:', Array.from(this.componentMetrics.values()));
        console.groupEnd();
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;

        if (!enabled) {
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
        } else if (this.observers.size === 0) {
            this.initializeObservers();
        }
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        this.componentMetrics.clear();
    }

    /**
     * Cleanup observers
     */
    cleanup(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for component performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
    const startTiming = () => performanceMonitor.startComponentTiming(componentName);

    return {
        startTiming,
        recordMetric: (name: string, value: number) => performanceMonitor.recordMetric(name, value),
        getPerformanceSummary: () => performanceMonitor.getPerformanceSummary(),
        logReport: () => performanceMonitor.logPerformanceReport()
    };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<T extends object>(
    Component: React.ComponentType<T>,
    componentName: string
): React.ComponentType<T> {
    return function PerformanceMonitoredComponent(props: T) {
        const endTiming = performanceMonitor.startComponentTiming(componentName);

        React.useEffect(() => {
            return endTiming;
        });

        return React.createElement(Component, props);
    };
}

export { performanceMonitor };
export default performanceMonitor;
