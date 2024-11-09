const { InteractionNet, NodeType } = require('../../src/vm.js');
const { printNet } = require('../../helpers/printNet.js');

function demoPair() {
  console.log('\n=== Pair (true false) ===');
  const net = new InteractionNet();
  
  // Create a pair
  const pair = net.createPair();
  const bool1 = net.createBool(true);
  const bool2 = net.createBool(false);
  net.connect(pair.ports[1], bool1.ports[0]);
  net.connect(pair.ports[2], bool2.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoPair();