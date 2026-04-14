async function testLogin(username, password) {
    try {
        console.log(`Attempting login for ${username}:${password}...`);
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.log('Login Failed!');
        console.log('Error:', error.message);
    }
}

async function run() {
    await testLogin('admin', 'wrongpass');
    await testLogin('nonexistent', 'pass');
}

run();
