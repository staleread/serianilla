import { Logger } from '../../log/logger';
import { Token, TokenType } from '../lexer/lexer.types';
import { AstNode, AstNodeType } from './parser.types';

export class Parser {
  private index = 0;
  private isError = false;

  constructor(
    private readonly root: AstNode,
    private readonly tokens: Token[],
    private readonly logger: Logger,
  ) {}

  private static getExpectedTokenByNode(nodeType: AstNodeType): TokenType {
    switch (nodeType) {
      case 'Bt':
        return 'id';
      case 'Cp':
        return 'comp';
      case 'Mp':
        return '$map';
      case 'If':
        return '$if';
      case 'Gt':
        return '$tag';
      case 'Gc':
        return '$cmp';
      case 'Ij':
        return '$inject';
      default:
        return 'ILLEGAL';
    }
  }

  public run(): boolean {
    this.parseText([]);

    if (this.token().type !== '<') {
      this.logUnexpectedToken('<');
      this.panicJumpOver('<');
      this.index--;
    }

    this.parseTag(this.root.children);

    var child = this.root.children[0];

    if (child && child.type !== 'Bt') {
      this.isError = true;
      this.logger.error(child.pos, 'The root tag should be a basic tag');
    }
    this.parseText([]);

    if (this.token().type !== 'eof') {
      this.isError = true;
      this.logger.error(
        this.token().pos,
        'Templete cannot contain more than one root tag',
      );
    }
    return !this.isError;
  }

  private parseTag(dest: AstNode[]): void {
    this.index++;
    this.skipComments();

    switch (this.token().type) {
      case 'id':
        return this.parseBasicTag(dest);
      case 'comp':
        return this.parseCompTag(dest);
      case '$map':
        return this.parseMapCmd(dest);
      case '$if':
        return this.parseIfCmd(dest);
      case '$tag':
        return this.parseTagCmd(dest);
      case '$cmp':
        return this.parseCompCmd(dest);
      case '$inject':
        return this.parseInjectCmd(dest);
      default:
        this.logUnexpectedToken();
        return this.panicJumpOver('>');
    }
  }

  private parseBasicTag(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Bt',
      id: undefined,
      pos: this.token().pos,
      attrs: [],
      events: [],
      children: [],
    };

    dest.push(node);
    this.parseTagId(node);
    this.parseTagAttrs(node);
    this.parseTagChildren(node);
  }

  private parseCompTag(dest: AstNode[]): void {
    var node: AstNode = {
      id: undefined,
      type: 'Cp',
      pos: this.token().pos,
      props: [],
      children: [],
    };

    dest.push(node);
    this.parseTagId(node);
    this.parseTagAttrs(node);
    this.parseTagChildren(node);

    for (var tag of node.children) {
      if (!['Cp', 'Gc', 'Tx'].includes(tag.type)) {
        this.isError = true;
        this.logger.error(
          tag.pos,
          'Component tag only accepts component children',
        );
      }
    }

    node.children = node.children.filter((c: AstNode) =>
      ['Cp', 'Gc'].includes(c.type),
    );

    if (node.children.length > 1) {
      this.isError = true;
      this.logger.error(
        node.children[1].pos,
        'Component tag may have maximum one child',
      );
    }
  }

  private parseMapCmd(dest: AstNode[]): void {
    const context: AstNode = { type: 'Mx' };

    var node: AstNode = {
      type: 'Mp',
      pos: this.token().pos,
      context,
      children: [],
    };

    dest.push(node);
    this.parseMapContext(context);
    this.parseTagChildren(node);

    node.children = node.children.filter((c: AstNode) => c.type !== 'Tx');

    if (node.children.length < 1) {
      this.isError = true;
      this.logger.error(node.pos, 'Map must have one child tag');
      return;
    }
    if (node.children.length > 1) {
      this.isError = true;
      this.logger.error(
        node.children[1].pos,
        'Map must have only one child tag',
      );
      return;
    }
  }

  private parseIfCmd(dest: AstNode[]): void {
    const condition: AstNode = { type: 'Ic' };

    var node: AstNode = {
      type: 'If',
      pos: this.token().pos,
      condition,
      children: [],
    };

    dest.push(node);
    this.parseIfCondition(condition);
    this.parseTagChildren(node);

    var FORBIDDEN_TAGS = ['Mp', 'If', 'Gt', 'Gc'];

    for (var tag of node.children) {
      if (FORBIDDEN_TAGS.includes(tag.type)) {
        this.isError = true;
        this.logger.error(
          tag.pos,
          'This command tag is not allowed as If cmd child tag',
        );
      }
    }

    node.children = node.children.filter((c: AstNode) =>
      ['Bt', 'Cp'].includes(c.type),
    );

    if (node.children.length < 1) {
      this.isError = true;
      this.logger.error(node.pos, 'If cmd must have one child tag');
      return;
    }
    if (node.children.length > 1) {
      this.isError = true;
      this.logger.error(
        node.children[1].pos,
        'The If command may have maximum one child tag',
      );
    }
  }

  private parseTagCmd(dest: AstNode[]): void {
    var context: AstNode = { type: 'Cx' };

    var node: AstNode = {
      type: 'Gt',
      pos: this.token().pos,
      context,
      attrs: [],
      events: [],
      children: [],
    };

    dest.push(node);
    this.parseTagId(node);
    this.parseContext(node.context);
    this.parseTagAttrs(node);
    this.parseTagChildren(node);
  }

  private parseCompCmd(dest: AstNode[]): void {
    var context: AstNode = { type: 'Cx' };

    var node: AstNode = {
      type: 'Gc',
      pos: this.token().pos,
      context,
      props: [],
      children: [],
    };

    dest.push(node);
    this.parseTagId(node);
    this.parseContext(node.context);
    this.parseTagAttrs(node);
    this.parseTagChildren(node);

    for (var tag of node.children) {
      if (!['Cp', 'Gc', 'Tx'].includes(tag.type)) {
        this.isError = true;
        this.logger.error(
          tag.pos,
          'Generic component tag only accepts component children',
        );
      }
    }

    node.children = node.children.filter((c: AstNode) =>
      ['Cp', 'Gc'].includes(c.type),
    );

    if (node.children.length > 1) {
      this.isError = true;
      this.logger.error(
        node.children[1].pos,
        'Generic component tag may have maximum one child',
      );
    }
  }

  private parseInjectCmd(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Ij',
      pos: this.token().pos,
      props: [],
      children: [],
    };

    dest.push(node);
    this.parseTagId(node);
    this.parseTagAttrs(node);
    this.parseTagChildren(node);

    if (node.children.length > 0) {
      this.isError = true;
      this.logger.error(
        node.children[0].pos,
        'Inject command must not have any children',
      );
      return;
    }
  }

  private parseTagId(node: AstNode): void {
    var expectedType = Parser.getExpectedTokenByNode(node.type);

    if (this.token().type !== expectedType) {
      this.isError = true;
      this.logger.error(
        this.token().pos,
        `Expected ${expectedType} opening tag, got ${this.token().type}`,
      );
      return this.panic();
    }

    if (['Bt', 'Cp'].includes(node.type)) {
      node.id = {
        pos: this.token().pos,
        str: this.token().literal!,
      };
    }
    this.index++;
    this.skipComments();
  }

  private parseTagAttrs(node: AstNode): void {
    while (!'eof/>'.includes(this.token().type)) {
      switch (this.token().type) {
        case 'id':
          if (node.attrs) {
            this.parseStringAttr(node.attrs);
            continue;
          }
          this.isError = true;
          this.logger.error(
            this.token().pos,
            'String attribute is not allowed here',
          );
          this.parseStringAttr([]);
          continue;
        case 'event':
          if (node.attrs) {
            this.parseEventAttr(node.attrs);
            this.validateLastEvent(node);
            continue;
          }
          this.isError = true;
          this.logger.error(
            this.token().pos,
            'Event attribute is not allowed here',
          );
          this.parseEventAttr([]);
          continue;
        case 'prop':
          if (node.props) {
            this.parseProp(node.props);
            continue;
          }
          this.isError = true;
          this.logger.error(
            this.token().pos,
            'Property is not allowed here',
          );
          this.parseProp([]);
          continue;
        case 'spread':
          if (node.props) {
            this.parseSpreadProp(node.props);
            continue;
          }
          this.isError = true;
          this.logger.error(
            this.token().pos,
            'Spread property is not allowed here',
          );
          this.parseSpreadProp([]);
          continue;
        case 'comment':
          this.index++;
          continue;
        default:
          this.logUnexpectedToken();
          this.index++;
          continue;
      }
    }
  }

  private parseTagChildren(node: AstNode): void {
    if (this.token().type === 'eof') {
      return;
    }
    if (this.token().type === '/') {
      this.index++;
      this.skipComments();

      if (this.token().type !== '>') {
        this.logUnexpectedToken('>');
        return this.panicJumpOver('>');
      }
      this.index++;
      return;
    }
    this.index++;
    this.parseText(node.children);

    if (this.token().type !== '<') {
      this.logUnexpectedToken('<');
      this.panicJumpOver('<');
      this.index--;
    }
    this.index++;
    this.skipComments();

    while (!'eof/'.includes(this.token().type)) {
      this.index--;

      this.parseTag(node.children);
      this.parseText(node.children);

      if (this.token().type === 'eof') {
        this.isError = true;
        this.logger.error(node.pos, 'The tag is never closed');
        return;
      }

      if (this.token().type !== '<') {
        this.logUnexpectedToken('<');
        this.panicJumpOver('<');
        this.index--;
      }
      this.index++;
      this.skipComments();
    }
    if (this.token().type === 'eof') {
      this.isError = true;
      this.logger.error(node.pos, 'The tag is never closed');
      return;
    }
    this.index++;
    this.skipComments();

    const tags = ['id', 'comp', '$map', '$if', '$tag', '$comp'];

    if (!tags.includes(this.token().type)) {
      this.logUnexpectedToken();
      return this.panicJumpOver('>');
    }

    var expectedType = Parser.getExpectedTokenByNode(node.type);

    if (this.token().type !== expectedType) {
      this.isError = true;
      this.logger.error(
        this.token().pos,
        `Expected ${expectedType} closing tag, got ${this.token().type}`,
      );
    } else if (this.token().literal !== node.id?.str) {
      this.isError = true;
      this.logger.error(
        this.token().pos,
        'Opening and closing tags do not match',
      );
    }
    this.index++;
    this.skipComments();

    if (this.token().type !== '>') {
      this.logUnexpectedToken('>');
      return this.panicJumpOver('>');
    }
    this.index++;
  }

  private parseMapContext(context: AstNode): void {
    this.index++;
    this.skipComments();

    if (this.token().type !== '{') {
      this.logUnexpectedToken('{');
      return this.panic();
    }
    this.parseVar(context);
    this.skipComments();

    if (this.token().type !== '$as') {
      this.logUnexpectedToken('$as');
      return this.panic();
    }

    this.index++;
    this.skipComments();

    if (this.token().type !== 'prop') {
      this.logUnexpectedToken('prop');
      return this.panic();
    }

    context.alias = {
      pos: this.token().pos,
      str: this.token().literal!,
    };

    this.index++;
    this.skipComments();

    if (this.token().type !== '>') {
      this.logUnexpectedToken('>');
      return this.panic();
    }
  }

  private parseIfCondition(condition: AstNode): void {
    this.index++;
    this.skipComments();

    condition.shouldNegate = this.token().type === '$not';

    if (condition.shouldNegate) {
      this.index++;
      this.skipComments();
    }

    if (this.token().type !== '{') {
      this.logUnexpectedToken('{');
      return this.panic();
    }
    this.parseVar(condition);
    this.skipComments();

    if (this.token().type !== '>') {
      this.logUnexpectedToken('>');
      return this.panic();
    }
  }

  private parseContext(context: AstNode): void {
    if (this.token().type !== '{') {
      this.logUnexpectedToken('{');
      return this.panic();
    }
    this.parseVar(context);
    this.skipComments();

    if (this.token().type !== '$with') {
      this.logUnexpectedToken('$with');
      return this.panic();
    }

    this.index++;
    this.skipComments();
  }

  private parseStringAttr(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Sa',
    };

    node.id = {
      pos: this.token().pos,
      str: this.token().literal,
    };
    this.index++;

    if (this.token().type !== '=') {
      this.logUnexpectedToken('=');
      return this.panic();
    }
    this.index++;

    if (this.token().type !== '"') {
      this.logUnexpectedToken('"');
      return this.panic();
    }
    this.parseStringLiteral(node);

    dest.push(node);
  }

  private parseEventAttr(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Ea',
    };

    node.id = {
      pos: this.token().pos,
      str: this.token().literal,
    };
    this.index++;

    if (this.token().type !== '=') {
      this.logUnexpectedToken('=');
      return this.panic();
    }
    this.index++;

    if (this.token().type !== '{') {
      this.logUnexpectedToken('{');
      return this.panic();
    }
    this.parseVar(node);

    dest.push(node);
  }

  private parseProp(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Pr',
    };

    node.id = {
      pos: this.token().pos,
      str: this.token().literal,
    };
    this.index++;

    if (this.token().type !== '=') {
      this.logUnexpectedToken('=');
      return this.panic();
    }
    this.index++;

    switch (this.token().type) {
      case '{':
        this.parseVar(node);
        break;
      case '"':
        this.parseStringLiteral(node);
        break;
      default:
        this.logUnexpectedToken();
        return this.panic();
    }
    dest.push(node);
  }

  private parseSpreadProp(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Sp',
    };

    this.index++;
    if (this.token().type !== '=') {
      this.logUnexpectedToken('=');
      return this.panic();
    }
    this.index++;

    if (this.token().type !== '{') {
      this.logUnexpectedToken('{');
      return this.panic();
    }
    this.parseVar(node);

    dest.push(node);
  }

  private parseVar(parent: AstNode): void {
    var node: AstNode = {
      type: 'Vr',
      vids: [],
    };

    do {
      this.index++;
      if (this.token().type !== 'vid') {
        this.logUnexpectedToken('vid');
        return this.panic();
      }

      node.vids.push({
        pos: this.token().pos,
        str: this.token().literal,
      });
      this.index++;
    } while (this.token().type === 'dot');

    if (this.token().type !== '}') {
      this.logUnexpectedToken('}');
      return this.panic();
    }
    this.index++;
    parent.value = node;
  }

  private parseText(dest: AstNode[]): void {
    var node: AstNode = {
      type: 'Tx',
      chunks: [],
    };

    while (this.tryParseChunk(node) || this.trySkipCommentTag()) {}

    if (node.chunks.length > 0) {
      dest.push(node);
    }
  }

  private parseStringLiteral(parent: AstNode): void {
    var node: AstNode = {
      type: 'Sl',
      chunks: [],
    };

    this.index++;
    while (this.tryParseChunk(node)) {}

    if (this.token().type !== '"') {
      this.logUnexpectedToken('"');
      return this.panic();
    }
    this.index++;
    parent.strValue = node;
  }

  private validateLastEvent(node: AstNode): void {
    const eventId = node.attrs.at(-1).id;
    const ALLOWED_EVENTS = ['click', 'submit', 'change', 'input'];

    if (!ALLOWED_EVENTS.includes(eventId.str)) {
      this.isError = true;
      return this.logger.error(eventId.pos, 'Unknown event');
    }

    if (['change', 'input'].includes(eventId.str) &&
      node.id.str !== 'input') {
      this.isError = true;
      return this.logger.error(
        eventId.pos,
        'The event is only supported by \'input\' tags'
      );
    }
  }

  private tryParseChunk(parent: AstNode): boolean {
    var node: AstNode = {
      type: 'Ch',
    };

    switch (this.token().type) {
      case 'str':
        node.str = this.token().literal;
        node.pos = this.token().pos;
        this.index++;
        break;
      case '{':
        this.parseVar(node);
        break;
      default:
        return false;
    }
    parent.chunks.push(node);
    return true;
  }

  private trySkipCommentTag(): boolean {
    var tmpIndex = this.index;

    if (this.token().type !== '<') {
      return false;
    }
    this.index++;

    if (this.token().type !== 'comment') {
      this.index--;
      return false;
    }
    while (this.token().type === 'comment') {
      this.index++;
    }

    if (this.token().type !== '>') {
      this.index = tmpIndex;
      return false;
    }
    this.index++;
    return true;
  }

  private skipComments(): void {
    while (this.token().type === 'comment') {
      this.index++;
    }
  }

  private panicJumpOver(until: TokenType): void {
    this.isError = true;

    while (![until, 'eof'].includes(this.token().type)) {
      this.index++;
    }
    if (this.token().type !== 'eof') this.index++;
  }

  private panic(): void {
    this.isError = true;
    while (!'eof/>'.includes(this.token().type)) {
      this.index++;
    }
  }

  private logUnexpectedToken(expectedType?: TokenType): void {
    var token = this.token();

    if (token.type === 'ILLEGAL') {
      this.logger.error(token.pos, token.error!);
      return;
    }
    if (!expectedType) {
      this.logger.error(token.pos, 'Unexpected token');
      return;
    }
    this.logger.error(
      token.pos,
      `${expectedType} expected, got ${token.type}`,
    );
  }

  private token(): Token {
    return this.tokens[this.index];
  }
}
