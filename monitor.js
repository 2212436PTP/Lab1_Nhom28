/**
 * Network Traffic Monitor - Lab 01 Part C
 * Nhóm 28 - Công cụ giám sát hiệu suất mạng
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class NetworkMonitor extends EventEmitter {
    constructor() {
        super();
        this.statistics = {
            totalRequests: 0,
            staticRequests: 0,
            dynamicRequests: 0,
            requestsByMethod: {},
            requestsByStatus: {},
            responseTimeHistory: [],
            bandwidthUsage: [],
            connectionPool: new Map(),
            requestPatterns: new Map()
        };
        
        this.config = {
            sampleInterval: 1000, // 1 second
            maxHistorySize: 1000,
            performanceThreshold: 2000, // 2 seconds
            logToFile: true,
            logPath: './logs/network-monitor.log'
        };

        this.startTime = Date.now();
        this.isMonitoring = false;
        this.requestLog = [];

        // Ensure logs directory exists
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.config.logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    /**
     * Start monitoring network traffic
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Monitor is already running');
            return;
        }

        this.isMonitoring = true;
        this.startTime = Date.now();
        
        console.log('🚀 Network Monitor Started');
        console.log(`📊 Sampling interval: ${this.config.sampleInterval}ms`);
        console.log(`📈 Performance threshold: ${this.config.performanceThreshold}ms`);
        console.log(`📁 Logging to: ${this.config.logPath}`);
        
        // Hook into HTTP/HTTPS modules
        this.hookHTTPRequests();
        
        // Start periodic sampling
        this.samplingInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.sampleInterval);

        // Log startup
        this.logEvent('MONITOR_START', 'Network monitoring started');
        
        this.emit('monitoring-started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('Monitor is not running');
            return;
        }

        this.isMonitoring = false;
        
        if (this.samplingInterval) {
            clearInterval(this.samplingInterval);
        }

        console.log('🛑 Network Monitor Stopped');
        this.logEvent('MONITOR_STOP', 'Network monitoring stopped');
        this.generateFinalReport();
        
        this.emit('monitoring-stopped');
    }

    /**
     * Hook into Node.js HTTP modules to intercept requests
     */
    hookHTTPRequests() {
        const monitor = this;
        
        // Hook HTTP requests
        const originalHttpRequest = http.request;
        http.request = function(...args) {
            const req = originalHttpRequest.apply(this, args);
            monitor.trackRequest(req, 'http');
            return req;
        };

        // Hook HTTPS requests
        const originalHttpsRequest = https.request;
        https.request = function(...args) {
            const req = originalHttpsRequest.apply(this, args);
            monitor.trackRequest(req, 'https');
            return req;
        };
    }

    /**
     * Track individual HTTP request
     */
    trackRequest(req, protocol) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        
        const requestInfo = {
            id: requestId,
            protocol: protocol,
            method: req.method || 'GET',
            url: this.getFullUrl(req),
            startTime: startTime,
            headers: req.getHeaders ? req.getHeaders() : {},
            userAgent: req.getHeader ? req.getHeader('user-agent') : 'Unknown'
        };

        // Classify request type
        requestInfo.type = this.classifyRequest(requestInfo.url);
        
        this.statistics.totalRequests++;
        this.updateMethodStats(requestInfo.method);
        this.updateTypeStats(requestInfo.type);

        // Track response
        req.on('response', (res) => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            requestInfo.endTime = endTime;
            requestInfo.responseTime = responseTime;
            requestInfo.statusCode = res.statusCode;
            requestInfo.contentLength = parseInt(res.headers['content-length']) || 0;
            requestInfo.contentType = res.headers['content-type'] || 'unknown';

            this.updateStatusStats(res.statusCode);
            this.updateResponseTimeStats(responseTime);
            this.updateBandwidthStats(requestInfo.contentLength);
            
            // Log slow requests
            if (responseTime > this.config.performanceThreshold) {
                this.logEvent('SLOW_REQUEST', `Slow request detected: ${requestInfo.url} (${responseTime}ms)`);
            }

            // Store request log
            this.requestLog.push(requestInfo);
            this.analyzeRequestPattern(requestInfo);

            console.log(`📡 ${requestInfo.method} ${requestInfo.url} - ${res.statusCode} (${responseTime}ms)`);
            
            this.emit('request-completed', requestInfo);
        });

        req.on('error', (error) => {
            const endTime = Date.now();
            requestInfo.endTime = endTime;
            requestInfo.error = error.message;
            requestInfo.responseTime = endTime - startTime;

            this.logEvent('REQUEST_ERROR', `Request failed: ${requestInfo.url} - ${error.message}`);
            console.error(`❌ ${requestInfo.method} ${requestInfo.url} - ERROR: ${error.message}`);
            
            this.emit('request-error', requestInfo);
        });

        this.emit('request-started', requestInfo);
    }

    /**
     * Classify request as static or dynamic
     */
    classifyRequest(url) {
        const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
        const dynamicPaths = ['/api/', '/data/', '/ajax/', '/ws/'];
        
        // Check for static file extensions
        const hasStaticExtension = staticExtensions.some(ext => url.toLowerCase().includes(ext));
        if (hasStaticExtension) {
            return 'static';
        }
        
        // Check for dynamic API paths
        const hasDynamicPath = dynamicPaths.some(path => url.toLowerCase().includes(path));
        if (hasDynamicPath) {
            return 'dynamic';
        }

        // Default classification based on common patterns
        if (url.includes('?') || url.includes('#')) {
            return 'dynamic';
        }

        return 'static';
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get full URL from request object
     */
    getFullUrl(req) {
        const protocol = req.protocol || 'http';
        const host = req.getHeader ? req.getHeader('host') : 'localhost';
        const path = req.path || '/';
        return `${protocol}://${host}${path}`;
    }

    /**
     * Update method statistics
     */
    updateMethodStats(method) {
        this.statistics.requestsByMethod[method] = (this.statistics.requestsByMethod[method] || 0) + 1;
    }

    /**
     * Update request type statistics
     */
    updateTypeStats(type) {
        if (type === 'static') {
            this.statistics.staticRequests++;
        } else {
            this.statistics.dynamicRequests++;
        }
    }

    /**
     * Update status code statistics
     */
    updateStatusStats(statusCode) {
        this.statistics.requestsByStatus[statusCode] = (this.statistics.requestsByStatus[statusCode] || 0) + 1;
    }

    /**
     * Update response time statistics
     */
    updateResponseTimeStats(responseTime) {
        this.statistics.responseTimeHistory.push({
            time: Date.now(),
            responseTime: responseTime
        });

        // Keep history size manageable
        if (this.statistics.responseTimeHistory.length > this.config.maxHistorySize) {
            this.statistics.responseTimeHistory.shift();
        }
    }

    /**
     * Update bandwidth statistics
     */
    updateBandwidthStats(bytes) {
        this.statistics.bandwidthUsage.push({
            time: Date.now(),
            bytes: bytes
        });

        // Keep history size manageable
        if (this.statistics.bandwidthUsage.length > this.config.maxHistorySize) {
            this.statistics.bandwidthUsage.shift();
        }
    }

    /**
     * Analyze request patterns
     */
    analyzeRequestPattern(requestInfo) {
        const pattern = `${requestInfo.method}:${this.getPathPattern(requestInfo.url)}`;
        
        if (!this.statistics.requestPatterns.has(pattern)) {
            this.statistics.requestPatterns.set(pattern, {
                count: 0,
                totalResponseTime: 0,
                avgResponseTime: 0,
                lastSeen: null,
                errors: 0
            });
        }

        const patternStats = this.statistics.requestPatterns.get(pattern);
        patternStats.count++;
        patternStats.totalResponseTime += requestInfo.responseTime || 0;
        patternStats.avgResponseTime = patternStats.totalResponseTime / patternStats.count;
        patternStats.lastSeen = requestInfo.endTime;
        
        if (requestInfo.error) {
            patternStats.errors++;
        }
    }

    /**
     * Extract pattern from URL path
     */
    getPathPattern(url) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;
            
            // Replace numeric IDs with placeholder
            path = path.replace(/\/\d+/g, '/:id');
            
            // Replace UUID patterns
            path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
            
            return path;
        } catch (e) {
            return url;
        }
    }

    /**
     * Collect periodic metrics
     */
    collectMetrics() {
        const currentTime = Date.now();
        const uptime = currentTime - this.startTime;
        
        const metrics = {
            timestamp: currentTime,
            uptime: uptime,
            totalRequests: this.statistics.totalRequests,
            requestsPerSecond: this.calculateRequestsPerSecond(),
            avgResponseTime: this.calculateAverageResponseTime(),
            currentBandwidth: this.calculateCurrentBandwidth(),
            errorRate: this.calculateErrorRate()
        };

        this.emit('metrics-collected', metrics);
        
        // Log metrics periodically
        if (this.statistics.totalRequests % 10 === 0 && this.statistics.totalRequests > 0) {
            console.log(`📊 Metrics: ${metrics.requestsPerSecond.toFixed(2)} req/s, ${metrics.avgResponseTime.toFixed(2)}ms avg, ${(metrics.currentBandwidth/1024).toFixed(2)} KB/s`);
        }
    }

    /**
     * Calculate requests per second
     */
    calculateRequestsPerSecond() {
        const timeWindow = 10000; // 10 seconds
        const cutoff = Date.now() - timeWindow;
        const recentRequests = this.requestLog.filter(req => req.startTime > cutoff);
        return (recentRequests.length / (timeWindow / 1000));
    }

    /**
     * Calculate average response time
     */
    calculateAverageResponseTime() {
        if (this.statistics.responseTimeHistory.length === 0) return 0;
        
        const recent = this.statistics.responseTimeHistory.slice(-100); // Last 100 requests
        const total = recent.reduce((sum, item) => sum + item.responseTime, 0);
        return total / recent.length;
    }

    /**
     * Calculate current bandwidth usage
     */
    calculateCurrentBandwidth() {
        const timeWindow = 5000; // 5 seconds
        const cutoff = Date.now() - timeWindow;
        const recentData = this.statistics.bandwidthUsage.filter(item => item.time > cutoff);
        const totalBytes = recentData.reduce((sum, item) => sum + item.bytes, 0);
        return totalBytes / (timeWindow / 1000); // bytes per second
    }

    /**
     * Calculate error rate percentage
     */
    calculateErrorRate() {
        if (this.statistics.totalRequests === 0) return 0;
        
        const errorCount = Object.keys(this.statistics.requestsByStatus)
            .filter(status => parseInt(status) >= 400)
            .reduce((sum, status) => sum + this.statistics.requestsByStatus[status], 0);
            
        return (errorCount / this.statistics.totalRequests) * 100;
    }

    /**
     * Get current statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            uptime: Date.now() - this.startTime,
            isMonitoring: this.isMonitoring,
            requestsPerSecond: this.calculateRequestsPerSecond(),
            avgResponseTime: this.calculateAverageResponseTime(),
            currentBandwidth: this.calculateCurrentBandwidth(),
            errorRate: this.calculateErrorRate()
        };
    }

    /**
     * Log events to file
     */
    logEvent(type, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            uptime: Date.now() - this.startTime
        };

        if (this.config.logToFile) {
            try {
                fs.appendFileSync(this.config.logPath, JSON.stringify(logEntry) + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error.message);
            }
        }
    }

    /**
     * Generate final monitoring report
     */
    generateFinalReport() {
        const report = {
            summary: {
                totalRequests: this.statistics.totalRequests,
                staticRequests: this.statistics.staticRequests,
                dynamicRequests: this.statistics.dynamicRequests,
                uptime: Date.now() - this.startTime,
                avgResponseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate()
            },
            methodBreakdown: this.statistics.requestsByMethod,
            statusBreakdown: this.statistics.requestsByStatus,
            patterns: Object.fromEntries(this.statistics.requestPatterns),
            performance: {
                slowRequests: this.requestLog.filter(req => req.responseTime > this.config.performanceThreshold).length,
                fastestRequest: Math.min(...this.requestLog.map(req => req.responseTime || Infinity)),
                slowestRequest: Math.max(...this.requestLog.map(req => req.responseTime || 0))
            }
        };

        // Save report to file
        const reportPath = './logs/network-report.json';
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`📄 Final report saved to: ${reportPath}`);
        } catch (error) {
            console.error('Failed to save report:', error.message);
        }

        console.log('\n📊 NETWORK MONITORING SUMMARY');
        console.log('================================');
        console.log(`Total Requests: ${report.summary.totalRequests}`);
        console.log(`Static Requests: ${report.summary.staticRequests} (${((report.summary.staticRequests/report.summary.totalRequests)*100).toFixed(1)}%)`);
        console.log(`Dynamic Requests: ${report.summary.dynamicRequests} (${((report.summary.dynamicRequests/report.summary.totalRequests)*100).toFixed(1)}%)`);
        console.log(`Average Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
        console.log(`Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
        console.log(`Uptime: ${Math.floor(report.summary.uptime/1000)}s`);

        return report;
    }
}

// CLI Interface
if (require.main === module) {
    const monitor = new NetworkMonitor();
    
    // Handle CLI arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'start':
            monitor.startMonitoring();
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down monitor...');
                monitor.stopMonitoring();
                process.exit(0);
            });

            // Keep process alive
            setInterval(() => {
                // Display periodic stats
            }, 5000);
            break;

        case 'test':
            console.log('🧪 Running network monitor test...');
            monitor.startMonitoring();
            
            // Make some test requests
            setTimeout(() => {
                const http = require('http');
                
                // Test different types of requests
                const testRequests = [
                    'http://localhost:3000/',
                    'http://localhost:3000/api/server-info',
                    'http://localhost:3000/api/status',
                    'http://localhost:3000/style.css',
                    'http://localhost:3000/script.js'
                ];

                testRequests.forEach((url, index) => {
                    setTimeout(() => {
                        http.get(url, (res) => {
                            console.log(`✅ Test request ${index + 1} completed`);
                        }).on('error', (err) => {
                            console.log(`❌ Test request ${index + 1} failed: ${err.message}`);
                        });
                    }, index * 1000);
                });

                // Stop monitoring after tests
                setTimeout(() => {
                    monitor.stopMonitoring();
                    process.exit(0);
                }, 10000);
            }, 1000);
            break;

        default:
            console.log('Network Traffic Monitor - Lab 01 Part C');
            console.log('Nhóm 28 - Usage:');
            console.log('  node monitor.js start  - Start monitoring');
            console.log('  node monitor.js test   - Run test suite');
    }
}

module.exports = NetworkMonitor;
