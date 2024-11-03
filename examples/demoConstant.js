const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

// Example 3: Constant function (λx.5)
function demoConstant() {
  console.log('\n=== Example 3: Constant function (λx.5) y ===');
  const net = new InteractionNet();
  
  const lam = net.createLam();
  const app = net.createApp();
  const num = net.createNum(5);
  const varY = net.createNode(NodeType.VAR);
  varY.addPort(false);
  
  net.connect(app.ports[0], lam.ports[0]);
  net.connect(app.ports[2], varY.ports[0]);
  net.setUplink(lam.ports[0], num.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoConstant();