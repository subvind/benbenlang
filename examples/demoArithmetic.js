const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

// Example 4: Arithmetic (5 + 3)
function demoArithmetic() {
  console.log('\n=== Example 4: Arithmetic (5 + 3) ===');
  const net = new InteractionNet();
  
  const num1 = net.createNum(5);
  const num2 = net.createNum(3);
  
  net.connect(num1.ports[0], num2.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoArithmetic();