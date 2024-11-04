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
  OPE: 'OPE',   // Built-in operator
  STR: 'STR',   // String constant
  LIST: 'LIST', // List constructor
  HEAD: 'HEAD', // List head operation
  TAIL: 'TAIL', // List tail operation
  SWI: 'SWI',   // Switch conditional
};

// Represents a port in the interaction net
class Port {
  constructor(node, index, isPositive) {
    if (!node) throw new Error('Port must belong to a node');
    if (typeof index !== 'number') throw new Error('Port index must be a number');
    if (typeof isPositive !== 'boolean') throw new Error('isPositive must be a boolean');

    this.node = node;              // Reference to the node this port belongs to
    this.index = index;            // Port index on the node
    this.isPositive = isPositive;  // Whether this is a positive (green) or negative (red) port
    this.link = null;              // Connection to another port
    this.uplink = null;            // Upward connection (gray arrows)
    this._id = Port.nextId++;      // Unique ID for debugging
  }

  static nextId = 0;

  // Helper method to check if port is connected
  isConnected() {
    return this.link !== null;
  }

  // Debug representation
  toString() {
    return `Port(id=${this._id}, node=${this.node.type}, index=${this.index}, positive=${this.isPositive})`;
  }
}

// Represents a node in the interaction net
class Node {
  constructor(type) {
    if (!NodeType[type]) throw new Error(`Invalid node type: ${type}`);

    this.type = type;
    this.ports = [];        // Array of ports
    this.isActive = true;   // Whether this node can participate in reductions
    this._id = Node.nextId++; // Unique ID for debugging
    this.metadata = {}; // Extensible metadata storage
  }

  // Create a new port on this node
  addPort(isPositive) {
    const port = new Port(this, this.ports.length, isPositive);
    this.ports.push(port);
    return port;
  }

  // Helper to check if node can reduce with another node
  canReduceWith(other) {
    return this.isActive 
      && other.isActive 
      && this.ports[0].isConnected() 
      && other.ports[0].isConnected();
  }

  // Debug representation
  toString() {
    return `Node(id=${this._id}, type=${this.type}, ports=${this.ports.length})`;
  }
}

class InteractionNet {
  constructor() {
    this.nodes = new Set();
    this.active = new Set(); // Set of active pairs
    this.statistics = {  // Add statistics tracking
      reductions: 0,
      createdNodes: 0,
      deletedNodes: 0
    };
    this.debugMode = false;  // Debug flag
  }

  // Enable/disable debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  // Log debug information
  debug(...args) {
    if (this.debugMode) {
      console.log('[DEBUG]', ...args);
    }
  }

  // Create a new node of given type
  createNode(type) {
    const node = new Node(type);
    this.nodes.add(node);
    this.statistics.createdNodes++;
    this.debug(`Created node: ${node}`);
    return node;
  }

  // Delete a node method
  deleteNode(node) {
    if (!this.nodes.has(node)) {
      throw new Error('Cannot delete non-existent node');
    }
    
    // Clean up connections
    for (const port of node.ports) {
      if (port.link) {
        port.link.link = null;
        port.link = null;
      }
      if (port.uplink) {
        port.uplink = null;
      }
    }

    this.nodes.delete(node);
    this.statistics.deletedNodes++;
    this.debug(`Deleted node: ${node}`);
  }

  // Connect two ports together
  connect(port1, port2) {
    if (!port1 || !port2) {
      throw new Error('Cannot connect undefined ports');
    }
    
    // if (port1.link || port2.link) {
    //   throw new Error('Cannot connect already connected ports');
    // }

    // // Validate port polarity
    // if (port1.isPositive === port2.isPositive) {
    //   throw new Error('Cannot connect ports of same polarity');
    // }

    port1.link = port2;
    port2.link = port1;
    
    // If connecting principal ports, add to active pairs
    if (port1.index === 0 && port2.index === 0) {
      this.active.add([port1.node, port2.node]);
      this.debug(`Added active pair: ${port1.node} - ${port2.node}`);
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
    const node = this.createNode(NodeType.OPE);
    node.addPort(false);  // Principal port
    node.addPort(true);   // Left operand
    node.addPort(true);   // Right operand
    node.operation = operation;  // Store operation type
    return node;
  }

  createString(value) {
    const node = this.createNode(NodeType.STR);
    node.addPort(false);
    node.value = value;
    return node;
  }

  createList() {
    const node = this.createNode(NodeType.LIST);
    node.addPort(false); // Principal port
    node.addPort(true);  // Head
    node.addPort(true);  // Tail
    return node;
  }

  createHead() {
    const node = this.createNode(NodeType.HEAD);
    node.addPort(false); // Principal port
    node.addPort(true);  // Result port
    return node;
  }

  createTail() {
    const node = this.createNode(NodeType.TAIL);
    node.addPort(false); // Principal port
    node.addPort(true);  // Result port
    return node;
  }

  createSwitch() {
    const node = this.createNode(NodeType.SWI);
    node.addPort(false); // Principal port for boolean input
    node.addPort(true);  // True branch port
    node.addPort(true);  // False branch port
    return node;
  }

  // Perform a single reduction step
  reduce() {
    if (this.active.size === 0) return false;
    
    try {
      const activePair = Array.from(this.active)[0];
      this.active.delete(activePair);
      const [node1, node2] = activePair;

      if (!node1.canReduceWith(node2)) {
        this.debug('Invalid active pair, skipping reduction');
        return true;
      }

      // Track reduction statistics
      this.statistics.reductions++;
      
      // Extended reduction rules
      if (this.tryBasicReduction(node1, node2)) return true;
      if (this.tryErasureReduction(node1, node2)) return true;
      if (this.tryConstantReduction(node1, node2)) return true;
      if (this.tryListReduction(node1, node2)) return true;
      
      throw new Error(`No reduction rule for pair: ${node1.type} - ${node2.type}`);
    } catch (error) {
      this.debug('Reduction error:', error);
      throw error;
    }
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

      case (node1.type === NodeType.SWI && node2.type === NodeType.BOOL) ||
            (node2.type === NodeType.SWI && node1.type === NodeType.BOOL):
        this.reduceSwitchBool(
          node1.type === NodeType.SWI ? node1 : node2,
          node1.type === NodeType.BOOL ? node1 : node2
        );
        return true;

      case (node1.type === NodeType.SWI && node2.type === NodeType.DUP) ||
            (node2.type === NodeType.SWI && node1.type === NodeType.DUP):
        this.reduceSwitchDup(
          node1.type === NodeType.SWI ? node1 : node2,
          node1.type === NodeType.DUP ? node1 : node2
        );
        return true;

      case (node1.type === NodeType.SWI && node2.type === NodeType.ERA) ||
            (node2.type === NodeType.SWI && node1.type === NodeType.ERA):
        this.reduceSwitchEra(
          node1.type === NodeType.SWI ? node1 : node2,
          node1.type === NodeType.ERA ? node1 : node2
        );
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
    // Handle pair projections
    if ((node1.type === NodeType.FST && node2.type === NodeType.PAIR) ||
        (node2.type === NodeType.FST && node1.type === NodeType.PAIR)) {
      this.reduceFstPair(
        node1.type === NodeType.FST ? node1 : node2,
        node1.type === NodeType.PAIR ? node1 : node2
      );
      return true;
    }
    
    if ((node1.type === NodeType.SND && node2.type === NodeType.PAIR) ||
        (node2.type === NodeType.SND && node1.type === NodeType.PAIR)) {
      this.reduceSndPair(
        node1.type === NodeType.SND ? node1 : node2,
        node1.type === NodeType.PAIR ? node1 : node2
      );
      return true;
    }
  
    // Handle numeric operations
    if ((node1.type === NodeType.NUM && node2.type === NodeType.NUM) ||
        (node1.type === NodeType.NUM && node2.type === NodeType.DUP) ||
        (node2.type === NodeType.NUM && node1.type === NodeType.DUP)) {
      if (node1.type === NodeType.NUM && node2.type === NodeType.NUM) {
        this.reduceNumNum(node1, node2);
        return true;
      }
      if (node1.type === NodeType.NUM && node2.type === NodeType.DUP) {
        this.reduceNumDup(node1, node2);
        return true;
      }
      if (node2.type === NodeType.NUM && node1.type === NodeType.DUP) {
        this.reduceNumDup(node2, node1);
        return true;
      }
    }
  
    // Handle operation nodes
    if (node1.type === NodeType.OP || node2.type === NodeType.OP) {
      return this.reduceOperation(
        node1.type === NodeType.OP ? node1 : node2,
        node1.type === NodeType.OP ? node2 : node1
      );
    }
  
    return false;
  }

  // Reduce try list-related reductions
  tryListReduction(node1, node2) {
    if ((node1.type === NodeType.HEAD && node2.type === NodeType.LIST) ||
        (node2.type === NodeType.HEAD && node1.type === NodeType.LIST)) {
      this.reduceHeadList(
        node1.type === NodeType.HEAD ? node1 : node2,
        node1.type === NodeType.LIST ? node1 : node2
      );
      return true;
    }
    
    if ((node1.type === NodeType.TAIL && node2.type === NodeType.LIST) ||
        (node2.type === NodeType.TAIL && node1.type === NodeType.LIST)) {
      this.reduceTailList(
        node1.type === NodeType.TAIL ? node1 : node2,
        node1.type === NodeType.LIST ? node1 : node2
      );
      return true;
    }
    
    return false;
  }
  
  // Add these new reduction methods
  reduceFstPair(fst, pair) {
    // Connect FST result port to first element of pair
    this.connect(fst.ports[1], pair.ports[1]);
    
    // Create eraser for second element
    const era = this.createEra();
    this.connect(era.ports[0], pair.ports[2]);
    
    // Clean up
    this.nodes.delete(fst);
    this.nodes.delete(pair);
  }
  
  reduceSndPair(snd, pair) {
    // Connect SND result port to second element of pair
    this.connect(snd.ports[1], pair.ports[2]);
    
    // Create eraser for first element
    const era = this.createEra();
    this.connect(era.ports[0], pair.ports[1]);
    
    // Clean up
    this.nodes.delete(snd);
    this.nodes.delete(pair);
  }
  
  // Fix typo in method name (was reduceNumNum)
  reduceNumNum(num1, num2) {
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

  // Reduce switch-boolean pair
  reduceSwitchBool(swi, bool) {
    // Connect to true or false branch based on boolean value
    const targetPort = bool.value ? swi.ports[1] : swi.ports[2];
    const unusedPort = bool.value ? swi.ports[2] : swi.ports[1];
    
    // Create eraser for unused branch
    const era = this.createEra();
    this.connect(era.ports[0], unusedPort);

    // Connect target branch to any waiting computation
    if (swi.ports[0].uplink) {
      this.connect(targetPort, swi.ports[0].uplink);
    }

    // Clean up
    this.nodes.delete(swi);
    this.nodes.delete(bool);
  }

  // Reduce switch-duplicator pair
  reduceSwitchDup(swi, dup) {
    // Create new switch nodes for each copy
    const newSwi1 = this.createSwitch();
    const newSwi2 = this.createSwitch();
    const newDup = this.createDup();

    // Connect new duplicator to both switch condition ports
    this.connect(newDup.ports[1], newSwi1.ports[0]);
    this.connect(newDup.ports[2], newSwi2.ports[0]);
    this.connect(newDup.ports[0], swi.ports[0]);

    // Connect the branches
    this.connect(newSwi1.ports[1], dup.ports[1]);
    this.connect(newSwi2.ports[1], dup.ports[2]);
    this.connect(newSwi1.ports[2], dup.ports[1]);
    this.connect(newSwi2.ports[2], dup.ports[2]);

    // Clean up
    this.nodes.delete(swi);
    this.nodes.delete(dup);
  }

  // Reduce switch-eraser pair
  reduceSwitchEra(swi, era) {
    // Create erasers for both branches
    const newEra1 = this.createEra();
    const newEra2 = this.createEra();
    
    // Connect erasers to switch branches
    this.connect(newEra1.ports[0], swi.ports[1]);
    this.connect(newEra2.ports[0], swi.ports[2]);

    // Clean up
    this.nodes.delete(swi);
    this.nodes.delete(era);
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

  reduceNumNum(num1, num2) {
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

  reduceHeadList(head, list) {
    this.connect(head.ports[1], list.ports[1]); // Connect to list head
    
    // Create eraser for tail
    const era = this.createEra();
    this.connect(era.ports[0], list.ports[2]);
    
    this.deleteNode(head);
    this.deleteNode(list);
  }

  reduceTailList(tail, list) {
    this.connect(tail.ports[1], list.ports[2]); // Connect to list tail
    
    // Create eraser for head
    const era = this.createEra();
    this.connect(era.ports[0], list.ports[1]);
    
    this.deleteNode(tail);
    this.deleteNode(list);
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
  normalForm(maxSteps = 1000) {
    let steps = 0;
    const startTime = Date.now();
    
    while (this.reduce()) {
      steps++;
      if (steps > maxSteps) {
        throw new Error(`Reduction exceeded ${maxSteps} steps - possible infinite loop`);
      }
      
      // Add timeout check
      if (Date.now() - startTime > 5000) { // 5 second timeout
        throw new Error('Reduction timeout - computation took too long');
      }
    }
    
    return {
      steps,
      duration: Date.now() - startTime,
      statistics: { ...this.statistics }
    };
  }

  // Method to get current state
  getState() {
    return {
      nodeCount: this.nodes.size,
      activePairs: this.active.size,
      statistics: { ...this.statistics }
    };
  }

  // Method to validate network integrity
  validateNetwork() {
    for (const node of this.nodes) {
      // Check port connections
      for (const port of node.ports) {
        if (port.link && !this.nodes.has(port.link.node)) {
          throw new Error(`Invalid port connection: ${port} linked to deleted node`);
        }
        if (port.link && port.link.link !== port) {
          throw new Error(`Inconsistent port connection: ${port}`);
        }
      }
    }
    return true;
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
  createYCombinator,
  Port,
  Node
};