#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.join(process.cwd(), 'src', 'mcp-server.js');

console.log('Testing MCP server functionality...\n');

// Start the MCP server
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Test list tools message
const listToolsMessage = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
};

let responseCount = 0;
let timeout;

serverProcess.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n');
  
  for (const response of responses) {
    if (response.trim()) {
      try {
        const parsed = JSON.parse(response);
        responseCount++;
        
        if (parsed.id === 1) {
          console.log('✅ Server initialized successfully');
          console.log('   Server info:', parsed.result?.serverInfo?.name || 'Unknown');
        } else if (parsed.id === 2) {
          console.log('✅ Tools list received');
          console.log('   Available tools:', parsed.result?.tools?.length || 0);
          
          if (parsed.result?.tools?.length > 0) {
            console.log('   Tool names:', parsed.result.tools.map(t => t.name).join(', '));
          }
        }
        
        if (responseCount >= 2) {
          console.log('\n🎉 MCP server is working correctly!');
          clearTimeout(timeout);
          serverProcess.kill();
          process.exit(0);
        }
      } catch (e) {
        // Ignore JSON parse errors for partial messages
      }
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  const message = data.toString();
  if (message.includes('MCP server running')) {
    console.log('✅ MCP server started');
    
    // Send initialization message
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');
    }, 100);
    
    // Send list tools message
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
    }, 200);
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

// Set timeout
timeout = setTimeout(() => {
  console.log('❌ Test timeout - server may not be responding correctly');
  serverProcess.kill();
  process.exit(1);
}, 5000);

console.log('Starting MCP server test...');
