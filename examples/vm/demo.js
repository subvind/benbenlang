// ./examples/demo.js
const { InteractionNet, NodeType } = require('../../src/vm.js');
const { printNet } = require('../../helpers/printNet.js');

// Create a new interaction net
const net = new InteractionNet();

// Example 1: Create and reduce (λx.x) y
console.log('Creating (λx.x) y');

// Create the nodes
const lam = net.createLam();     // λx.x
const app = net.createApp();     // Application node
const varY = net.createNode(NodeType.VAR); // y
varY.addPort(false);  // Add a negative port to variable node

// Set up the connections
net.connect(app.ports[0], lam.ports[0]);   // Connect lambda to application
net.connect(app.ports[2], varY.ports[0]);  // Connect y to argument
net.setUplink(lam.ports[0], lam.ports[1]); // Variable occurrence points to binder

// Print initial state
console.log('\nInitial state:');
printNet(net);

// Reduce to normal form
console.log('\nReducing...');
net.normalForm();

// Print final state
console.log('\nFinal state:');
printNet(net);

// Example 2: Create and reduce (λx.x x) y
console.log('\n\nCreating (λx.x x) y');

const net2 = new InteractionNet();

const lam2 = net2.createLam();    // λx.
const app2_1 = net2.createApp();  // Outer application
const app2_2 = net2.createApp();  // Inner application (x x)
const dup = net2.createDup();     // Duplicator for x
const varY2 = net2.createNode(NodeType.VAR); // y
varY2.addPort(false);

// Connect outer application to lambda
net2.connect(app2_1.ports[0], lam2.ports[0]);

// Connect y to outer application's argument
net2.connect(app2_1.ports[2], varY2.ports[0]);

// Connect duplicator to lambda's binding
net2.connect(dup.ports[0], lam2.ports[1]);

// Connect duplicator copies to inner application
net2.connect(dup.ports[1], app2_2.ports[1]);
net2.connect(dup.ports[2], app2_2.ports[2]);

// Print initial state
console.log('\nInitial state:');
printNet(net2);

// Reduce to normal form
console.log('\nReducing...');
net2.normalForm();

// Print final state
console.log('\nFinal state:');
printNet(net2);