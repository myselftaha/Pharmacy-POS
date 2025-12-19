const http = require('http');

const data = JSON.stringify({
    name: 'Test Supplier',
    contactPerson: 'Test Person',
    phone: '1234567890',
    email: 'test@example.com',
    address: 'Test Address'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/suppliers',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Sending request to http://localhost:5000/api/suppliers');

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
