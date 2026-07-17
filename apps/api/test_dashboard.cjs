const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5173,
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    'x-dente-clinic-token': 'fake-clinic-token',
    'x-dente-organization-id': '00000000-0000-0000-0000-000000000001',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
  });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
