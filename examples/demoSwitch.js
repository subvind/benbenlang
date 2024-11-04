const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

function demoSwitch() {
  console.log('=== Switch (if condition then branch1 else branch2) ===\n');
    
  const net = new InteractionNet();
  
  // Create a switch node
  const swi = net.createSwitch();

  // Create a boolean condition
  const condition = net.createBool(true);

  // Create true/false branch nodes
  const trueNode = net.createNum(1);
  const falseNode = net.createNum(0);

  // Connect everything
  net.connect(swi.ports[0], condition.ports[0]);
  net.connect(swi.ports[1], trueNode.ports[0]);
  net.connect(swi.ports[2], falseNode.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoSwitch();