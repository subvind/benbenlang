// ./src/vm.js
const NodeType = {
  LAM: 'LAM',   // Lambda abstraction
  APP: 'APP',   // Application
  VAR: 'VAR',   // Variable
  DUP: 'DUP',    // Duplicator
  ERA: 'ERA',    // Eraser (for garbage collection)
  CON: 'CON'     // Constant (for built-in values)
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
    if (!port1 || !port2) {
      throw new Error('Cannot connect undefined ports');
    }
    port1.link = port2;
    port2.link = port1;
    
    // If connecting principal ports, add to active pairs
    if (port1.index === 0 && port2.index === 0) {
      this.active.add([port1.node, port2.node]);
    }
  }

  // Set up an uplink between ports
  setUplink(fromPort, toPort) {
    if (!fromPort || !toPort) {
      throw new Error('Cannot set uplink with undefined ports');
    }
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

  // Create an erasure node
  createEra() {
    const node = this.createNode(NodeType.ERA);
    node.addPort(false);  // Principal port (negative)
    return node;
  }

  // Create a constant node
  createCon(value) {
    const node = this.createNode(NodeType.CON);
    node.addPort(false);  // Principal port (negative)
    node.value = value;   // Store constant value
    return node;
  }

  // Perform a single reduction step
  reduce() {
    if (this.active.size === 0) return false;
    
    const activePair = Array.from(this.active)[0];
    this.active.delete(activePair);
    const [node1, node2] = activePair;

    // Basic reductions
    if (this.tryBasicReduction(node1, node2)) return true;
    
    // Erasure reductions
    if (this.tryErasureReduction(node1, node2)) return true;
    
    // Constant reductions
    if (this.tryConstantReduction(node1, node2)) return true;

    return true;
  }

  // Reduce try basic
  tryBasicReduction(node1, node2) {
    switch(true) {
      case (node1.type === NodeType.LAM && node2.type === NodeType.APP) ||
           (node2.type === NodeType.LAM && node1.type === NodeType.APP):
        this.reduceLamApp(
          node1.type === NodeType.LAM ? node1 : node2,
          node1.type === NodeType.APP ? node1 : node2
        );
        return true;

      case (node1.type === NodeType.DUP && node2.type === NodeType.APP) ||
           (node2.type === NodeType.DUP && node1.type === NodeType.APP):
        this.reduceDupApp(
          node1.type === NodeType.DUP ? node1 : node2,
          node1.type === NodeType.APP ? node1 : node2
        );
        return true;

      case (node1.type === NodeType.DUP && node2.type === NodeType.LAM) ||
           (node2.type === NodeType.DUP && node1.type === NodeType.LAM):
        this.reduceDupLam(
          node1.type === NodeType.DUP ? node1 : node2,
          node1.type === NodeType.LAM ? node1 : node2
        );
        return true;

      case (node1.type === NodeType.DUP && node2.type === NodeType.DUP):
        this.reduceDupDup(node1, node2);
        return true;
    }
    return false;
  }

  // Reduce try erasure
  tryErasureReduction(node1, node2) {
    if (node1.type !== NodeType.ERA && node2.type !== NodeType.ERA) return false;
    
    const era = node1.type === NodeType.ERA ? node1 : node2;
    const other = node1.type === NodeType.ERA ? node2 : node1;

    switch(other.type) {
      case NodeType.LAM:
        this.reduceEraLam(era, other);
        return true;
      case NodeType.APP:
        this.reduceEraApp(era, other);
        return true;
      case NodeType.DUP:
        this.reduceEraDup(era, other);
        return true;
      case NodeType.CON:
        this.reduceEraCon(era, other);
        return true;
      case NodeType.ERA:
        this.nodes.delete(era);
        this.nodes.delete(other);
        return true;
    }
    return false;
  }

  // Reduce try constant
  tryConstantReduction(node1, node2) {
    if (node1.type !== NodeType.CON && node2.type !== NodeType.CON) return false;
    
    const con = node1.type === NodeType.CON ? node1 : node2;
    const other = node1.type === NodeType.CON ? node2 : node1;

    switch(other.type) {
      case NodeType.DUP:
        this.reduceConDup(con, other);
        return true;
      case NodeType.CON:
        this.reduceConCon(con, other);
        return true;
    }
    return false;
  }

  // Reduce lambda-application pair
  reduceLamApp(lam, app) {
    // Connect lambda's binding port to application's argument
    this.connect(lam.ports[1], app.ports[2]);
    
    // Connect lambda's body to application's function
    const uplinkedPort = lam.ports[0].uplink;
    if (uplinkedPort) {
      this.connect(uplinkedPort, app.ports[1]);
    }

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
    const argUplink = app.ports[2].uplink;
    if (argUplink) {
      this.connect(newApp1.ports[2], argUplink);
      this.connect(newApp2.ports[2], argUplink);
    }

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
    const bodyUplink = lam.ports[0].uplink;
    if (bodyUplink) {
      this.setUplink(newLam1.ports[0], bodyUplink);
      this.setUplink(newLam2.ports[0], bodyUplink);
    }

    // Clean up
    this.nodes.delete(dup);
    this.nodes.delete(lam);
  }

  reduceDupDup(dup1, dup2) {
    const newDup1 = this.createDup();
    const newDup2 = this.createDup();
    const newDup3 = this.createDup();

    this.connect(newDup1.ports[1], newDup2.ports[0]);
    this.connect(newDup1.ports[2], newDup3.ports[0]);
    this.connect(newDup2.ports[1], dup1.ports[1]);
    this.connect(newDup2.ports[2], dup2.ports[1]);
    this.connect(newDup3.ports[1], dup1.ports[2]);
    this.connect(newDup3.ports[2], dup2.ports[2]);

    this.nodes.delete(dup1);
    this.nodes.delete(dup2);
  }

  reduceEraLam(era, lam) {
    const newEra = this.createEra();
    this.connect(newEra.ports[0], lam.ports[1]);
    this.nodes.delete(era);
    this.nodes.delete(lam);
  }

  reduceEraApp(era, app) {
    const newEra1 = this.createEra();
    const newEra2 = this.createEra();
    this.connect(newEra1.ports[0], app.ports[1]);
    this.connect(newEra2.ports[0], app.ports[2]);
    this.nodes.delete(era);
    this.nodes.delete(app);
  }

  reduceEraDup(era, dup) {
    const newEra1 = this.createEra();
    const newEra2 = this.createEra();
    this.connect(newEra1.ports[0], dup.ports[1]);
    this.connect(newEra2.ports[0], dup.ports[2]);
    this.nodes.delete(era);
    this.nodes.delete(dup);
  }

  reduceEraCon(era, con) {
    this.nodes.delete(era);
    this.nodes.delete(con);
  }

  reduceConDup(con, dup) {
    const newCon1 = this.createCon(con.value);
    const newCon2 = this.createCon(con.value);
    this.connect(newCon1.ports[0], dup.ports[1]);
    this.connect(newCon2.ports[0], dup.ports[2]);
    this.nodes.delete(con);
    this.nodes.delete(dup);
  }

  reduceConCon(con1, con2) {
    // Handle built-in operations between constants
    const result = this.evaluateConstants(con1.value, con2.value);
    const resultNode = this.createCon(result);
    
    // Connect result to any waiting computations
    if (con1.ports[0].uplink) {
      this.connect(resultNode.ports[0], con1.ports[0].uplink);
    }
    
    this.nodes.delete(con1);
    this.nodes.delete(con2);
  }

  evaluateConstants(val1, val2) {
    // Simple arithmetic operations as an example
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return val1 + val2; // Could be extended for other operations
    }
    return null;
  }

  // Run the machine until no more reductions are possible
  normalForm() {
    let steps = 0;
    while (this.reduce()) {
      steps++;
      if (steps > 1000) throw new Error('Reduction exceeded 1000 steps - possible infinite loop');
    }
    return steps;
  }
}

module.exports = { InteractionNet, NodeType };