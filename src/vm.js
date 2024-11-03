// Types of nodes in the interaction net
const NodeType = {
  LAM: 'LAM',   // Lambda abstraction
  APP: 'APP',   // Application
  VAR: 'VAR',   // Variable
  DUP: 'DUP'    // Duplicator
};

// Represents a port in the interaction net
class Port {
  constructor(node, index, isPositive) {
    this.node = node;       // Reference to the node this port belongs to
    this.index = index;     // Port index on the node
    this.isPositive = isPositive;  // Whether this is a positive (green) or negative (red) port
    this.link = null;       // Connection to another port
    this.uplink = null;     // Upward connection (gray arrows)
  }
}

// Represents a node in the interaction net
class Node {
  constructor(type) {
    this.type = type;
    this.ports = [];        // Array of ports
    this.isActive = true;   // Whether this node can participate in reductions
  }

  // Create a new port on this node
  addPort(isPositive) {
    const port = new Port(this, this.ports.length, isPositive);
    this.ports.push(port);
    return port;
  }
}

class InteractionNet {
  constructor() {
    this.nodes = new Set();
    this.active = new Set(); // Set of active pairs
  }

  // Create a new node of given type
  createNode(type) {
    const node = new Node(type);
    this.nodes.add(node);
    return node;
  }

  // Connect two ports together
  connect(port1, port2) {
    port1.link = port2;
    port2.link = port1;
    
    // If connecting principal ports, add to active pairs
    if (port1.index === 0 && port2.index === 0) {
      this.active.add([port1.node, port2.node]);
    }
  }

  // Set up an uplink between ports
  setUplink(fromPort, toPort) {
    fromPort.uplink = toPort;
  }

  // Create a lambda abstraction node
  createLam() {
    const node = this.createNode(NodeType.LAM);
    node.addPort(true);   // Principal port (positive)
    node.addPort(false);  // Binding port (negative)
    return node;
  }

  // Create an application node
  createApp() {
    const node = this.createNode(NodeType.APP);
    node.addPort(false);  // Principal port (negative)
    node.addPort(true);   // Left port (positive)
    node.addPort(true);   // Right port (positive)
    return node;
  }

  // Create a duplicator node
  createDup() {
    const node = this.createNode(NodeType.DUP);
    node.addPort(false);  // Principal port (negative)
    node.addPort(true);   // Left copy port (positive)
    node.addPort(true);   // Right copy port (positive)
    return node;
  }

  // Perform a single reduction step
  reduce() {
    if (this.active.size === 0) return false;
    
    const [node1, node2] = this.active.values().next().value;
    this.active.delete([node1, node2]);

    switch(true) {
      case node1.type === NodeType.LAM && node2.type === NodeType.APP:
        this.reduceLamApp(node1, node2);
        break;
      case node1.type === NodeType.DUP && node2.type === NodeType.APP:
        this.reduceDupApp(node1, node2);
        break;
      case node1.type === NodeType.DUP && node2.type === NodeType.LAM:
        this.reduceDupLam(node1, node2);
        break;
    }

    return true;
  }

  // Reduce lambda-application pair
  reduceLamApp(lam, app) {
    // Connect lambda's binding port to application's argument
    this.connect(lam.ports[1], app.ports[2]);
    
    // Connect lambda's body to application's function
    this.connect(lam.ports[0].uplink, app.ports[1]);

    // Clean up
    this.nodes.delete(lam);
    this.nodes.delete(app);
  }

  // Reduce duplicator-application pair
  reduceDupApp(dup, app) {
    const newApp1 = this.createApp();
    const newApp2 = this.createApp();
    const newDup = this.createDup();

    // Connect the new duplicator to the function ports
    this.connect(newDup.ports[1], newApp1.ports[1]);
    this.connect(newDup.ports[2], newApp2.ports[1]);
    
    // Connect original function to new duplicator
    this.connect(newDup.ports[0], app.ports[1]);

    // Connect the applications to the original duplicator copies
    this.connect(newApp1.ports[0], dup.ports[1]);
    this.connect(newApp2.ports[0], dup.ports[2]);

    // Connect arguments
    this.connect(newApp1.ports[2], app.ports[2].uplink);
    this.connect(newApp2.ports[2], app.ports[2].uplink);

    // Clean up
    this.nodes.delete(dup);
    this.nodes.delete(app);
  }

  // Reduce duplicator-lambda pair
  reduceDupLam(dup, lam) {
    const newLam1 = this.createLam();
    const newLam2 = this.createLam();
    const newDup = this.createDup();

    // Connect new duplicator to binding ports
    this.connect(newDup.ports[1], newLam1.ports[1]);
    this.connect(newDup.ports[2], newLam2.ports[1]);

    // Connect original binding to new duplicator
    this.connect(newDup.ports[0], lam.ports[1]);

    // Connect new lambdas to original duplicator copies
    this.connect(newLam1.ports[0], dup.ports[1]);
    this.connect(newLam2.ports[0], dup.ports[2]);

    // Set up uplinks for the new lambda bodies
    this.setUplink(newLam1.ports[0], lam.ports[0].uplink);
    this.setUplink(newLam2.ports[0], lam.ports[0].uplink);

    // Clean up
    this.nodes.delete(dup);
    this.nodes.delete(lam);
  }

  // Run the machine until no more reductions are possible
  normalForm() {
    while (this.reduce()) {}
  }
}

module.exports = { InteractionNet, NodeType };