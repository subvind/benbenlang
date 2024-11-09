const { InteractionNet, NodeType } = require('../../src/vm.js');
const { printNet } = require('../../helpers/printNet.js');

function demoSelfApp() {
  console.log('\n=== Self-application (λx.x x) y ===');
  const net = new InteractionNet();
  
  const lam = net.createLam();
  const app1 = net.createApp();
  const app2 = net.createApp();
  const dup = net.createDup();
  const varY = net.createNode(NodeType.VAR);
  varY.addPort(false);
  
  net.connect(app1.ports[0], lam.ports[0]);
  net.connect(app1.ports[2], varY.ports[0]);
  net.connect(dup.ports[0], lam.ports[1]);
  net.connect(dup.ports[1], app2.ports[1]);
  net.connect(dup.ports[2], app2.ports[2]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoSelfApp();