const { NodeType } = require('../src/vm');

// Helper function to print the current state of the net
function nodeToString(node) {
  if (!node) return 'none';
  
  switch (node.type) {
    case NodeType.OPE:
      return `${node.type}(${node.metadata.operator})`;  // Add operation type to display
    case NodeType.BOOL:
    case NodeType.NUM:
    case NodeType.STR:
      return `${node.type}(${node.value})`;
    default:
      return node.type;
  }
}

function printNet(net) {
  console.log('Current network state:');
  for (const node of net.nodes) {
    console.log(`Node(id=${node._id} type=${nodeToString(node)})`);
    for (let i = 0; i < node.ports.length; i++) {
      const port = node.ports[i];
      console.log(`  Port ${i}: ${port.isPositive ? 'positive' : 'negative'}`);
      console.log(`    -> linked to: Node(id=${port.link?.node._id} type=${nodeToString(port.link?.node)} index=${port.link?.index ?? 'none'})`);
      console.log(`    -> uplinked to: Node(id=${port.link?.node._id} type=${nodeToString(port.uplink?.node)} index=${port.uplink?.index ?? 'none'})`);
    }
  }
  console.log(`\nActive pairs: ${net.active.size}\n`);
}

module.exports = { printNet };