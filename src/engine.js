/**
 * program a distributed & parallel javascript syntax like programming 
 * language in node.js using worker threads and lambda calc interaction nets
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Data structures for interaction nets
class Port {
    constructor(node, index) {
        this.node = node;
        this.index = index;
        this.connected = null;
    }

    connect(other) {
        this.connected = other;
        other.connected = this;
    }

    disconnect() {
        if (this.connected) {
            const other = this.connected;
            this.connected = null;
            other.connected = null;
        }
    }

    toJSON() {
        return {
            nodeId: this.node.id,
            index: this.index,
            connectedNodeId: this.connected ? this.connected.node.id : null,
            connectedPortIndex: this.connected ? this.connected.index : null
        };
    }
}

class Node {
    constructor(symbol, arity) {
        this.symbol = symbol;
        this.ports = Array(arity).fill(null).map((_, i) => new Port(this, i));
        this.id = Node.nextId++;  // Add unique ID to each node
    }

    static nextId = 0;

    toJSON() {
        return {
            id: this.id,
            symbol: this.symbol,
            ports: this.ports.map(p => p.toJSON())
        };
    }
}

// Lambda calculus terms
class Term {
    constructor(type) {
        this.type = type;
    }

    toNet() {
        throw new Error('Abstract method');
    }

    toString() {
        throw new Error('Abstract method');
    }
}

class Variable extends Term {
    constructor(name) {
        super('variable');
        this.name = name;
    }

    toNet() {
        return new Node('var', 1);
    }

    toString() {
        return this.name;
    }
}

class Application extends Term {
    constructor(func, arg) {
        super('application');
        this.func = func;
        this.arg = arg;
    }

    toNet() {
        const app = new Node('app', 3);
        const funcNet = this.func.toNet();
        const argNet = this.arg.toNet();
        app.ports[1].connect(funcNet.ports[0]);
        app.ports[2].connect(argNet.ports[0]);
        return app;
    }

    toString() {
        return `(${this.func.toString()} ${this.arg.toString()})`;
    }
}

class Abstraction extends Term {
    constructor(param, body) {
        super('abstraction');
        this.param = param;
        this.body = body;
    }

    toNet() {
        const abs = new Node('abs', 2);
        const bodyNet = this.body.toNet();
        abs.ports[1].connect(bodyNet.ports[0]);
        return abs;
    }

    toString() {
        return `(λ${this.param}.${this.body.toString()})`;
    }
}

// Parallel reduction engine
class ReductionEngine {
    constructor() {
        this.workers = new Map();
        this.nextWorkerId = 0;
    }

    serializeNet(net) {
        const nodes = new Map();
        const visited = new Set();

        const collectNodes = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);
            nodes.set(node.id, node.toJSON());

            for (const port of node.ports) {
                if (port.connected) {
                    collectNodes(port.connected.node);
                }
            }
        };

        collectNodes(net);
        return Array.from(nodes.values());
    }

    async createWorker() {
        const worker = new Worker(`
            const { parentPort } = require('worker_threads');
            
            class Port {
                constructor(node, index) {
                    this.node = node;
                    this.index = index;
                    this.connected = null;
                }

                connect(other) {
                    this.connected = other;
                    other.connected = this;
                }

                disconnect() {
                    if (this.connected) {
                        const other = this.connected;
                        this.connected = null;
                        other.connected = null;
                    }
                }
            }

            class Node {
                constructor(symbol, arity) {
                    this.symbol = symbol;
                    this.ports = Array(arity).fill(null).map((_, i) => new Port(this, i));
                    this.id = Node.nextId++;
                }

                static nextId = 0;
            }

            function deserializeNet(nodesData) {
                const nodes = new Map();
                
                // First pass: create all nodes
                for (const nodeData of nodesData) {
                    const node = new Node(nodeData.symbol, nodeData.ports.length);
                    node.id = nodeData.id;
                    nodes.set(node.id, node);
                }

                // Second pass: connect ports
                for (const nodeData of nodesData) {
                    const node = nodes.get(nodeData.id);
                    for (let i = 0; i < nodeData.ports.length; i++) {
                        const portData = nodeData.ports[i];
                        if (portData.connectedNodeId !== null) {
                            const connectedNode = nodes.get(portData.connectedNodeId);
                            node.ports[i].connect(connectedNode.ports[portData.connectedPortIndex]);
                        }
                    }
                }

                // Return the root node (lowest ID)
                return nodes.get(Math.min(...nodes.keys()));
            }

            function reduce(net) {
                const redexes = findRedexes(net);
                if (redexes.length === 0) return net;

                for (const redex of redexes) {
                    reduceRedex(redex);
                }

                return net;
            }

            function findRedexes(net) {
                const redexes = [];
                const visited = new Set();

                function visit(node) {
                    if (visited.has(node.id)) return;
                    visited.add(node.id);

                    if (node.symbol === 'app' && node.ports[1].connected?.node.symbol === 'abs') {
                        redexes.push(node);
                    }

                    for (const port of node.ports) {
                        if (port.connected) {
                            visit(port.connected.node);
                        }
                    }
                }

                visit(net);
                return redexes;
            }

            function reduceRedex(redex) {
                const app = redex;
                const abs = app.ports[1].connected.node;
                const arg = app.ports[2].connected.node;

                // Connect argument to variable occurrences
                const body = abs.ports[1].connected.node;
                if (body.symbol === 'var') {
                    const mainPort = app.ports[0].connected;
                    if (mainPort) {
                        arg.ports[0].connect(mainPort);
                    }
                    app.ports.forEach(p => p.disconnect());
                    abs.ports.forEach(p => p.disconnect());
                }
                // Handle other cases if needed
            }

            function serializeResult(net) {
                const nodes = new Map();
                const visited = new Set();

                function collectNodes(node) {
                    if (visited.has(node.id)) return;
                    visited.add(node.id);

                    const nodeData = {
                        id: node.id,
                        symbol: node.symbol,
                        ports: node.ports.map(p => ({
                            nodeId: node.id,
                            index: p.index,
                            connectedNodeId: p.connected ? p.connected.node.id : null,
                            connectedPortIndex: p.connected ? p.connected.index : null
                        }))
                    };
                    nodes.set(node.id, nodeData);

                    for (const port of node.ports) {
                        if (port.connected) {
                            collectNodes(port.connected.node);
                        }
                    }
                }

                collectNodes(net);
                return Array.from(nodes.values());
            }

            parentPort.on('message', ({ nodes }) => {
                try {
                    const net = deserializeNet(nodes);
                    const reducedNet = reduce(net);
                    const result = serializeResult(reducedNet);
                    parentPort.postMessage({ success: true, result });
                } catch (error) {
                    parentPort.postMessage({ 
                        success: false, 
                        error: error.message 
                    });
                }
            });
        `, { eval: true });

        const id = this.nextWorkerId++;
        this.workers.set(id, worker);
        return id;
    }

    
    // Helper function to serialize a node and its connections with cycle detection
    serializeNode(node, visited = new Set()) {
        if (visited.has(node.id)) {
            return null;
        }
        visited.add(node.id);

        return {
            id: node.id,
            symbol: node.symbol,
            ports: node.ports.map(port => ({
                connectedToId: port.connected ? port.connected.node.id : null,
                connectedToPort: port.connected ? port.connected.index : null
            }))
        };
    }

    // Helper function to check if a redex can be reduced
    canReduce(redex) {
        return redex.symbol === 'app' && 
            redex.ports[1].connected?.node.symbol === 'abs';
    }

    // Helper function to copy a subnet with proper cycle detection
    copySubnet(node, nodeMap, visited = new Set()) {
        // If we've already copied this node in this reduction, return the existing copy
        if (nodeMap.has(node.id)) {
            return nodeMap.get(node.id);
        }
        
        // If we've visited this node in this copy operation, we have a cycle
        if (visited.has(node.id)) {
            throw new Error('Cycle detected during copy operation');
        }
        
        visited.add(node.id);
        
        // Create new node and store it in the map immediately to handle cycles
        const copy = new Node(node.symbol, node.ports.length);
        nodeMap.set(node.id, copy);
        
        // Copy all connections
        for (let i = 0; i < node.ports.length; i++) {
            const port = node.ports[i];
            if (port.connected) {
                const connectedCopy = copySubnet(port.connected.node, nodeMap, visited);
                copy.ports[i].connect(connectedCopy.ports[port.connected.index]);
            }
        }
        
        return copy;
    }

    // Helper function to substitute argument with proper cycle detection
    substituteArg(node, arg, nodeMap, visited = new Set()) {
        // If we've already processed this node, return immediately
        if (visited.has(node.id)) {
            return;
        }
        
        visited.add(node.id);
        
        // Handle variable nodes
        if (node.symbol === 'var') {
            const argCopy = copySubnet(arg, nodeMap, new Set());
            node.ports[0].connect(argCopy.ports[0]);
            return;
        }
        
        // Recursively process connected nodes
        for (const port of node.ports) {
            if (port.connected) {
                substituteArg(port.connected.node, arg, nodeMap, visited);
            }
        }
    }
    
    async reduce(term) {
        console.log('Input term:', term.toString());
        
        // Convert term to net
        const net = term.toNet();
        
        // Serialize net
        const serializedNet = this.serializeNet(net);
        
        // Create worker
        const workerId = await this.createWorker();
        const worker = this.workers.get(workerId);
        
        try {
            // Run reduction
            const result = await new Promise((resolve, reject) => {
                worker.on('message', msg => {
                    if (msg.success) {
                        resolve(msg.result);
                    } else {
                        reject(new Error(msg.error));
                    }
                });
                
                worker.on('error', reject);
                
                worker.postMessage({ nodes: serializedNet });
            });

            // Deserialize and convert result back to term
            const resultTerm = this.reconstructTerm(result);
            return resultTerm;
            
        } finally {
            worker.terminate();
            this.workers.delete(workerId);
        }
    }

    reconstructTerm(nodesData) {
        const nodes = new Map();
        
        // Recreate nodes
        for (const nodeData of nodesData) {
            const node = new Node(nodeData.symbol, nodeData.ports.length);
            node.id = nodeData.id;
            nodes.set(node.id, node);
        }

        // Connect ports
        for (const nodeData of nodesData) {
            const node = nodes.get(nodeData.id);
            for (let i = 0; i < nodeData.ports.length; i++) {
                const portData = nodeData.ports[i];
                if (portData.connectedNodeId !== null) {
                    const connectedNode = nodes.get(portData.connectedNodeId);
                    node.ports[i].connect(connectedNode.ports[portData.connectedPortIndex]);
                }
            }
        }

        // Convert net back to term
        const rootNode = nodes.get(Math.min(...nodes.keys()));
        return this.netToTerm(rootNode);
    }

    netToTerm(node, visited = new Set()) {
        if (visited.has(node.id)) {
            return new Variable('_cycle_');
        }
        visited.add(node.id);

        switch (node.symbol) {
            case 'var':
                return new Variable('y'); // After reduction, this represents the original argument
            case 'abs':
                const body = node.ports[1].connected?.node;
                if (!body) return new Abstraction('x', new Variable('_error_'));
                return new Abstraction('x', this.netToTerm(body, visited));
            case 'app':
                const func = node.ports[1].connected?.node;
                const arg = node.ports[2].connected?.node;
                if (!func || !arg) return new Application(new Variable('_error_'), new Variable('_error_'));
                return new Application(
                    this.netToTerm(func, visited),
                    this.netToTerm(arg, visited)
                );
            default:
                return new Variable('_unknown_');
        }
    }

    findRedexes(net) {
        const redexes = [];
        const visited = new Set();

        const visit = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);

            if (this.canReduce(node)) {
                redexes.push(node);
            }

            for (const port of node.ports) {
                if (port.connected) {
                    visit(port.connected.node);
                }
            }
        };

        visit(net);
        return redexes;
    }

    mergeResults(originalNet, results) {
        const nodeMap = new Map();
        
        // First pass: create all new nodes
        for (const result of results) {
            for (const nodeData of result.nodes) {
                if (!nodeMap.has(nodeData.id)) {
                    const node = new Node(nodeData.symbol, nodeData.ports.length);
                    nodeMap.set(nodeData.id, node);
                }
            }
        }
        
        // Second pass: connect ports
        for (const result of results) {
            for (const nodeData of result.nodes) {
                const node = nodeMap.get(nodeData.id);
                nodeData.ports.forEach((portData, index) => {
                    if (portData.connectedToId !== null) {
                        const connectedNode = nodeMap.get(portData.connectedToId);
                        if (connectedNode) {
                            node.ports[index].connect(connectedNode.ports[portData.connectedToPort]);
                        }
                    }
                });
            }
        }
        
        return Array.from(nodeMap.values())[0] || originalNet;
    }

    rebuildNet(originalNet, updates) {
        // Implement network rebuilding logic
        const newNet = structuredClone(originalNet);
        
        for (const [nodeId, update] of updates.entries()) {
            this.updateNode(newNet, nodeId, update);
        }
        
        return newNet;
    }

    updateNode(net, nodeId, update) {
        // Implement node updating logic
        const node = this.findNodeById(net, nodeId);
        if (!node) return;

        node.symbol = update.symbol;
        node.ports = update.ports.map((portData, i) => {
            const port = new Port(node, i);
            if (portData.connected) {
                const connectedNode = this.findNodeById(net, portData.connected.nodeId);
                if (connectedNode) {
                    port.connect(connectedNode.ports[portData.connected.portIndex]);
                }
            }
            return port;
        });
    }

    findNodeById(net, nodeId) {
        // Implement node finding logic
        const visited = new Set();
        
        function search(node) {
            if (visited.has(node)) return null;
            visited.add(node);

            if (node.id === nodeId) return node;

            for (const port of node.ports) {
                if (port.connected) {
                    const found = search(port.connected.node);
                    if (found) return found;
                }
            }

            return null;
        }

        return search(net);
    }
}

// Example usage
async function main() {
    const engine = new ReductionEngine();
    
    // Create a sample term: (λx.x) y
    const term = new Application(
        new Abstraction('x', new Variable('x')),
        new Variable('y')
    );
    
    const result = await engine.reduce(term);
    console.log('Reduced term:', result);
}

if (isMainThread) {
    main().catch(console.error);
}

module.exports = {
    Term,
    Variable,
    Application,
    Abstraction,
    ReductionEngine
};
