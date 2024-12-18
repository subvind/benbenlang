const { InteractionNet, NodeType } = require('../../src/vm.js');
const { printNet } = require('../../helpers/printNet.js');

function demoSnd() {
  console.log('\n=== Second (5 10) ===');
  const net = new InteractionNet();
  
  // Create a pair
  const pair = net.createPair();
  const num1 = net.createNum(5);
  const num2 = net.createNum(10);
  net.connect(pair.ports[1], num1.ports[0]);
  net.connect(pair.ports[2], num2.ports[0]);

  const snd = net.createSnd();
  net.connect(snd.ports[0], pair.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoSnd();