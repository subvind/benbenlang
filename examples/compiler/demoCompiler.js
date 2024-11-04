const { MinimalLambda } = require('../../src/compiler.js');

const lang = new MinimalLambda();

// Arithmetic operations
console.log('Addition:', lang.run('5 + 3'));
console.log('Multiplication:', lang.run('4 * 6'));
console.log('Subtraction:', lang.run('10 - 7'));
console.log('Division:', lang.run('15 / 4'));


// Basic arithmetic
console.log(lang.run('let x = 5 in x + 3')); // 8

// Functions
console.log(lang.run('let id = \\x -> x in id 42')); // 42

// Conditionals
console.log(lang.run('if true then 1 else 2')); // 1
