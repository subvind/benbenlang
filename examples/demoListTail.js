const { InteractionNet, NodeType } = require('../src/vm.js');
const { printNet } = require('../helpers/printNet.js');

function demoListTail() {
  console.log('=== Tail [1, 2, 3] ===\n');
  
  const net = new InteractionNet();
  
  // Create list node
  const list = net.createList();
  
  // Create tail operation node
  const tail = net.createTail();
  
  // Create number nodes for list elements
  const num1 = net.createNum(1);
  const num2 = net.createNum(2);
  const num3 = net.createNum(3);
  
  // Connect tail operation to list
  net.connect(tail.ports[0], list.ports[0]);
  
  // Connect first element
  net.connect(list.ports[1], num1.ports[0]);
  
  // Create another list for remaining elements
  const restList = net.createList();
  net.connect(list.ports[2], restList.ports[0]);
  net.connect(restList.ports[1], num2.ports[0]);
  net.connect(restList.ports[2], num3.ports[0]);
  
  printNet(net);
  net.normalForm();
  printNet(net);
}

demoListTail();