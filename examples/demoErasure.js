const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

function demoErasure() {
  console.log('\n=== Garbage collection with erasure ((λx.y) z) ===');
  const net = new InteractionNet();
  
  const lam = net.createLam();
  const app = net.createApp();
  const varY = net.createNode(NodeType.VAR);
  const varZ = net.createNode(NodeType.VAR);
  const era = net.createEra();
  
  varY.addPort(false);
  varZ.addPort(false);
  
  net.connect(app.ports[0], lam.ports[0]);
  net.connect(app.ports[2], varZ.ports[0]);
  net.connect(era.ports[0], lam.ports[1]);
  net.setUplink(lam.ports[0], varY.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoErasure();