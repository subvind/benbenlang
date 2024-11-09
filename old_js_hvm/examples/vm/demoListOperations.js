const { InteractionNet, NodeType } = require('../../src/vm.js');
const { printNet } = require('../../helpers/printNet.js');

function demoListOperations() {
  console.log('=== Head (Tail [1, 2, 3]) ===\n');
  
  const net = new InteractionNet();
  
  // Create initial list [1, 2, 3]
  const list = net.createList();
  const num1 = net.createNum(1);
  const num2 = net.createNum(2);
  const num3 = net.createNum(3);
  
  // Create nested list structure
  net.connect(list.ports[1], num1.ports[0]);
  
  const restList = net.createList();
  net.connect(list.ports[2], restList.ports[0]);
  net.connect(restList.ports[1], num2.ports[0]);
  net.connect(restList.ports[2], num3.ports[0]);
  
  // Create tail operation
  const tail = net.createTail();
  net.connect(tail.ports[0], list.ports[0]);
  
  // Create head operation on the result of tail
  const head = net.createHead();
  net.connect(head.ports[0], tail.ports[1]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoListOperations();