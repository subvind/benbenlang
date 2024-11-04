const { MinimalLambda } = require('../../src/compiler.js');

const lang = new MinimalLambda();

// Helper function to run tests and format output
function runTest(code, expected) {
  console.log(`\nTesting: ${code}`);
  try {
    const result = lang.run(code, false);
    console.log(`Result: ${result}`);
    if (expected !== undefined) {
      console.log(`Expected: ${expected}`);
      console.log(`Pass: ${result === expected}`);
    }
    return result;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

// Test basic arithmetic
console.log("\n=== Basic Arithmetic ===");
runTest("5", 5);
runTest("let x = 5 in x", 5);
runTest("let x = 3 + 2 in x", 5);
runTest("let x = 4 in let y = 3 in x + y", 7);

// Test operators
console.log("\n=== Operators ===");
runTest("3 + 5", 8);
runTest("10 - 4", 6);
runTest("3 * 4", 12);
runTest("8 / 2", 4);

// Test nested expressions
console.log("\n=== Nested Expressions ===");
runTest("let x = 2 + 3 in x * 4", 20);
runTest("let x = 10 in let y = x / 2 in y + 1", 6);

// Test lambda functions
console.log("\n=== Lambda Functions ===");
runTest("let id = \\x -> x in id 42", 42);
runTest("let add = \\x -> \\y -> x + y in (add 3) 4", 7);

// Test conditionals
console.log("\n=== Conditionals ===");
runTest("if true then 1 else 2", 1);
runTest("if false then 1 else 2", 2);
runTest("let x = 5 in if x > 3 then 1 else 0", 1);