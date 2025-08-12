const http = require('http');
const { APIClient } = require('./client');

class ServerMonitor {
    constructor(serverURL = 'http://localhost:3000', interval = 5000) {
        this.serverURL = serverURL;
        this.interval = interval;
        this.client = new APIClient(serverURL);
        this.isRunning = false;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            responseTimes: []
        };
    }

    async checkServerHealth() {
        const startTime = Date.now();
        
        try {
            const response = await this.client.getStatus();
            const responseTime = Date.now() - startTime;
            
            this.stats.totalRequests++;
            this.stats.successfulRequests++;
            this.stats.responseTimes.push(responseTime);
            
            // Keep only last 100 response times for average calculation
            if (this.stats.responseTimes.length > 100) {
                this.stats.responseTimes.shift();
            }
            
            this.stats.averageResponseTime = 
                this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;

            return {
                status: 'healthy',
                statusCode: response.statusCode,
                responseTime: responseTime,
                serverResponse: response.data
            };
            
        } catch (error) {
            this.stats.totalRequests++;
            this.stats.failedRequests++;
            
            return {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    displayStats() {
        console.clear();
        console.log('=== Lab 01 - Nhóm 28 - Server Monitor ===\n');
        console.log(`Monitoring: ${this.serverURL}`);
        console.log(`Check interval: ${this.interval}ms\n`);
        
        console.log('📊 Statistics:');
        console.log(`Total Requests: ${this.stats.totalRequests}`);
        console.log(`Successful: ${this.stats.successfulRequests}`);
        console.log(`Failed: ${this.stats.failedRequests}`);
        console.log(`Success Rate: ${this.stats.totalRequests > 0 ? 
            ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%' : 'N/A'}`);
        console.log(`Average Response Time: ${this.stats.averageResponseTime.toFixed(2)}ms\n`);
        
        console.log('Press Ctrl+C to stop monitoring...\n');
    }

    async start() {
        console.log('Starting server monitor...');
        this.isRunning = true;
        
        while (this.isRunning) {
            const health = await this.checkServerHealth();
            
            this.displayStats();
            
            if (health.status === 'healthy') {
                console.log('✅ Server Status: HEALTHY');
                console.log(`Response Time: ${health.responseTime}ms`);
                console.log(`Server Message: ${health.serverResponse.message}`);
            } else {
                console.log('❌ Server Status: UNHEALTHY');
                console.log(`Error: ${health.error}`);
            }
            
            console.log(`\nLast check: ${new Date().toLocaleString()}`);
            
            // Wait for the specified interval
            await new Promise(resolve => setTimeout(resolve, this.interval));
        }
    }

    stop() {
        this.isRunning = false;
        console.log('\nMonitoring stopped.');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down monitor...');
    process.exit(0);
});

// Run monitor if this file is executed directly
if (require.main === module) {
    const monitor = new ServerMonitor();
    
    console.log('Lab 01 - Nhóm 28 - Server Monitor');
    console.log('Make sure the server is running before starting the monitor.\n');
    
    // Start monitoring after a short delay
    setTimeout(() => {
        monitor.start();
    }, 1000);
}

module.exports = ServerMonitor;
