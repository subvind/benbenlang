const { MinimalLambda } = require('../../src/compiler.js');

const lang = new MinimalLambda();

// Basic arithmetic
console.log(lang.run('let x = 5 in x + 3')); // 8

// Functions
console.log(lang.run('let id = \\x -> x in id 42')); // 42

// Conditionals
console.log(lang.run('if true then 1 else 2')); // 1
