// Helper function to print the current state of the net
function printNet(net) {
  console.log('\nCurrent network state:');
  for (const node of net.nodes) {
    console.log(`Node ${node.type}:`);
    node.ports.forEach((port, i) => {
      const linkedNode = port.link?.node?.type || 'none';
      const linkedPort = port.link?.index || 'none';
      const uplinkedNode = port.uplink?.node?.type || 'none';
      const uplinkedPort = port.uplink?.index || 'none';
      console.log(`  Port ${i}: ${port.isPositive ? 'positive' : 'negative'}`);
      console.log(`    -> linked to: ${linkedNode}:${linkedPort}`);
      console.log(`    -> uplinked to: ${uplinkedNode}:${uplinkedPort}`);
    });
  }
  console.log('\nActive pairs:', net.active.size);
}

module.exports = { printNet };