// ./src/vm.js
const NodeType = {
  LAM: 'LAM',   // Lambda abstraction
  APP: 'APP',   // Application
  VAR: 'VAR',   // Variable
  DUP: 'DUP',   // Duplicator
  ERA: 'ERA',   // Eraser (for garbage collection)
  NUM: 'NUM',   // Number constant (for built-in values)
  BOOL: 'BOOL', // Boolean constant
  PAIR: 'PAIR', // Pair constructor
  FST: 'FST',   // First projection
  SND: 'SND',   // Second projection
  OPE: 'OPE'      // Built-in operator
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

  // Create a number constant node
  createNum(value) {
    const node = this.createNode(NodeType.NUM);
    node.addPort(false);  // Principal port (negative)
    node.value = value;   // Store constant value
    return node;
  }

  // Create a boolean constant node
  createBool(value) {
    const node = this.createNode(NodeType.BOOL);
    node.addPort(false);  // Principal port
    node.value = value;   // Store boolean value
    return node;
  }

  // Create a pair constructor node
  createPair() {
    const node = this.createNode(NodeType.PAIR);
    node.addPort(false);  // Principal port
    node.addPort(true);   // First element
    node.addPort(true);   // Second element
    return node;
  }

  // Create a first projection node
  createFst() {
    const node = this.createNode(NodeType.FST);
    node.addPort(false);  // Principal port
    node.addPort(true);   // Result port
    return node;
  }

  // create a second projection node
  createSnd() {
    const node = this.createNode(NodeType.SND);
    node.addPort(false);  // Principal port
    node.addPort(true);   // Result port
    return node;
  }

  // Create an built-in operation node
  createOp(operation) {
    const node = this.createNode(NodeType.OP);
    node.addPort(false);  // Principal port
    node.addPort(true);   // Left operand
    node.addPort(true);   // Right operand
    node.operation = operation;  // Store operation type
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
      case NodeType.NUM:
        this.reduceEraNum(era, other);
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
    if (!super.tryConstantReduction(node1, node2)) {
      // Handle new constant types
      if (node1.type === NodeType.OP || node2.type === NodeType.OP) {
        return this.reduceOperation(
          node1.type === NodeType.OP ? node1 : node2,
          node1.type === NodeType.OP ? node2 : node1
        );
      }
      return false;
    }
    return true;
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

  reduceEraNum(era, num) {
    this.nodes.delete(era);
    this.nodes.delete(num);
  }

  reduceNumDup(num, dup) {
    const newNum1 = this.createNum(num.value);
    const newNum2 = this.createNum(num.value);
    this.connect(newNum1.ports[0], dup.ports[1]);
    this.connect(newNum2.ports[0], dup.ports[2]);
    this.nodes.delete(num);
    this.nodes.delete(dup);
  }

  reduceNumNUm(num1, num2) {
    // Handle built-in operations between constants
    const result = this.evaluateConstants(num1.value, num2.value);
    const resultNode = this.createNum(result);
    
    // Connect result to any waiting computations
    if (num1.ports[0].uplink) {
      this.connect(resultNode.ports[0], num1.ports[0].uplink);
    }
    
    this.nodes.delete(num1);
    this.nodes.delete(num2);
  }

  reduceOperation(op, arg) {
    switch(op.operation) {
      case 'add':
      case 'mul':
      case 'sub':
      case 'div':
        return this.reduceArithmeticOp(op, arg);
      case 'and':
      case 'or':
      case 'not':
        return this.reduceBooleanOp(op, arg);
      default:
        throw new Error(`Unknown operation: ${op.operation}`);
    }
  }

  reduceArithmeticOp(op, arg) {
    if (arg.type !== NodeType.NUM) return false;
    
    const operations = {
      'add': (a, b) => a + b,
      'mul': (a, b) => a * b,
      'sub': (a, b) => a - b,
      'div': (a, b) => a / b
    };

    const result = this.createNum(operations[op.operation](op.value, arg.value));
    if (op.ports[0].uplink) {
      this.connect(result.ports[0], op.ports[0].uplink);
    }
    
    this.nodes.delete(op);
    this.nodes.delete(arg);
    return true;
  }

  reduceBooleanOp(op, arg) {
    if (arg.type !== NodeType.BOOL) return false;
    
    const operations = {
      'and': (a, b) => a && b,
      'or': (a, b) => a || b,
      'not': a => !a
    };

    const result = this.createBool(operations[op.operation](op.value, arg.value));
    if (op.ports[0].uplink) {
      this.connect(result.ports[0], op.ports[0].uplink);
    }
    
    this.nodes.delete(op);
    this.nodes.delete(arg);
    return true;
  }

  evaluateConstants(val1, val2) {
    // Simple arithmetic operations as an example
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return val1 + val2;
    }
    if (typeof val1 === 'boolean' && typeof val2 === 'boolean') {
      return val1 && val2; // Example boolean operation
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

// Example of Y combinator implementation
function createYCombinator(net) {
  // Y = λf.((λx.f (x x)) (λx.f (x x)))
  const f = net.createNode(NodeType.VAR);
  f.addPort(false);

  // Create the main lambda (λf.)
  const mainLam = net.createLam();
  
  // Create the duplicator for the inner term
  const dup = net.createDup();
  
  // Create the inner lambda (λx.)
  const innerLam = net.createLam();
  
  // Create application nodes
  const app1 = net.createApp();  // Outer application
  const app2 = net.createApp();  // Inner application (x x)
  const app3 = net.createApp();  // f (...)
  
  // Connect everything together
  net.connect(mainLam.ports[1], f.ports[0]);
  net.connect(app1.ports[0], mainLam.ports[0]);
  net.connect(app1.ports[1], innerLam.ports[0]);
  net.connect(app1.ports[2], innerLam.ports[0]);
  
  net.connect(app2.ports[1], dup.ports[1]);
  net.connect(app2.ports[2], dup.ports[2]);
  net.connect(dup.ports[0], innerLam.ports[1]);
  
  net.connect(app3.ports[1], f.ports[0]);
  net.connect(app3.ports[2], app2.ports[0]);
  
  return mainLam;
}

module.exports = {
  InteractionNet,
  NodeType,
  createYCombinator
};