// API Client class for frontend
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.stats = {
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0,
            responseTimes: []
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        this.updateStats();

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(this.baseURL + endpoint, options);
            const responseTime = Date.now() - startTime;
            
            this.stats.responseTimes.push(responseTime);
            if (this.stats.responseTimes.length > 100) {
                this.stats.responseTimes.shift();
            }

            if (response.ok) {
                this.stats.successRequests++;
                const result = await response.json();
                
                // Log custom headers (Part A requirement)
                console.log('Custom Headers Received:');
                console.log('X-Server-Name:', response.headers.get('X-Server-Name'));
                console.log('X-Powered-By:', response.headers.get('X-Powered-By'));
                console.log('X-Response-Time:', response.headers.get('X-Response-Time'));
                console.log('X-Server-Version:', response.headers.get('X-Server-Version'));
                
                this.updateStats();
                return {
                    success: true,
                    status: response.status,
                    data: result,
                    responseTime: responseTime,
                    headers: {
                        serverName: response.headers.get('X-Server-Name'),
                        poweredBy: response.headers.get('X-Powered-By'),
                        responseTime: response.headers.get('X-Response-Time'),
                        serverVersion: response.headers.get('X-Server-Version')
                    }
                };
            } else {
                this.stats.failedRequests++;
                this.updateStats();
                return {
                    success: false,
                    status: response.status,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    responseTime: responseTime
                };
            }
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.stats.failedRequests++;
            this.updateStats();
            return {
                success: false,
                error: error.message,
                responseTime: responseTime
            };
        }
    }

    updateStats() {
        const totalEl = document.getElementById('totalRequests');
        const successEl = document.getElementById('successRequests');
        const failedEl = document.getElementById('failedRequests');
        const avgTimeEl = document.getElementById('avgResponseTime');
        
        if (totalEl) totalEl.textContent = this.stats.totalRequests;
        if (successEl) successEl.textContent = this.stats.successRequests;
        if (failedEl) failedEl.textContent = this.stats.failedRequests;
        
        if (this.stats.responseTimes.length > 0 && avgTimeEl) {
            const avgTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
            avgTimeEl.textContent = avgTime.toFixed(2) + 'ms';
        }
    }

    // Part A specific methods
    async getServerInfo() {
        return this.makeRequest('/api/server-info?format=json');
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

// Utility functions
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

function showResult(elementId, result, isSuccess = null) {
    const element = document.getElementById(elementId);
    
    if (isSuccess === null) {
        isSuccess = result.success;
    }

    element.className = 'result-box ' + (isSuccess ? 'success' : 'error');
    
    if (result.success) {
        element.textContent = `✅ Thành công (${result.responseTime}ms)\n\n${formatJSON(result.data)}`;
    } else {
        element.textContent = `❌ Lỗi (${result.responseTime}ms)\n\n${result.error}`;
    }
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.className = 'result-box loading';
    element.textContent = 'Đang gửi request...';
}

// Initialize API client
const apiClient = new APIClient();

// Part A specific functions
async function getServerInformation() {
    showLoading('serverInfoResult');
    const result = await apiClient.getServerInfo();
    
    if (result.success) {
        // Display comprehensive server information
        const serverData = result.data;
        const displayText = `✅ Server Information Retrieved Successfully (${result.responseTime}ms)

🖥️ SYSTEM INFORMATION:
Platform: ${serverData.systemInfo.platform}
Architecture: ${serverData.systemInfo.architecture}
Node.js Version: ${serverData.systemInfo.nodeVersion}
CPU Cores: ${serverData.systemInfo.cpuCount}
Total Memory: ${serverData.systemInfo.totalMemory}
Free Memory: ${serverData.systemInfo.freeMemory}
Hostname: ${serverData.systemInfo.hostname}

⚙️ SERVER DETAILS:
Status: ${serverData.status}
Port: ${serverData.serverDetails.port}
Environment: ${serverData.serverDetails.environment}
Process ID: ${serverData.serverDetails.processId}
Uptime: ${Math.floor(serverData.uptime)} seconds

🕒 TIMESTAMPS:
Server Time: ${serverData.serverTime}
ISO Timestamp: ${serverData.timestamp}

👥 PROJECT INFO:
${serverData.lab}
${serverData.group}

📡 CUSTOM HEADERS:
Server Name: ${result.headers.serverName || 'N/A'}
Powered By: ${result.headers.poweredBy || 'N/A'}
Server Version: ${result.headers.serverVersion || 'N/A'}
Response Time Header: ${result.headers.responseTime || 'N/A'}`;

        document.getElementById('serverInfoResult').className = 'result-box success';
        document.getElementById('serverInfoResult').textContent = displayText;
        
        // Update timestamp displays
        updateTimestampDisplays(serverData);
        
    } else {
        showResult('serverInfoResult', result);
    }
}

function updateTimestampDisplays(serverData) {
    const serverTimeEl = document.getElementById('serverTime');
    const clientTimeEl = document.getElementById('clientTime');
    const serverUptimeEl = document.getElementById('serverUptime');
    
    if (serverTimeEl) {
        serverTimeEl.textContent = serverData.serverTime;
    }
    
    if (clientTimeEl) {
        clientTimeEl.textContent = new Date().toLocaleString('vi-VN');
    }
    
    if (serverUptimeEl) {
        const uptimeSeconds = Math.floor(serverData.uptime);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        serverUptimeEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
}

async function updateTimestamp() {
    const result = await apiClient.getServerInfo();
    if (result.success) {
        updateTimestampDisplays(result.data);
        
        // Show brief success message
        const serverTimeEl = document.getElementById('serverTime');
        const originalBg = serverTimeEl.style.backgroundColor;
        serverTimeEl.style.backgroundColor = '#d4edda';
        serverTimeEl.style.transition = 'background-color 0.3s';
        
        setTimeout(() => {
            serverTimeEl.style.backgroundColor = originalBg;
        }, 1000);
    }
}

// Start real-time clock update
function startClientClock() {
    setInterval(() => {
        const clientTimeEl = document.getElementById('clientTime');
        if (clientTimeEl) {
            clientTimeEl.textContent = new Date().toLocaleString('vi-VN');
        }
    }, 1000);
}

// Event handlers (existing functions)
async function testServerStatus() {
    showLoading('statusResult');
    const result = await apiClient.getStatus();
    showResult('statusResult', result);
}

async function testProjectInfo() {
    showLoading('infoResult');
    const result = await apiClient.getInfo();
    showResult('infoResult', result);
    
    // Update project info on page if successful
    if (result.success) {
        updateProjectInfo(result.data);
    }
}

async function testSendData() {
    const input = document.getElementById('dataInput');
    const data = input.value.trim();
    
    if (!data) {
        alert('Vui lòng nhập dữ liệu!');
        return;
    }
    
    showLoading('dataResult');
    const result = await apiClient.postData(data);
    showResult('dataResult', result);
}

function updateProjectInfo(data) {
    // Update project name
    if (data.projectName) {
        document.getElementById('projectName').textContent = data.projectName;
    }
    
    // Update version
    if (data.version) {
        document.getElementById('version').textContent = data.version;
    }
    
    // Update technologies
    if (data.technologies && Array.isArray(data.technologies)) {
        const techList = document.getElementById('technologies');
        techList.innerHTML = '';
        data.technologies.forEach(tech => {
            const li = document.createElement('li');
            li.textContent = tech;
            techList.appendChild(li);
        });
    }
    
    // Update members
    if (data.members && Array.isArray(data.members)) {
        const membersList = document.getElementById('members');
        membersList.innerHTML = '';
        data.members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = member;
            membersList.appendChild(li);
        });
    }
}

// Auto-load project info on page load
async function loadInitialData() {
    try {
        const result = await apiClient.getInfo();
        if (result.success) {
            updateProjectInfo(result.data);
        }
    } catch (error) {
        console.log('Không thể tải thông tin dự án:', error.message);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Start client clock
    startClientClock();
    
    // Load initial data
    loadInitialData();
    
    // Part A specific event listeners
    const getServerInfoBtn = document.getElementById('getServerInfo');
    if (getServerInfoBtn) {
        getServerInfoBtn.addEventListener('click', getServerInformation);
    }
    
    const updateTimestampBtn = document.getElementById('updateTimestamp');
    if (updateTimestampBtn) {
        updateTimestampBtn.addEventListener('click', updateTimestamp);
    }
    
    // Existing button event listeners
    const testStatusBtn = document.getElementById('testStatus');
    if (testStatusBtn) {
        testStatusBtn.addEventListener('click', testServerStatus);
    }
    
    const testInfoBtn = document.getElementById('testInfo');
    if (testInfoBtn) {
        testInfoBtn.addEventListener('click', testProjectInfo);
    }
    
    const testDataBtn = document.getElementById('testData');
    if (testDataBtn) {
        testDataBtn.addEventListener('click', testSendData);
    }
    
    // Enter key support for data input
    const dataInput = document.getElementById('dataInput');
    if (dataInput) {
        dataInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                testSendData();
            }
        });
    }
    
    console.log('Lab 01 - Nhóm 28 - Part A: Static Web Server initialized');
    console.log('✅ Express.js server with static file serving');
    console.log('✅ API endpoint with server information');
    console.log('✅ Error handling (404, 500)');
    console.log('✅ Custom HTTP headers');
    console.log('✅ AJAX calls for data retrieval');
    console.log('✅ Responsive CSS styling');
});

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, formatJSON };
}
