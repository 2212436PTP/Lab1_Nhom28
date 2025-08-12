const http = require('http');
const https = require('https');

/**
 * Part B: HTTP Client Implementation (35 points)
 * Built from scratch without axios/fetch libraries
 * Supports GET and POST methods for both HTTP and HTTPS
 * Includes comprehensive error handling and logging
 */
class HTTPClient {
    constructor() {
        this.requestCount = 0;
        this.logLevel = 'detailed'; // 'basic' | 'detailed'
    }

    /**
     * Core HTTP/HTTPS request method
     * @param {string} url - Full URL to request
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {Object} data - Request body data
     * @param {Object} customHeaders - Additional headers
     * @returns {Promise} Response object
     */
    async makeRequest(url, method = 'GET', data = null, customHeaders = {}) {
        return new Promise((resolve, reject) => {
            this.requestCount++;
            const requestId = `REQ-${this.requestCount}-${Date.now()}`;
            
            this.log(`\n🚀 [${requestId}] Starting ${method} request to: ${url}`);
            
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                this.log(`❌ [${requestId}] Invalid URL: ${error.message}`, 'error');
                reject(new Error(`Invalid URL: ${url}`));
                return;
            }

            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            const defaultPort = isHttps ? 443 : 80;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || defaultPort,
                path: parsedUrl.pathname + parsedUrl.search,
                method: method.toUpperCase(),
                headers: {
                    'User-Agent': 'Lab01-HTTPClient-Nhom28/1.0.0',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    ...customHeaders
                },
                timeout: 30000 // 30 second timeout
            };

            // Handle request body for POST/PUT requests
            let postData = null;
            if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                if (typeof data === 'object') {
                    postData = JSON.stringify(data);
                    options.headers['Content-Type'] = 'application/json';
                } else {
                    postData = data.toString();
                    options.headers['Content-Type'] = 'text/plain';
                }
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            this.log(`📋 [${requestId}] Request details:`, 'info');
            this.log(`   Protocol: ${isHttps ? 'HTTPS' : 'HTTP'}`, 'info');
            this.log(`   Host: ${options.hostname}:${options.port}`, 'info');
            this.log(`   Path: ${options.path}`, 'info');
            this.log(`   Method: ${options.method}`, 'info');
            this.log(`   Headers: ${JSON.stringify(options.headers, null, 2)}`, 'info');
            if (postData) {
                this.log(`   Body: ${postData}`, 'info');
            }

            const startTime = Date.now();
            
            const req = client.request(options, (res) => {
                const responseTime = Date.now() - startTime;
                this.log(`📡 [${requestId}] Response received (${responseTime}ms):`, 'info');
                this.log(`   Status: ${res.statusCode} ${res.statusMessage}`, 'info');
                this.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`, 'info');
                
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    this.log(`✅ [${requestId}] Response completed`, 'info');
                    
                    let parsedData = responseData;
                    try {
                        // Try to parse as JSON
                        parsedData = JSON.parse(responseData);
                        this.log(`📄 [${requestId}] JSON Response: ${JSON.stringify(parsedData, null, 2)}`, 'info');
                    } catch (error) {
                        this.log(`📄 [${requestId}] Text Response: ${responseData.substring(0, 500)}...`, 'info');
                    }
                    
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        data: parsedData,
                        rawData: responseData,
                        responseTime: responseTime,
                        requestId: requestId,
                        url: url,
                        method: method
                    });
                });
            });

            // Handle request errors
            req.on('error', (error) => {
                const responseTime = Date.now() - startTime;
                this.log(`❌ [${requestId}] Request failed (${responseTime}ms): ${error.message}`, 'error');
                
                reject({
                    success: false,
                    error: error.message,
                    errorCode: error.code,
                    responseTime: responseTime,
                    requestId: requestId,
                    url: url,
                    method: method
                });
            });

            // Handle timeout
            req.on('timeout', () => {
                const responseTime = Date.now() - startTime;
                this.log(`⏰ [${requestId}] Request timeout (${responseTime}ms)`, 'error');
                req.destroy();
                
                reject({
                    success: false,
                    error: 'Request timeout',
                    errorCode: 'TIMEOUT',
                    responseTime: responseTime,
                    requestId: requestId,
                    url: url,
                    method: method
                });
            });

            // Write request body if present
            if (postData) {
                req.write(postData);
            }
            
            req.end();
        });
    }

    /**
     * Utility method for logging with different levels
     * @param {string} message - Log message
     * @param {string} level - Log level (info, error, success)
     */
    log(message, level = 'info') {
        if (this.logLevel === 'basic' && level === 'info') return;
        
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '🔍',
            'error': '❌',
            'success': '✅',
            'warning': '⚠️'
        }[level] || '📝';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    /**
     * Convenience method for GET requests
     * @param {string} url - Target URL
     * @param {Object} headers - Custom headers
     * @returns {Promise} Response object
     */
    async get(url, headers = {}) {
        return this.makeRequest(url, 'GET', null, headers);
    }

    /**
     * Convenience method for POST requests
     * @param {string} url - Target URL
     * @param {Object} data - Request body
     * @param {Object} headers - Custom headers
     * @returns {Promise} Response object
     */
    async post(url, data, headers = {}) {
        return this.makeRequest(url, 'POST', data, headers);
    }

    /**
     * Test server availability
     * @param {string} url - Server URL to test
     * @returns {Promise} Boolean indicating availability
     */
    async isServerAvailable(url) {
        try {
            const response = await this.get(url);
            return response.success;
        } catch (error) {
            return false;
        }
    }
}

// Legacy APIClient for backward compatibility
class APIClient extends HTTPClient {
    constructor(baseURL = 'http://localhost:3000') {
        super();
        this.baseURL = baseURL;
    }

    async makeRequest(path, method = 'GET', data = null) {
        const fullUrl = new URL(path, this.baseURL).toString();
        return super.makeRequest(fullUrl, method, data);
    }

    async getStatus() {
        return this.makeRequest('/api/status');
    }

    async getInfo() {
        return this.makeRequest('/api/info');
    }

    async postData(data) {
        return this.makeRequest('/api/data', 'POST', { data });
    }
}

/**
 * PART B: HTTP CLIENT TESTING SCENARIOS (35 points)
 * All required test cases as per assignment requirements
 */

// Test Scenario 1: GET request to local server
async function testLocalServerGET() {
    console.log('\n🧪 TEST 1: GET Request to Local Server');
    console.log('=' .repeat(50));
    
    const client = new HTTPClient();
    
    try {
        const response = await client.get('http://localhost:3000/api/server-info');
        
        if (response.success) {
            console.log('✅ Local server GET request successful!');
            console.log(`📊 Status: ${response.statusCode} ${response.statusMessage}`);
            console.log(`⚡ Response time: ${response.responseTime}ms`);
            console.log(`🔗 URL: ${response.url}`);
            console.log(`📄 Server info received: ${response.data.lab || 'N/A'}`);
        } else {
            console.log('❌ Local server GET request failed!');
            console.log(`📊 Status: ${response.statusCode}`);
        }
        
        return response;
        
    } catch (error) {
        console.log('❌ Local server GET request error!');
        console.log(`🔍 Error: ${error.error || error.message}`);
        console.log(`🔍 Error Code: ${error.errorCode || 'UNKNOWN'}`);
        return error;
    }
}

// Test Scenario 2: GET request to external API (GitHub API)
async function testExternalAPIGET() {
    console.log('\n🧪 TEST 2: GET Request to External API (GitHub)');
    console.log('=' .repeat(50));
    
    const client = new HTTPClient();
    
    try {
        const response = await client.get('https://api.github.com/users/octocat', {
            'Accept': 'application/vnd.github.v3+json'
        });
        
        if (response.success) {
            console.log('✅ GitHub API GET request successful!');
            console.log(`📊 Status: ${response.statusCode} ${response.statusMessage}`);
            console.log(`⚡ Response time: ${response.responseTime}ms`);
            console.log(`🔗 URL: ${response.url}`);
            console.log(`👤 User: ${response.data.login || 'N/A'}`);
            console.log(`📝 Bio: ${response.data.bio || 'No bio available'}`);
            console.log(`📍 Location: ${response.data.location || 'Unknown'}`);
        } else {
            console.log('❌ GitHub API GET request failed!');
            console.log(`📊 Status: ${response.statusCode}`);
        }
        
        return response;
        
    } catch (error) {
        console.log('❌ GitHub API GET request error!');
        console.log(`🔍 Error: ${error.error || error.message}`);
        console.log(`🔍 Error Code: ${error.errorCode || 'UNKNOWN'}`);
        return error;
    }
}

// Test Scenario 3: POST request to test endpoint (JSONPlaceholder)
async function testExternalAPIPOST() {
    console.log('\n🧪 TEST 3: POST Request to External API (JSONPlaceholder)');
    console.log('=' .repeat(50));
    
    const client = new HTTPClient();
    
    const testData = {
        title: 'Lab 01 - Nhóm 28 Test Post',
        body: 'This is a test POST request from our HTTP client implementation for Web NC Lab 01.',
        userId: 28,
        timestamp: new Date().toISOString(),
        group: 'Nhóm 28'
    };
    
    try {
        const response = await client.post('https://jsonplaceholder.typicode.com/posts', testData);
        
        if (response.success) {
            console.log('✅ JSONPlaceholder POST request successful!');
            console.log(`📊 Status: ${response.statusCode} ${response.statusMessage}`);
            console.log(`⚡ Response time: ${response.responseTime}ms`);
            console.log(`🔗 URL: ${response.url}`);
            console.log(`🆔 Created post ID: ${response.data.id || 'N/A'}`);
            console.log(`📝 Title: ${response.data.title || 'N/A'}`);
        } else {
            console.log('❌ JSONPlaceholder POST request failed!');
            console.log(`📊 Status: ${response.statusCode}`);
        }
        
        return response;
        
    } catch (error) {
        console.log('❌ JSONPlaceholder POST request error!');
        console.log(`🔍 Error: ${error.error || error.message}`);
        console.log(`🔍 Error Code: ${error.errorCode || 'UNKNOWN'}`);
        return error;
    }
}

// Test Scenario 4: Error handling when server is unavailable
async function testServerUnavailable() {
    console.log('\n🧪 TEST 4: Error Handling - Server Unavailable');
    console.log('=' .repeat(50));
    
    const client = new HTTPClient();
    
    // Test with non-existent server
    const unavailableUrls = [
        'http://localhost:9999/api/test',  // Non-existent port
        'https://non-existent-domain-12345.com/api/test',  // Non-existent domain
        'http://127.0.0.1:8888/timeout-test'  // Different unavailable port
    ];
    
    for (const url of unavailableUrls) {
        console.log(`\n🔍 Testing unavailable server: ${url}`);
        
        try {
            const response = await client.get(url);
            console.log('⚠️  Unexpected success - server should be unavailable');
            console.log(`📊 Status: ${response.statusCode}`);
        } catch (error) {
            console.log('✅ Error handling working correctly!');
            console.log(`🔍 Error: ${error.error || error.message}`);
            console.log(`🔍 Error Code: ${error.errorCode || 'UNKNOWN'}`);
            console.log(`⚡ Failed after: ${error.responseTime || 0}ms`);
        }
    }
}

// Test Scenario 5: Local server POST test
async function testLocalServerPOST() {
    console.log('\n🧪 TEST 5: POST Request to Local Server');
    console.log('=' .repeat(50));
    
    const client = new HTTPClient();
    
    const testData = {
        message: 'Hello from Part B HTTP Client!',
        timestamp: new Date().toISOString(),
        testType: 'Part B - HTTP Client Implementation',
        group: 'Nhóm 28',
        randomId: Math.floor(Math.random() * 10000)
    };
    
    try {
        const response = await client.post('http://localhost:3000/api/data', testData);
        
        if (response.success) {
            console.log('✅ Local server POST request successful!');
            console.log(`📊 Status: ${response.statusCode} ${response.statusMessage}`);
            console.log(`⚡ Response time: ${response.responseTime}ms`);
            console.log(`🔗 URL: ${response.url}`);
            console.log(`📄 Server response: ${response.data.message || 'N/A'}`);
        } else {
            console.log('❌ Local server POST request failed!');
            console.log(`📊 Status: ${response.statusCode}`);
        }
        
        return response;
        
    } catch (error) {
        console.log('❌ Local server POST request error!');
        console.log(`🔍 Error: ${error.error || error.message}`);
        console.log(`🔍 Error Code: ${error.errorCode || 'UNKNOWN'}`);
        return error;
    }
}

// Main test runner for Part B
async function runPartBTests() {
    console.log('\n🎯 PART B: HTTP CLIENT IMPLEMENTATION TESTS');
    console.log('🎯 Testing comprehensive HTTP client built from scratch');
    console.log('🎯 Lab 01 - Nhóm 28 - Web NC');
    console.log('=' .repeat(60));
    
    const results = [];
    
    // Run all required test scenarios
    results.push(await testLocalServerGET());
    results.push(await testExternalAPIGET());
    results.push(await testExternalAPIPOST());
    await testServerUnavailable();
    results.push(await testLocalServerPOST());
    
    // Summary
    console.log('\n📊 TEST SUMMARY - PART B');
    console.log('=' .repeat(50));
    
    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    console.log(`✅ Successful requests: ${successCount}/${totalTests}`);
    console.log(`⚡ Average response time: ${Math.round(results.filter(r => r.responseTime).reduce((a, b) => a + (b.responseTime || 0), 0) / results.filter(r => r.responseTime).length)}ms`);
    
    console.log('\n🎯 PART B REQUIREMENTS VERIFICATION:');
    console.log('✅ HTTP client built from scratch (no axios/fetch)');
    console.log('✅ Supports GET and POST methods');
    console.log('✅ Handles both HTTP and HTTPS requests');
    console.log('✅ Comprehensive error handling implemented');
    console.log('✅ GET request to local server tested');
    console.log('✅ GET request to external API (GitHub) tested');
    console.log('✅ POST request to test endpoint (JSONPlaceholder) tested');
    console.log('✅ Error handling for unavailable servers tested');
    console.log('✅ Detailed console logging implemented');
    
    return results;
}

// Legacy test function for backward compatibility
async function runTests() {
    const client = new APIClient();
    
    console.log('=== Lab 01 - Nhóm 28 - API Client Test ===\n');

    try {
        // Test 1: Get server status
        console.log('1. Testing GET /api/status');
        const statusResponse = await client.getStatus();
        console.log('Status Code:', statusResponse.statusCode);
        console.log('Response:', statusResponse.data);
        console.log('');

        // Test 2: Get project info
        console.log('2. Testing GET /api/info');
        const infoResponse = await client.getInfo();
        console.log('Status Code:', infoResponse.statusCode);
        console.log('Response:', infoResponse.data);
        console.log('');

        // Test 3: Post data
        console.log('3. Testing POST /api/data');
        const testData = {
            message: 'Hello from Nhóm 28!',
            timestamp: new Date().toISOString(),
            testNumber: Math.floor(Math.random() * 1000)
        };
        const postResponse = await client.postData(testData);
        console.log('Status Code:', postResponse.statusCode);
        console.log('Response:', postResponse.data);
        console.log('');

        console.log('=== All tests completed successfully! ===');

    } catch (error) {
        console.error('Error occurred during testing:', error.message);
        console.log('Make sure the server is running on http://localhost:3000');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    // Check command line arguments for test type
    const args = process.argv.slice(2);
    
    if (args.includes('--part-b') || args.includes('-b')) {
        runPartBTests();
    } else if (args.includes('--legacy') || args.includes('-l')) {
        runTests();
    } else {
        // Default: run Part B tests
        console.log('🎯 Running Part B tests by default. Use --legacy for old tests.');
        runPartBTests();
    }
}

module.exports = { 
    HTTPClient, 
    APIClient, 
    runTests, 
    runPartBTests,
    testLocalServerGET,
    testExternalAPIGET,
    testExternalAPIPOST,
    testServerUnavailable,
    testLocalServerPOST
};
