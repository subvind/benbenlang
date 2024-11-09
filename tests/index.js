let { LambdaCompiler } = require('../src/compiler');

// Example usage showing the compilation and reduction process
function evaluateLambdaExpression(expr) {
  console.log(`Evaluating: ${expr}`);
  
  const compiler = new LambdaCompiler();
  const net = compiler.compile(expr);
  
  console.log('\nInitial net:');
  console.log(net.toString());
  
  console.log('\nReducing...');
  net.reduce();
  
  console.log('\nFinal net:');
  console.log(net.toString());
  
  return net;
}

// Test cases
const testCases = [
  '(λx.x) y',               // Identity function
  '(λx.(λy.x)) a b',        // First (K) combinator
  '(λx.(λy.(x y))) a b',    // Application
  '(λx.(x x)) (λx.x)'      // Self-application
];

testCases.forEach(test => {
  console.log('='.repeat(50));
  evaluateLambdaExpression(test);
});
