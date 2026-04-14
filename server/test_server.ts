import express from 'express';
const app = express();
const port = 5001;

app.get('/', (req, res) => {
    res.send('Hello World');
});

console.log('Attempting to start test server on port 5001...');
const server = app.listen(port, () => {
    console.log(`Test server running at http://localhost:${port}`);
});

// Prevent immediate exit
// process.stdin.resume();
