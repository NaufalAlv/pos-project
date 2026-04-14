const bcrypt = require('bcryptjs');

async function testBcrypt() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);
        console.log('Hash created:', hash);
        const match = await bcrypt.compare(password, hash);
        console.log('Match:', match);
    } catch (error) {
        console.error('Bcrypt test failed:', error);
    }
}

testBcrypt();
