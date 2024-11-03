const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

function demoBoolean() {
  console.log('\n=== Boolean (true and false) ===');
  const net = new InteractionNet();
  
  const true1 = net.createBool(true);
  const false1 = net.createBool(false);
  const andOp = net.createOp('and');
  net.connect(andOp.ports[1], true1.ports[0]);
  net.connect(andOp.ports[2], false1.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoBoolean();