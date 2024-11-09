// Basic building blocks for interaction nets
class Port {
  constructor(node, index) {
    this.node = node;      
    this.index = index;    
    this.connected = null; 
  }

  connect(other) {
    if (other === null) {
      if (this.connected) {
        this.connected.connected = null;
      }
      this.connected = null;
      return;
    }
    this.connected = other;
    other.connected = this;
  }

  disconnect() {
    if (this.connected) {
      const other = this.connected;
      this.connected = null;
      other.connected = null;
      return other;
    }
    return null;
  }
}

class Node {
  constructor(type, numPorts) {
    this.type = type;
    this.ports = Array(numPorts).fill(null).map((_, i) => new Port(this, i));
    this.active = false;
  }

  connect(portIndex, otherNode, otherPortIndex) {
    if (!otherNode) return;
    this.ports[portIndex].connect(otherNode.ports[otherPortIndex]);
  }
}

class Application extends Node {
  constructor() {
    super('application', 3); // function, argument, result ports
  }
}

class Abstraction extends Node {
  constructor() {
    super('abstraction', 2); // body and result ports
  }
}

class Variable extends Node {
  constructor() {
    super('variable', 1); // single connection port
  }
}

class InteractionNet {
  constructor() {
    this.nodes = new Set();
    this.activeNodes = new Set();
  }

  addNode(node) {
    this.nodes.add(node);
    return node;
  }

  removeNode(node) {
    // First disconnect all ports
    node.ports.forEach(port => port.disconnect());
    this.nodes.delete(node);
    this.activeNodes.delete(node);
  }

  createApplication(func, arg) {
    const app = this.addNode(new Application());
    if (func) this.connect(app, 0, func, 0);
    if (arg) this.connect(app, 1, arg, 0);
    return app;
  }

  createAbstraction(body) {
    const abs = this.addNode(new Abstraction());
    if (body) this.connect(abs, 0, body, 0);
    return abs;
  }

  createVariable() {
    return this.addNode(new Variable());
  }

  connect(node1, port1, node2, port2) {
    if (!node1 || !node2) return;
    node1.connect(port1, node2, port2);
    this.activateNode(node1);
    this.activateNode(node2);
  }

  activateNode(node) {
    if (node) {
      node.active = true;
      this.activeNodes.add(node);
    }
  }

  // Main reduction step
  reduce() {
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    while (this.activeNodes.size > 0 && iterations < maxIterations) {
      const node = this.activeNodes.values().next().value;
      this.activeNodes.delete(node);
      node.active = false;

      if (!this.nodes.has(node)) continue; 

      if (node instanceof Application) {
        const funcPort = node.ports[0].connected;
        if (funcPort && funcPort.node instanceof Abstraction) {
          this.reduceApplicationAbstraction(node, funcPort.node);
        }
      }

      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Maximum reduction iterations reached');
    }
  }

  // Reduction rules
  reduceApplicationAbstraction(app, abs) {
    // Get the argument and bound variable before disconnecting
    const arg = app.ports[1].connected;  // y
    const boundVar = abs.ports[0].connected;  // x

    if (arg && boundVar) {
      // Store the nodes before disconnecting
      const argNode = arg.node;
      const boundVarNode = boundVar.node;

      // First disconnect all ports but preserve the nodes
      app.ports[0].disconnect();  // app from abs
      app.ports[1].disconnect();  // arg from app
      abs.ports[0].disconnect();  // boundVar from abs

      // Connect argument to bound variable
      this.connect(argNode, 0, boundVarNode, 0);
    }

    // Remove the application and abstraction nodes
    this.removeNode(app);
    this.removeNode(abs);
  }

  toString() {
    let result = 'Interaction Net:\n';
    for (const node of this.nodes) {
      result += `${node.type}: `;
      for (let i = 0; i < node.ports.length; i++) {
        const connected = node.ports[i].connected;
        result += connected ? `[${connected.node.type}:${connected.index}] ` : '[free] ';
      }
      result += '\n';
    }
    return result;
  }
}

module.exports = {
  InteractionNet
};
