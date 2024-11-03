const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

// Example 4: Arithmetic (5 + 3)
function demoArithmetic() {
  console.log('\n=== Example 4: Arithmetic (5 + 3) ===');
  const net = new InteractionNet();
  
  const con1 = net.createCon(5);
  const con2 = net.createCon(3);
  
  net.connect(con1.ports[0], con2.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoArithmetic();