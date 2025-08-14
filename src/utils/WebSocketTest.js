// WebSocket Diagnostic Tool
// Run this in browser console to test WebSocket connection

class WebSocketDiagnostics {
  constructor() {
    this.ws = null;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async testConnection() {
    console.log('🔍 Starting WebSocket diagnostics...');
    
    // Test 1: Basic connectivity
    await this.testBasicConnectivity();
    
    // Test 2: CORS check
    await this.testCORS();
    
    // Test 3: Authentication
    await this.testAuthentication();
    
    // Test 4: Full WebSocket connection
    await this.testWebSocketConnection();
  }

  async testBasicConnectivity() {
    console.log('📡 Testing basic connectivity...');
    try {
      const response = await fetch('http://localhost:8000/health');
      console.log('✅ Backend is reachable:', response.status);
    } catch (error) {
      console.error('❌ Backend unreachable:', error.message);
    }
  }

  async testCORS() {
    console.log('🌐 Testing CORS...');
    try {
      const response = await fetch('http://localhost:8000/api/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || 'test'}`
        },
        body: JSON.stringify({ message: 'test', session_id: 'test' })
      });
      console.log('✅ CORS working:', response.status);
    } catch (error) {
      console.error('❌ CORS issue:', error.message);
    }
  }

  async testAuthentication() {
    console.log('🔑 Testing authentication...');
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('❌ No authentication token found');
      return false;
    }
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    return true;
  }

  async testWebSocketConnection() {
    console.log('🔗 Testing WebSocket connection...');
    
    return new Promise((resolve) => {
      const token = localStorage.getItem('access_token');
      const wsUrl = `ws://localhost:8000/ws/speech-chat${token ? `?token=${token}` : ''}`;
      
      console.log('📍 Connecting to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        this.ws.send(JSON.stringify({ type: 'test', message: 'hello' }));
        resolve(true);
      };
      
      this.ws.onmessage = (event) => {
        console.log('📨 WebSocket message received:', event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        resolve(false);
      };
      
      this.ws.onclose = (event) => {
        console.log('🔒 WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) {
          console.error('❌ WebSocket closed unexpectedly:', event);
        }
        resolve(false);
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
        }
      }, 5000);
    });
  }

  checkBrowserCompatibility() {
    console.log('🌐 Browser compatibility check:');
    console.log('WebSocket supported:', !!window.WebSocket);
    console.log('WebSocket ready states:', WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED);
    console.log('Current origin:', window.location.origin);
    console.log('User agent:', navigator.userAgent);
  }

  testNetworkConditions() {
    console.log('🌐 Network conditions:');
    console.log('Online status:', navigator.onLine);
    console.log('Connection:', navigator.connection || 'Not available');
    
    // Test if localhost:8000 is accessible
    fetch('http://localhost:8000/health')
      .then(response => console.log('Backend health:', response.status))
      .catch(error => console.error('Backend unreachable:', error.message));
  }
}

// Usage instructions
console.log(`
🛠️ WebSocket Diagnostic Tool

To test your WebSocket connection:

1. Open browser console (F12)
2. Copy and paste this entire file content
3. Run: 
   const diagnostics = new WebSocketDiagnostics();
   diagnostics.checkBrowserCompatibility();
   diagnostics.testNetworkConditions();
   diagnostics.testConnection();

Expected issues:
- Backend not running on port 8000
- CORS policy blocking WebSocket
- Authentication token missing/expired
- WebSocket endpoint not implemented in backend
- Network connectivity issues

Solutions:
- Ensure backend is running: python -m uvicorn main:app --reload --port 8000
- Check backend has WebSocket endpoint: /ws/speech-chat
- Verify CORS settings allow ws://localhost:3000
- Check authentication token is valid
`);

// Export for use
window.WebSocketDiagnostics = WebSocketDiagnostics;
