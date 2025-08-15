# Screenshots - Lab 01 Part C: Network Traffic Analysis
## Nhóm 28

### 📸 Required Screenshots

#### 1. Browser Network Tab Overview
**Filename:** `network-tab-overview.png`
- Tổng quan tất cả HTTP requests
- Request waterfall timeline
- Request/Response sizes
- Status codes

#### 2. Static vs Dynamic Requests
**Filename:** `static-vs-dynamic.png`
- Phân loại requests theo loại
- Static files (CSS, JS, images)
- Dynamic API calls
- Response time comparison

#### 3. Network Monitor Dashboard
**Filename:** `network-monitor-dashboard.png`
- Real-time monitoring interface
- Live statistics
- Request log
- Performance metrics

#### 4. Request Headers & Timing
**Filename:** `request-headers-timing.png`
- Detailed request headers
- Response headers
- Timing breakdown
- Custom server headers

#### 5. Performance Analysis
**Filename:** `performance-analysis.png`
- Response time metrics
- Bandwidth usage
- Error rate analysis
- Request patterns

#### 6. Console Network Logs
**Filename:** `console-network-logs.png`
- Monitor script output
- Real-time request logging
- Performance warnings
- Error messages

### 📊 How to Capture Screenshots

#### Setup:
1. Start the server: `npm start`
2. Open browser DevTools (F12)
3. Go to Network tab
4. Navigate to: http://localhost:3000

#### Capture Process:

1. **Network Tab Overview**
   - Reload page to capture all requests
   - Screenshot showing complete request waterfall

2. **Static vs Dynamic**
   - Filter by different resource types
   - Show timing differences
   - Highlight content types

3. **Monitor Dashboard**  
   - Navigate to /network-monitor
   - Start monitoring
   - Run test scenarios
   - Capture live dashboard

4. **Headers & Timing**
   - Click on specific request
   - Show Headers tab
   - Show Timing tab
   - Highlight custom headers

5. **Performance Analysis**
   - Use Performance tab
   - Record page load
   - Show network section
   - Analyze bottlenecks

6. **Console Logs**
   - Run: `node monitor.js test`
   - Show terminal output
   - Capture monitoring logs

### 📋 Screenshot Checklist

- [ ] Network tab with all requests visible
- [ ] Request waterfall showing timing
- [ ] Static files (CSS, JS, images) highlighted
- [ ] API requests highlighted  
- [ ] Request headers showing custom headers
- [ ] Response timing breakdown
- [ ] Network monitor dashboard active
- [ ] Real-time statistics updating
- [ ] Console logs from monitor script
- [ ] Performance metrics visible
- [ ] Error handling (404 requests)
- [ ] Bandwidth usage statistics

### 🎯 Key Points to Capture

1. **Request Classification**
   - Static: CSS, JS, images, fonts
   - Dynamic: API calls, AJAX requests

2. **Performance Metrics**
   - Response times: < 100ms for static, < 500ms for dynamic
   - Error rates: < 1%
   - Cache utilization: > 80%

3. **Network Patterns**
   - Initial page load: 8-12 requests
   - Subsequent navigation: 2-4 requests
   - API polling: Every 30 seconds

4. **Custom Headers**
   - X-Server-Name: Lab01-Nhom28-Server
   - X-Powered-By: Express.js
   - X-Response-Time: [timestamp]
   - X-Server-Version: 1.0.0

### 📁 File Organization

```
screenshots/
├── README.md                      # This file
├── network-tab-overview.png       # Browser DevTools Network tab
├── static-vs-dynamic.png          # Request classification
├── network-monitor-dashboard.png  # Custom monitoring tool
├── request-headers-timing.png     # Detailed request analysis
├── performance-analysis.png       # Performance metrics
└── console-network-logs.png       # Monitor script output
```

### 🔧 Tools Used

- **Browser DevTools**: Chrome/Firefox Network tab
- **Custom Monitor**: /network-monitor dashboard
- **CLI Tool**: `node monitor.js test`
- **Performance Tab**: Browser performance profiling

---

*Screenshots documentation for Lab 01 - Part C: Network Traffic Analysis*  
*Nhóm 28 - Web NC Course*

### 1. network-analysis.png
- Ảnh chụp màn hình phân tích network traffic
- Có thể sử dụng Developer Tools (F12) -> Network tab
- Chụp khi đang thực hiện các request API

### 2. server-running.png  
- Ảnh chụp màn hình server đang chạy
- Terminal/Command Prompt hiển thị "Server is running on http://localhost:3000"
- Có thể chụp cả log requests

### 3. api-response.png
- Ảnh chụp màn hình response của API
- Có thể chụp từ browser Developer Tools hoặc từ web interface
- Hiển thị JSON response từ các endpoint

## Hướng dẫn chụp ảnh:

1. **Chạy server**: `npm start`
2. **Mở browser**: Truy cập http://localhost:3000
3. **Mở Developer Tools**: F12 -> Network tab
4. **Test các API**: Sử dụng giao diện web để test
5. **Chụp màn hình**: Lưu các ảnh vào thư mục này

## Ghi chú:
- Đặt tên file đúng như yêu cầu
- Chất lượng ảnh rõ nét
- Đảm bảo hiển thị đầy đủ thông tin cần thiết
