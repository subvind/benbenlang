const { MinimalLambda } = require('../../src/compiler.js');

const lang = new MinimalLambda();

// Test basic arithmetic
console.log(lang.run('5 + 3'));  // Should output 8
console.log(lang.run('4 * 6'));  // Should output 24
console.log(lang.run('10 - 7')); // Should output 3
console.log(lang.run('15 / 4')); // Should output 3 (integer division)

// Test compound expressions
console.log(lang.run('(5 + 3) * 2')); // Should output 16

// Basic arithmetic
console.log(lang.run('let x = 5 in x + 3')); // Should output 8

// Functions
console.log(lang.run('let id = \\x -> x in id 42')); // Should output 42

// Conditionals
console.log(lang.run('if true then 1 else 2')); // Should output 1
