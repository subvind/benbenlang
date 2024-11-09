let { InteractionNet } = require('./engine');

// Parser and compiler for lambda calculus to interaction nets
class LambdaCompiler {
  constructor() {
    this.pos = 0;
    this.input = '';
    this.variableScope = new Map();
  }

  // Lexer helper methods
  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  peek() {
    this.skipWhitespace();
    return this.pos < this.input.length ? this.input[this.pos] : null;
  }

  consume() {
    this.skipWhitespace();
    return this.pos < this.input.length ? this.input[this.pos++] : null;
  }

  // Parser methods
  parseVariable() {
    const char = this.consume();
    if (!char || !/[a-zA-Z]/.test(char)) {
      throw new Error(`Expected variable name at position ${this.pos}`);
    }
    return {
      type: 'variable',
      name: char
    };
  }

  parseAbstraction() {
    if (this.consume() !== 'λ' && this.consume() !== '\\') {
      throw new Error(`Expected λ or \\ at position ${this.pos}`);
    }

    const param = this.parseVariable();
    
    if (this.consume() !== '.') {
      throw new Error(`Expected . after parameter at position ${this.pos}`);
    }

    const body = this.parseExpression();

    return {
      type: 'abstraction',
      param: param.name,
      body: body
    };
  }

  parseAtom() {
    const char = this.peek();
    
    if (char === '(') {
      this.consume(); // consume '('
      const expr = this.parseExpression();
      if (this.consume() !== ')') {
        throw new Error(`Expected ) at position ${this.pos}`);
      }
      return expr;
    } else if (char === 'λ' || char === '\\') {
      return this.parseAbstraction();
    } else {
      return this.parseVariable();
    }
  }

  parseApplication() {
    let left = this.parseAtom();
    
    while (this.peek() && this.peek() !== ')') {
      const right = this.parseAtom();
      left = {
        type: 'application',
        func: left,
        arg: right
      };
    }
    
    return left;
  }

  parseExpression() {
    return this.parseApplication();
  }

  parse(input) {
    this.input = input;
    this.pos = 0;
    this.variableScope.clear();
    return this.parseExpression();
  }

  // Compiler methods
  compileToNet(ast, net = new InteractionNet()) {
    switch (ast.type) {
      case 'variable':
        // Look up variable in scope or create new one
        if (!this.variableScope.has(ast.name)) {
          this.variableScope.set(ast.name, net.createVariable());
        }
        return this.variableScope.get(ast.name);

      case 'abstraction':
        const oldVar = this.variableScope.get(ast.param);
        const param = net.createVariable();
        this.variableScope.set(ast.param, param);
        
        const body = this.compileToNet(ast.body, net);
        const abs = net.createAbstraction(param);
        
        // Connect body to abstraction's result port
        net.connect(abs, 1, body, 0);
        
        // Restore old variable binding
        if (oldVar) {
          this.variableScope.set(ast.param, oldVar);
        } else {
          this.variableScope.delete(ast.param);
        }
        
        return abs;

      case 'application':
        const func = this.compileToNet(ast.func, net);
        const arg = this.compileToNet(ast.arg, net);
        return net.createApplication(func, arg);

      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }

  // Main compilation method
  compile(input) {
    const ast = this.parse(input);
    const net = new InteractionNet();
    this.compileToNet(ast, net);
    return net;
  }
}


module.exports = {
  LambdaCompiler
}