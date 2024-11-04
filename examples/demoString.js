const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

function demoString() {
  console.log('=== String "Hello" ===\n');
  
  const net = new InteractionNet();
  
  // Create string node with value "Hello"
  const str = net.createString("Hello");
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoString();