const http = require('http');

const payload = JSON.stringify({
  projectName: 'test_todo_app',
  codeFiles: [
    {
      path: 'lib/main.dart',
      content: 'void main() { print("Hello"); }'
    }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/flutter/build',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.slice(0, 300));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(payload);
req.end();
console.log('Request sent...');