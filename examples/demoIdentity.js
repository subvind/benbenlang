const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

// Example 1: Identity function (λx.x) y
function demoIdentity() {
  console.log('\n=== Example 1: Identity function (λx.x) y ===');
  const net = new InteractionNet();
  
  const lam = net.createLam();
  const app = net.createApp();
  const varY = net.createNode(NodeType.VAR);
  varY.addPort(false);
  
  net.connect(app.ports[0], lam.ports[0]);
  net.connect(app.ports[2], varY.ports[0]);
  net.setUplink(lam.ports[0], lam.ports[1]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoIdentity();