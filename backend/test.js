const bcrypt = require('bcryptjs');

// The hash from your database
const hash = '$2b$10$VrqU8ZtXQhEwXH5rJ2sV1eL6oN9sW3rKqU8ZtXQhEwXH5rJ2sV1e';

// Test if password matches
console.log('Testing password: password123');
console.log('Hash from database:', hash);

const result = bcrypt.compareSync('password123', hash);
console.log('Password match?', result);

// Generate a new hash
const newHash = bcrypt.hashSync('password123', 10);
console.log('');
console.log('New hash for password123:');
console.log(newHash);