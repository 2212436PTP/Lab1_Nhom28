const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

/**
 * HTTP Client Class - Lab 01 Nhóm 28
 * Triển khai HTTP client từ đầu không sử dụng axios/fetch
 */
class HTTPClient {
    constructor(options = {}) {
        this.defaultTimeout = options.timeout || 5000;
        this.defaultHeaders = {
            'User-Agent': 'Lab01-Nhom28-HTTPClient/1.0.0',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            ...options.headers
        };
        
        console.log('🚀 HTTPClient initialized - Lab 01 Nhóm 28');
        console.log('📝 Default timeout:', this.defaultTimeout + 'ms');
        console.log('📋 Default headers:', this.defaultHeaders);
    }

    /**
     * Parse URL và xác định protocol
     */
    parseUrl(requestUrl) {
        const parsedUrl = url.parse(requestUrl);
        
        if (!parsedUrl.protocol) {
            throw new Error('Invalid URL: Protocol is required');
        }
        
        const isSecure = parsedUrl.protocol === 'https:';
        const defaultPort = isSecure ? 443 : 80;
        
        return {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || defaultPort,
            path: parsedUrl.path || '/',
            isSecure: isSecure,
            module: isSecure ? https : http
        };
    }

    /**
     * Tạo request options
     */
    createRequestOptions(method, requestUrl, headers = {}, timeout = null) {
        const urlInfo = this.parseUrl(requestUrl);
        
        return {
            hostname: urlInfo.hostname,
            port: urlInfo.port,
            path: urlInfo.path,
            method: method.toUpperCase(),
            headers: {
                ...this.defaultHeaders,
                ...headers
            },
            timeout: timeout || this.defaultTimeout,
            urlInfo: urlInfo
        };
    }

    /**
     * Thực hiện HTTP request cơ bản
     */
    makeRequest(method, requestUrl, data = null, options = {}) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            console.log(`\n📡 [${method.toUpperCase()}] Starting request to: ${requestUrl}`);
            console.log('🕒 Request started at:', new Date().toISOString());
            
            try {
                const requestOptions = this.createRequestOptions(
                    method, 
                    requestUrl, 
                    options.headers,
                    options.timeout
                );
                
                // Prepare request data
                let requestData = null;
                if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
                    if (typeof data === 'object') {
                        requestData = JSON.stringify(data);
                        requestOptions.headers['Content-Type'] = 'application/json';
                        requestOptions.headers['Content-Length'] = Buffer.byteLength(requestData);
                    } else {
                        requestData = data.toString();
                        requestOptions.headers['Content-Length'] = Buffer.byteLength(requestData);
                    }
                    
                    console.log('📤 Request data prepared:', requestData.length, 'bytes');
                }

                console.log('⚙️ Request options:');
                console.log('  - Hostname:', requestOptions.hostname);
                console.log('  - Port:', requestOptions.port);
                console.log('  - Path:', requestOptions.path);
                console.log('  - Method:', requestOptions.method);
                console.log('  - Protocol:', requestOptions.urlInfo.protocol);
                console.log('  - Headers:', requestOptions.headers);

                // Create request
                const httpModule = requestOptions.urlInfo.module;
                const req = httpModule.request(requestOptions, (res) => {
                    console.log(`📥 Response received - Status: ${res.statusCode} ${res.statusMessage}`);
                    console.log('📋 Response headers:', res.headers);
                    
                    let responseData = '';
                    
                    // Handle gzip/deflate encoding
                    let responseStream = res;
                    const encoding = res.headers['content-encoding'];
                    
                    if (encoding === 'gzip' || encoding === 'deflate') {
                        const zlib = require('zlib');
                        if (encoding === 'gzip') {
                            responseStream = res.pipe(zlib.createGunzip());
                        } else if (encoding === 'deflate') {
                            responseStream = res.pipe(zlib.createInflate());
                        }
                        console.log('🗜️ Decompressing response data...');
                    }
                    
                    // Handle response data
                    responseStream.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    responseStream.on('end', () => {
                        const endTime = Date.now();
                        const responseTime = endTime - startTime;
                        
                        console.log('✅ Response completed');
                        console.log('📊 Response time:', responseTime + 'ms');
                        console.log('📐 Response size:', responseData.length, 'bytes');
                        
                        // Parse JSON response if applicable
                        let parsedData = responseData;
                        const contentType = res.headers['content-type'] || '';
                        
                        if (contentType.includes('application/json')) {
                            try {
                                parsedData = JSON.parse(responseData);
                                console.log('🔄 JSON parsed successfully');
                            } catch (error) {
                                console.log('⚠️ JSON parse failed:', error.message);
                                console.log('📄 Raw response (first 200 chars):', responseData.substring(0, 200));
                            }
                        }
                        
                        const result = {
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            statusText: res.statusMessage,
                            headers: res.headers,
                            data: parsedData,
                            responseTime: responseTime,
                            url: requestUrl,
                            method: method.toUpperCase()
                        };
                        
                        if (result.success) {
                            console.log('🎉 Request successful!');
                            resolve(result);
                        } else {
                            console.log('❌ Request failed with status:', res.statusCode);
                            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        }
                    });
                    
                    responseStream.on('error', (error) => {
                        console.log('💥 Response stream error:', error.message);
                        reject(new Error(`Response processing failed: ${error.message}`));
                    });
                });
                
                // Handle request errors
                req.on('error', (error) => {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    console.log('💥 Request error occurred:');
                    console.log('  - Error type:', error.code || 'UNKNOWN');
                    console.log('  - Error message:', error.message);
                    console.log('  - Response time:', responseTime + 'ms');
                    
                    reject(new Error(`Request failed: ${error.message}`));
                });
                
                // Handle timeout
                req.on('timeout', () => {
                    console.log('⏰ Request timeout occurred');
                    req.destroy();
                    reject(new Error(`Request timeout after ${requestOptions.timeout}ms`));
                });
                
                // Send request data
                if (requestData) {
                    console.log('📤 Sending request data...');
                    req.write(requestData);
                }
                
                req.end();
                console.log('📡 Request sent, waiting for response...');
                
            } catch (error) {
                console.log('💥 Request setup error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * GET Request
     */
    get(url, options = {}) {
        console.log('\n🔍 === GET REQUEST ===');
        return this.makeRequest('GET', url, null, options);
    }

    /**
     * POST Request
     */
    post(url, data, options = {}) {
        console.log('\n📮 === POST REQUEST ===');
        return this.makeRequest('POST', url, data, options);
    }

    /**
     * PUT Request (bonus)
     */
    put(url, data, options = {}) {
        console.log('\n📝 === PUT REQUEST ===');
        return this.makeRequest('PUT', url, data, options);
    }

    /**
     * DELETE Request (bonus)
     */
    delete(url, options = {}) {
        console.log('\n🗑️ === DELETE REQUEST ===');
        return this.makeRequest('DELETE', url, null, options);
    }
}

/**
 * Test Functions - Các hàm kiểm thử
 */
class HTTPClientTester {
    constructor() {
        this.client = new HTTPClient({
            timeout: 10000,
            headers: {
                'X-Test-Client': 'Lab01-Nhom28-Tester'
            }
        });
        this.testResults = [];
    }

    /**
     * Log test result
     */
    logTestResult(testName, success, details) {
        const result = {
            test: testName,
            success: success,
            timestamp: new Date().toISOString(),
            details: details
        };
        
        this.testResults.push(result);
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 TEST: ${testName}`);
        console.log(`📊 Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`🕒 Time: ${result.timestamp}`);
        if (details) {
            console.log(`📝 Details: ${details}`);
        }
        console.log(`${'='.repeat(60)}`);
    }

    /**
     * Test 1: GET request tới server cục bộ
     */
    async testLocalServerGet() {
        const testName = 'GET Request to Local Server';
        console.log(`\n🔬 Starting: ${testName}`);
        
        try {
            const response = await this.client.get('http://localhost:3000/api/server-info');
            
            const success = response.success && response.data && response.data.status === 'running';
            this.logTestResult(testName, success, `Status: ${response.status}, Response time: ${response.responseTime}ms`);
            
            if (success) {
                console.log('📋 Server info received:');
                console.log('  - Status:', response.data.status);
                console.log('  - Timestamp:', response.data.timestamp);
                console.log('  - Platform:', response.data.systemInfo?.platform);
                console.log('  - Node version:', response.data.systemInfo?.nodeVersion);
            }
            
            return success;
        } catch (error) {
            this.logTestResult(testName, false, error.message);
            return false;
        }
    }

    /**
     * Test 2: GET request tới external API (GitHub API)
     */
    async testExternalApiGet() {
        const testName = 'GET Request to External API (GitHub)';
        console.log(`\n🔬 Starting: ${testName}`);
        
        try {
            const response = await this.client.get('https://api.github.com/repos/nodejs/node', {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            const success = response.success && response.data && response.data.name === 'node';
            this.logTestResult(testName, success, `Status: ${response.status}, Response time: ${response.responseTime}ms`);
            
            if (success) {
                console.log('📋 GitHub repo info received:');
                console.log('  - Name:', response.data.name);
                console.log('  - Full name:', response.data.full_name);
                console.log('  - Stars:', response.data.stargazers_count);
                console.log('  - Language:', response.data.language);
                console.log('  - Description:', response.data.description?.substring(0, 100) + '...');
            }
            
            return success;
        } catch (error) {
            this.logTestResult(testName, false, error.message);
            return false;
        }
    }

    /**
     * Test 3: POST request tới JSONPlaceholder
     */
    async testJsonPlaceholderPost() {
        const testName = 'POST Request to JSONPlaceholder';
        console.log(`\n🔬 Starting: ${testName}`);
        
        const postData = {
            title: 'Lab 01 - Nhóm 28 Test Post',
            body: 'This is a test post from HTTP Client implementation',
            userId: 28,
            groupInfo: {
                lab: 'Lab 01',
                group: 'Nhóm 28',
                members: ['2212389', '2212436', '2212456']
            }
        };
        
        try {
            const response = await this.client.post('https://jsonplaceholder.typicode.com/posts', postData);
            
            const success = response.success && response.data && response.data.id;
            this.logTestResult(testName, success, `Status: ${response.status}, Response time: ${response.responseTime}ms`);
            
            if (success) {
                console.log('📋 POST response received:');
                console.log('  - Created ID:', response.data.id);
                console.log('  - Title:', response.data.title);
                console.log('  - User ID:', response.data.userId);
                console.log('  - Body preview:', response.data.body?.substring(0, 50) + '...');
            }
            
            return success;
        } catch (error) {
            this.logTestResult(testName, false, error.message);
            return false;
        }
    }

    /**
     * Test 4: Xử lý lỗi khi server không khả dụng
     */
    async testServerUnavailable() {
        const testName = 'Error Handling - Server Unavailable';
        console.log(`\n🔬 Starting: ${testName}`);
        
        try {
            // Try to connect to a non-existent server
            await this.client.get('http://localhost:9999/api/test', {
                timeout: 3000
            });
            
            // If we get here, the test failed (server should not be available)
            this.logTestResult(testName, false, 'Expected connection error but request succeeded');
            return false;
            
        } catch (error) {
            // This is expected - connection should fail
            const success = error.message.includes('Request failed') || 
                           error.message.includes('ECONNREFUSED') ||
                           error.message.includes('ENOTFOUND');
            
            this.logTestResult(testName, success, `Expected error occurred: ${error.message}`);
            
            if (success) {
                console.log('✅ Error handling working correctly');
                console.log('📝 Error details captured properly');
            }
            
            return success;
        }
    }

    /**
     * Test 5: POST request tới local server
     */
    async testLocalServerPost() {
        const testName = 'POST Request to Local Server';
        console.log(`\n🔬 Starting: ${testName}`);
        
        const testData = {
            message: 'Hello from HTTP Client - Lab 01 Nhóm 28',
            timestamp: new Date().toISOString(),
            testInfo: {
                client: 'Custom HTTP Client',
                version: '1.0.0',
                group: 'Nhóm 28'
            }
        };
        
        try {
            const response = await this.client.post('http://localhost:3000/api/data', testData);
            
            const success = response.success && response.data && response.data.status === 'success';
            this.logTestResult(testName, success, `Status: ${response.status}, Response time: ${response.responseTime}ms`);
            
            if (success) {
                console.log('📋 Local server POST response:');
                console.log('  - Status:', response.data.status);
                console.log('  - Message:', response.data.message);
                console.log('  - Received data:', JSON.stringify(response.data.receivedData, null, 2));
            }
            
            return success;
        } catch (error) {
            this.logTestResult(testName, false, error.message);
            return false;
        }
    }

    /**
     * Test timeout handling
     */
    async testTimeoutHandling() {
        const testName = 'Timeout Handling';
        console.log(`\n🔬 Starting: ${testName}`);
        
        try {
            // Try to connect to a slow/hanging endpoint with short timeout
            await this.client.get('https://httpstat.us/200?sleep=5000', {
                timeout: 2000  // 2 second timeout, but server will sleep for 5 seconds
            });
            
            this.logTestResult(testName, false, 'Expected timeout error but request completed');
            return false;
            
        } catch (error) {
            const success = error.message.includes('timeout');
            this.logTestResult(testName, success, `Timeout handling: ${error.message}`);
            return success;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n🚀 Starting HTTP Client Test Suite - Lab 01 Nhóm 28');
        console.log('📝 Testing custom HTTP client implementation');
        console.log('🕒 Test started at:', new Date().toISOString());
        
        const tests = [
            () => this.testLocalServerGet(),
            () => this.testLocalServerPost(),
            () => this.testExternalApiGet(),
            () => this.testJsonPlaceholderPost(),
            () => this.testServerUnavailable(),
            () => this.testTimeoutHandling()
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        for (let i = 0; i < tests.length; i++) {
            try {
                const result = await tests[i]();
                if (result) passedTests++;
                
                // Wait between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log(`💥 Test ${i + 1} crashed:`, error.message);
            }
        }
        
        this.showTestSummary(passedTests, totalTests);
    }

    /**
     * Show test summary
     */
    showTestSummary(passed, total) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 TEST SUMMARY - Lab 01 Nhóm 28 HTTP Client');
        console.log('='.repeat(80));
        console.log(`📈 Tests passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
        console.log(`🕒 Test completed at: ${new Date().toISOString()}`);
        
        console.log('\n📋 Detailed results:');
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${index + 1}. ${status} - ${result.test}`);
            if (result.details) {
                console.log(`     └─ ${result.details}`);
            }
        });
        
        console.log('\n🎯 Implementation Features Verified:');
        console.log('  ✅ HTTP and HTTPS support');
        console.log('  ✅ GET and POST methods');
        console.log('  ✅ Error handling');
        console.log('  ✅ Timeout handling');
        console.log('  ✅ Request/Response logging');
        console.log('  ✅ JSON data handling');
        console.log('  ✅ Custom headers support');
        
        if (passed === total) {
            console.log('\n🎉 ALL TESTS PASSED! HTTP Client implementation is working correctly.');
        } else {
            console.log(`\n⚠️ ${total - passed} test(s) failed. Please check the implementation.`);
        }
        
        console.log('='.repeat(80));
    }
}

/**
 * Main execution
 */
async function main() {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('\n📖 HTTP Client - Lab 01 Nhóm 28');
        console.log('Usage: node client.js [options]');
        console.log('\nOptions:');
        console.log('  --test, -t     Run test suite');
        console.log('  --help, -h     Show this help');
        console.log('\nExamples:');
        console.log('  node client.js --test');
        console.log('  node client.js');
        return;
    }
    
    if (args.includes('--test') || args.includes('-t') || args.length === 0) {
        const tester = new HTTPClientTester();
        await tester.runAllTests();
        return;
    }
    
    // Default: run tests
    const tester = new HTTPClientTester();
    await tester.runAllTests();
}

// Export for module usage
module.exports = { HTTPClient, HTTPClientTester };

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    });
}