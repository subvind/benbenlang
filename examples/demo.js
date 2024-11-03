const { InteractionNet, NodeType } = require('../src/vm.js');

const net = new InteractionNet();

// Create (λx.x)y
const lam = net.createLam();
const app = net.createApp();
const var_y = net.createNode(NodeType.VAR);

// Connect the nodes
net.connect(app.ports[0], lam.ports[0]);  // Connect lambda to application
net.connect(app.ports[2], var_y.ports[0]); // Connect y to argument
net.setUplink(lam.ports[0], lam.ports[1]); // Variable occurrence points to binder

// Reduce to normal form
net.normalForm();