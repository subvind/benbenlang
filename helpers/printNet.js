const { NodeType } = require('../src/vm');

// Helper function to print the current state of the net
function nodeToString(node) {
  if (!node) return 'none';
  
  switch (node.type) {
    case NodeType.OPE:
      return `${node.type}(${node.operation})`;  // Add operation type to display
    default:
      return node.type;
  }
}

function printNet(net) {
  console.log('\nCurrent network state:');
  for (const node of net.nodes) {
    console.log(`Node ${nodeToString(node)}:`);
    for (let i = 0; i < node.ports.length; i++) {
      const port = node.ports[i];
      console.log(`  Port ${i}: ${port.isPositive ? 'positive' : 'negative'}`);
      console.log(`    -> linked to: ${nodeToString(port.link?.node)}:${port.link?.index ?? 'none'}`);
      console.log(`    -> uplinked to: ${nodeToString(port.uplink?.node)}:${port.uplink?.index ?? 'none'}`);
    }
  }
  console.log(`\nActive pairs: ${net.active.size}`);
}

module.exports = { printNet };