// A minimal functional language compiler targeting interaction nets
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

// Parser for our minimal language
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
    } else if (this.peek().match(/^\d+$/)) {
      // Number literal
      return {
        type: ASTType.NUMBER,
        value: parseInt(this.consume())
      };
    } else if (this.peek() === 'true' || this.peek() === 'false') {
      // Boolean literal
      return {
        type: ASTType.BOOLEAN,
        value: this.consume() === 'true'
      };
    } else if (this.peek().match(/^[+\-*\/]$/)) {
      // Operator
      return {
        type: ASTType.OPERATOR,
        operator: this.consume()
      };
    } else {
      // Variable or application
      const term = {
        type: ASTType.VARIABLE,
        name: this.consume()
      };

      // Check for application
      if (this.peek() && ![')', 'in', 'then', 'else'].includes(this.peek())) {
        return {
          type: ASTType.APPLICATION,
          func: term,
          arg: this.parseTerm()
        };
      }

      return term;
    }
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
    
    // Create duplicator for variable use
    const dup = this.net.createDup();
    this.net.connect(dup.ports[0], binding);
    return dup;
  }

  compileApplication(ast) {
    const app = this.net.createApp();
    const func = this.compile(ast.func);
    const arg = this.compile(ast.arg);
    
    this.net.connect(app.ports[1], func.ports[0]);
    this.net.connect(app.ports[2], arg.ports[0]);
    
    return app;
  }

  compileLet(ast) {
    // Compile the value
    const value = this.compile(ast.value);
    
    // Save current binding for the name
    const oldBinding = this.environment.get(ast.name);
    
    // Bind name to the value
    this.environment.set(ast.name, value.ports[0]);
    
    // Compile body
    const body = this.compile(ast.body);
    
    // Restore old binding
    if (oldBinding) {
      this.environment.set(ast.name, oldBinding);
    } else {
      this.environment.delete(ast.name);
    }
    
    return body;
  }

  compileNumber(ast) {
    return this.net.createNum(ast.value);
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
    // Create specific operator nodes based on the operator type
    switch(ast.operator) {
      case '+':
        return this.net.createOp('add');
      case '-':
        return this.net.createOp('sub');
      case '*':
        return this.net.createOp('mul');
      case '/':
        return this.net.createOp('div');
      default:
        throw new Error(`Unknown operator: ${ast.operator}`);
    }
  }
}

// Main interface to compile and run programs
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

  run(code) {
    const mainNode = this.compile(code);
    this.net.normalForm();
    return this.extractResult(mainNode);
  }

  extractResult(node) {
    // Follow connections to find the final result node
    let current = node;
    while (current && current.ports[0] && current.ports[0].link) {
      current = current.ports[0].link.node;
    }

    if (!current) return null;

    // Extract value based on node type
    switch (current.type) {
      case NodeType.NUM:
        return current.value;
      case NodeType.BOOL:
        return current.value;
      case NodeType.LAM:
        return '<function>';
      default:
        // For debugging
        console.error('Unexpected result node type:', current.type);
        return null;
    }
  }
}

module.exports = { MinimalLambda, Parser, Compiler };