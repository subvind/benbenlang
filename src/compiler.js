// A minimal functional language compiler targeting interaction nets
const { printNet } = require('../helpers/printNet.js');
const { InteractionNet, NodeType } = require('./vm.js');

// AST node types
const ASTType = {
  LAMBDA: 'LAMBDA',     // Lambda abstraction
  VARIABLE: 'VARIABLE', // Variable reference
  APPLICATION: 'APPLICATION', // Function application
  LET: 'LET',          // Let binding
  NUMBER: 'NUMBER',     // Numeric literal
  BOOLEAN: 'BOOLEAN',   // Boolean literal
  IF: 'IF',            // Conditional
  OPERATOR: 'OPERATOR' // Built-in operators
};

class Parser {
  constructor(code) {
    this.code = code;
    this.pos = 0;
    this.tokens = this.tokenize(code);
    this.current = 0;
  }

  tokenize(code) {
    const tokens = [];
    const regex = /(\(|\)|\\|[a-zA-Z_][a-zA-Z0-9_]*|\d+|->|=|\+|-|\*|\/|==|<=|>=|<|>|if|then|else|true|false|let|in|\s+)/g;
    let match;

    while ((match = regex.exec(code)) !== null) {
      if (!match[0].match(/^\s+$/)) { // Skip whitespace
        tokens.push(match[0]);
      }
    }
    return tokens;
  }

  peek() {
    return this.tokens[this.current];
  }

  consume() {
    return this.tokens[this.current++];
  }

  match(expected) {
    if (this.peek() === expected) {
      this.consume();
      return true;
    }
    return false;
  }

  parseTerm() {
    if (this.match('\\')) {
      // Lambda abstraction
      const param = this.consume();
      this.match('->');
      const body = this.parseTerm();
      return {
        type: ASTType.LAMBDA,
        param,
        body
      };
    } else if (this.match('let')) {
      // Let binding
      const name = this.consume();
      this.match('=');
      const value = this.parseTerm();
      this.match('in');
      const body = this.parseTerm();
      return {
        type: ASTType.LET,
        name,
        value,
        body
      };
    } else if (this.match('if')) {
      // Conditional
      const condition = this.parseTerm();
      this.match('then');
      const thenBranch = this.parseTerm();
      this.match('else');
      const elseBranch = this.parseTerm();
      return {
        type: ASTType.IF,
        condition,
        thenBranch,
        elseBranch
      };
    } else if (this.peek() && this.peek().match(/^\d+$/)) {
      // Number literal
      const left = {
        type: ASTType.NUMBER,
        value: parseInt(this.consume())
      };
      
      // Check for operator
      if (this.peek() && this.peek().match(/^[+\-*\/]$/)) {
        const operator = this.consume();
        const right = this.parseTerm();
        return {
          type: ASTType.APPLICATION,
          func: {
            type: ASTType.OPERATOR,
            operator
          },
          arg: {
            type: ASTType.APPLICATION,
            func: left,
            arg: right
          }
        };
      }

      return left;
    } else if (this.peek() === 'true' || this.peek() === 'false') {
      // Boolean literal
      return {
        type: ASTType.BOOLEAN,
        value: this.consume() === 'true'
      };
    } else if (this.peek() && this.peek().match(/^[+\-*\/]$/)) {
      // Operator
      return {
        type: ASTType.OPERATOR,
        operator: this.consume()
      };
    } else if (this.peek()) {
      // Variable or application
      const left = {
        type: ASTType.VARIABLE,
        name: this.consume()
      };

      // Keep building applications as long as there are more terms
      let result = left;
      while (this.peek() && ![')', 'in', 'then', 'else'].includes(this.peek())) {
        result = {
          type: ASTType.APPLICATION,
          func: result,
          arg: this.parseTerm()
        };
      }

      return result;
    }
    
    throw new Error('Unexpected end of input');
  }

  parse() {
    return this.parseTerm();
  }
}

// Compiler class that converts AST to interaction net
class Compiler {
  constructor(net) {
    this.net = net;
    this.environment = new Map();
  }

  compile(ast) {
    switch (ast.type) {
      case ASTType.LAMBDA:
        return this.compileLambda(ast);
      case ASTType.VARIABLE:
        return this.compileVariable(ast);
      case ASTType.APPLICATION:
        return this.compileApplication(ast);
      case ASTType.LET:
        return this.compileLet(ast);
      case ASTType.NUMBER:
        return this.compileNumber(ast);
      case ASTType.BOOLEAN:
        return this.compileBoolean(ast);
      case ASTType.IF:
        return this.compileIf(ast);
      case ASTType.OPERATOR:
        return this.compileOperator(ast);
      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }

  compileLambda(ast) {
    const lambda = this.net.createLam();
    
    // Save current binding for the parameter
    const oldBinding = this.environment.get(ast.param);
    
    // Bind parameter to the lambda's binding port
    this.environment.set(ast.param, lambda.ports[1]);
    
    // Compile body
    const body = this.compile(ast.body);
    this.net.connect(lambda.ports[0], body.ports[0]);
    
    // Restore old binding
    if (oldBinding) {
      this.environment.set(ast.param, oldBinding);
    } else {
      this.environment.delete(ast.param);
    }
    return lambda;
  }

  compileVariable(ast) {
    const binding = this.environment.get(ast.name);
    if (!binding) {
      throw new Error(`Undefined variable: ${ast.name}`);
    }
    const dup = this.net.createDup();
    this.net.connect(dup.ports[0], binding);
    return dup;
  }
  
  compileApplication(ast) {
    if (ast.func.type === ASTType.OPERATOR) {
      const op = this.compileOperator(ast.func);
      
      // For binary operators like addition
      if (ast.arg.type === ASTType.APPLICATION) {
        // First operand
        const firstArg = this.compile(ast.arg.func);
        this.net.connect(op.ports[1], firstArg.ports[0]);
        
        // Second operand
        const secondArg = this.compile(ast.arg.arg);
        this.net.connect(op.ports[2], secondArg.ports[0]);
      } else {
        // Handle single argument case
        const arg = this.compile(ast.arg);
        this.net.connect(op.ports[1], arg.ports[0]);
      }
      
      return op;
    }

    // Regular application handling (unchanged)
    const app = this.net.createApp();
    const func = this.compile(ast.func);
    const arg = this.compile(ast.arg);
    
    this.net.connect(app.ports[1], func.ports[0]);
    this.net.connect(app.ports[2], arg.ports[0]);
    return app;
  }

  compileLet(ast) {
    const value = this.compile(ast.value);
    const oldBinding = this.environment.get(ast.name);
    this.environment.set(ast.name, value.ports[0]);
    const body = this.compile(ast.body);
    if (oldBinding) {
      this.environment.set(ast.name, oldBinding);
    } else {
      this.environment.delete(ast.name);
    }
    return body;
  }

  compileNumber(ast) {
    const numNode = this.net.createNum(ast.value);
    return numNode;
  }

  compileBoolean(ast) {
    return this.net.createBool(ast.value);
  }

  compileIf(ast) {
    const switch_node = this.net.createSwitch();
    const condition = this.compile(ast.condition);
    const thenBranch = this.compile(ast.thenBranch);
    const elseBranch = this.compile(ast.elseBranch);
    
    this.net.connect(switch_node.ports[0], condition.ports[0]);
    this.net.connect(switch_node.ports[1], thenBranch.ports[0]);
    this.net.connect(switch_node.ports[2], elseBranch.ports[0]);
    
    return switch_node;
  }

  compileOperator(ast) {
    // Map AST operator symbols to internal operation names
    const operatorMap = {
      '+': 'add',
      '-': 'sub',
      '*': 'mul',
      '/': 'div',
      '&&': 'and',
      '||': 'or',
      '!': 'not'
    };

    const operation = operatorMap[ast.operator];
    if (!operation) {
      throw new Error(`Unknown operator: ${ast.operator}`);
    }

    const opNode = this.net.createOp(ast.operator);

    // Initialize metadata for storing operands
    opNode.metadata = {
      operator: operation,
      firstOperand: null
    };
  
    // Create a result port connection
    const resultPort = this.net.createDup();
    this.net.connect(opNode.ports[0], resultPort.ports[0]);

    return opNode;
  }
}

class MinimalLambda {
  constructor() {
    this.net = new InteractionNet();
  }

  compile(code) {
    const parser = new Parser(code);
    const ast = parser.parse();
    const compiler = new Compiler(this.net);
    return compiler.compile(ast);
  }

  run(code, isDebug = true) {
    try {
      const mainNode = this.compile(code);
      this.net.setDebugMode(isDebug); // Enable debugging
      if (this.net.debugMode) {
        console.log('=== BEFORE ====');
        printNet(this.net);
      }
      const result = this.net.normalForm();
      if (this.net.debugMode) {
        console.log('=== AFTER ====');
        printNet(this.net);
        console.log('Reduction statistics:', result);
      }
      return this.extractResult(mainNode, this.net);
    } catch (error) {
      console.error('Error during execution:', error);
      return null;
    }
  }

  extractResult(startNode, net) {
    let visited = new Set();
    let numberNodes = new Set();
    
    // First collect all NUM nodes that are still connected in the network
    for (const node of net.nodes) {
      if (node.type === NodeType.NUM) {
        if (node.ports[0].link || node.ports[0].uplink) {
          numberNodes.add(node);
        }
      }
    }
    
    // If we have no connected numbers, find the most recently created one
    if (numberNodes.size === 0) {
      let highestId = -1;
      let resultNode = null;
      
      for (const node of net.nodes) {
        if (node.type === NodeType.NUM && node._id > highestId) {
          highestId = node._id;
          resultNode = node;
        }
      }
      
      return resultNode ? resultNode.value : null;
    }
    
    // Of the connected numbers, return the most recently created one
    let highestId = -1;
    let resultNode = null;
    
    for (const node of numberNodes) {
      if (node._id > highestId) {
        highestId = node._id;
        resultNode = node;
      }
    }
    
    return resultNode ? resultNode.value : null;
  }
}

module.exports = { MinimalLambda, Parser, Compiler };