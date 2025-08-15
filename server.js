const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for custom headers
app.use((req, res, next) => {
    res.setHeader('X-Server-Name', 'Lab01-Nhom28-Server');
    res.setHeader('X-Powered-By', 'Express.js');
    res.setHeader('X-Response-Time', Date.now());
    res.setHeader('X-Server-Version', '1.0.0');
    next();
});

// Other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Network monitoring page (Part C)
app.get('/network-monitor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'network-monitor.html'));
});

// API endpoint for server information (Part A requirement)
app.get('/api/server-info', (req, res) => {
    const serverInfo = {
        status: 'running',
        timestamp: new Date().toISOString(),
        serverTime: new Date().toLocaleString('vi-VN'),
        uptime: process.uptime(),
        systemInfo: {
            platform: os.platform(),
            architecture: os.arch(),
            nodeVersion: process.version,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
            cpuCount: os.cpus().length,
            hostname: os.hostname()
        },
        serverDetails: {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            processId: process.pid
        },
        group: 'Nhóm 28',
        lab: 'Lab 01 - Part A: Static Web Server'
    };
    
    // Check if client wants JSON specifically or if it's an AJAX request
    const acceptHeader = req.headers.accept || '';
    const isAjaxRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
    const wantsJson = req.query.format === 'json' || 
                     isAjaxRequest || 
                     acceptHeader.includes('application/json');
    
    if (wantsJson) {
        // Return JSON for API calls, AJAX requests, or when explicitly requested
        res.json(serverInfo);
    } else {
        // Return HTML page for browser visits
        res.sendFile(path.join(__dirname, 'public', 'server-info.html'));
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        group: 'Nhóm 28'
    });
});

app.get('/api/info', (req, res) => {
    res.json({
        projectName: 'Lab 01 - Nhóm 28',
        version: '1.0.0',
        description: 'Web NC Lab Assignment',
        technologies: ['Node.js', 'Express.js', 'HTML', 'CSS', 'JavaScript'],
        members: [
            'Thành viên 1',
            'Thành viên 2', 
            'Thành viên 3'
        ]
    });
});

app.post('/api/data', (req, res) => {
    const { data } = req.body;
    
    console.log('Received data:', data);
    
    res.json({
        status: 'success',
        message: 'Data received successfully',
        receivedData: data,
        timestamp: new Date().toISOString()
    });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err.stack);
    
    // Set custom error headers
    res.setHeader('X-Error-Timestamp', new Date().toISOString());
    res.setHeader('X-Error-ID', Math.random().toString(36).substr(2, 9));
    
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        errorCode: 500,
        group: 'Nhóm 28'
    });
});

// Enhanced 404 handler
app.use((req, res) => {
    // Check if request is for API (starts with /api) - return JSON
    if (req.path.startsWith('/api/')) {
        res.status(404).json({
            status: 'error',
            message: 'API endpoint not found',
            requestedPath: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            errorCode: 404,
            group: 'Nhóm 28',
            availableEndpoints: [
                'GET /api/server-info',
                'GET /api/status',
                'GET /api/info',
                'POST /api/data'
            ]
        });
    } else {
        // For web pages - return HTML 404 page
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Lab 01 - Nhóm 28');
});
