const includes = require('lodash/includes');
const tokenTypes = require('./tokenTypes');
const Indentation = require('./Indentation');
const InlineBlock = require('./InlineBlock');
const Params = require('./Params');

/**
 * @typedef {import('../sqlFormatter').FormatterConfigs} FormatterConfigs
 */


const trimSpacesEnd = str => str.replace(/[ \t]+$/u, '');

class Formatter {
  /**
   * @param {FormatterConfigs} cfg
   * @param {Tokenizer} tokenizer
   */
  constructor(cfg, tokenizer, tokenOverride) {
    this.cfg = cfg || {};
    this.indentation = new Indentation(this.cfg.indent);
    this.inlineBlock = new InlineBlock();
    this.params = new Params(this.cfg.params);
    this.tokenizer = tokenizer;
    this.tokenOverride = tokenOverride;
    this.previousReservedWord = {};
    this.tokens = [];
    this.index = 0;
    this.formatTopLevelReservedWordsWithNoNewlineAfter = [
      'FROM',
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      'CROSS JOIN',
      'INNER JOIN',
      'JOIN',
      'LEFT JOIN',
      'LEFT OUTER JOIN',
      'OUTER JOIN',
      'RIGHT JOIN',
      'RIGHT OUTER JOIN'
    ];
    this.formatItemsAfterTopLevelReservedWordsWithoutLinebreak = ['GROUP BY', 'ORDER BY', 'LIMIT'];
  }
  

  /**
   * Formats whitespace in a SQL string to make it easier to read.
   *
   * @param {String} query The SQL query string
   * @return {String} formatted query
   */
  format(query) {
    this.tokens = this.tokenizer.tokenize(query);
    const formattedQuery = this.getFormattedQueryFromTokens();

    return formattedQuery.trim();
  }

  getFormattedQueryFromTokens() {
    let formattedQuery = '';

    this.tokens.forEach((token, index) => {
      this.index = index;

      if (this.tokenOverride) token = this.tokenOverride(token, this.previousReservedWord) || token;

      if (token.type === tokenTypes.WHITESPACE) {
        // ignore (we do our own whitespace formatting)
      } else if (token.type === tokenTypes.LINE_COMMENT) {
        formattedQuery = this.formatLineComment(token, formattedQuery);
      } else if (token.type === tokenTypes.BLOCK_COMMENT) {
        formattedQuery = this.formatBlockComment(token, formattedQuery);
      } else if (token.type === tokenTypes.RESERVED_TOP_LEVEL) {
        formattedQuery = this.formatTopLevelReservedWord(token, formattedQuery);
        this.previousReservedWord = token;
      } else if (token.type === tokenTypes.RESERVED_TOP_LEVEL_NO_INDENT) {
        formattedQuery = this.formatTopLevelReservedWordNoIndent(token, formattedQuery);
        this.previousReservedWord = token;
      } else if (token.type === tokenTypes.RESERVED_NEWLINE) {
        formattedQuery = this.formatNewlineReservedWord(token, formattedQuery);
        this.previousReservedWord = token;
      } else if (token.type === tokenTypes.RESERVED) {
        formattedQuery = this.formatWithSpaces(token, formattedQuery);
        this.previousReservedWord = token;
      } else if (token.type === tokenTypes.OPEN_PAREN) {
        formattedQuery = this.formatOpeningParentheses(token, formattedQuery);
      } else if (token.type === tokenTypes.CLOSE_PAREN) {
        formattedQuery = this.formatClosingParentheses(token, formattedQuery);
      } else if (token.type === tokenTypes.PLACEHOLDER) {
        formattedQuery = this.formatPlaceholder(token, formattedQuery);
      } else if (token.value === ',') {
        formattedQuery = this.formatComma(token, formattedQuery);
      } else if (token.value === ':') {
        formattedQuery = this.formatWithSpaceAfter(token, formattedQuery);
      } else if (token.value === '.') {
        formattedQuery = this.formatWithoutSpaces(token, formattedQuery);
      } else if (token.value === ';') {
        formattedQuery = this.formatQuerySeparator(token, formattedQuery);
      } else {
        formattedQuery = this.formatWithSpaces(token, formattedQuery);
      }
    });
    return formattedQuery;
  }

  formatLineComment(token, query) {
    return this.addNewline(query + token.value);
  }

  formatBlockComment(token, query) {
    return this.addNewline(this.addNewline(query) + this.indentComment(token.value));
  }

  indentComment(comment) {
    return comment.replace(/\n[ \t]*/gu, '\n' + this.indentation.getIndent() + ' ');
  }

  formatTopLevelReservedWordNoIndent(token, query) {
    this.indentation.decreaseTopLevel();
    query = this.addNewline(query) + this.equalizeWhitespace(this.formatReservedWord(token.value));
    return this.addNewline(query);
  }

  formatTopLevelReservedWord(token, query) {
    this.indentation.decreaseTopLevel();

    query = this.addNewline(query);

    this.indentation.increaseTopLevel();

    query += this.equalizeWhitespace(this.formatReservedWord(token.value));
    const isNoNewLineAfterToken = includes(
      this.formatTopLevelReservedWordsWithNoNewlineAfter,
      token.value.toUpperCase()
    );
    if (isNoNewLineAfterToken) {
      return query + ' ';
    }
    return this.addNewline(query);
  }

  formatNewlineReservedWord(token, query) {
    if (token.value.toUpperCase() === 'THEN') {
      let formattedToken = this.equalizeWhitespace(this.formatReservedWord(token.value))
      formattedToken = (this.cfg.indent || '  ') + formattedToken;
      return this.addNewline(query) + formattedToken + ' ';
    }
    return (
      this.addNewline(query) + this.equalizeWhitespace(this.formatReservedWord(token.value)) + ' '
    );
  }

  // Replace any sequence of whitespace characters with single space
  equalizeWhitespace(string) {
    return string.replace(/\s+/gu, ' ');
  }

  // Opening parentheses increase the block indent level and start a new line
  formatOpeningParentheses(token, query) {
    // Take out the preceding space unless there was whitespace there in the original query
    // or another opening parens or line comment
    const preserveWhitespaceFor = [
      tokenTypes.WHITESPACE,
      tokenTypes.OPEN_PAREN,
      tokenTypes.LINE_COMMENT
    ];
    if (!includes(preserveWhitespaceFor, this.previousToken().type)) {
      query = trimSpacesEnd(query);
    }
    //if (this.previousReservedWord.value && this.previousReservedWord.value.toUpperCase() !== 'AS') {
    if (this.previousToken().value && this.previousToken().value.toUpperCase() !== 'AS') {
      this.inlineBlock.beginIfPossible(this.tokens, this.index);
      query += this.cfg.uppercase ? token.value.toUpperCase() : token.value;
    } else {
      this.inlineBlock.beginIfPossible(this.tokens, this.index);
      query = this.addNewline(query);
      query += this.cfg.uppercase ? token.value.toUpperCase() : token.value;
    }

    if (!this.inlineBlock.isActive()) {
      this.indentation.increaseBlockLevel();
      query = this.addNewline(query);
    }
    return query;
  }

  // Closing parentheses decrease the block indent level
  formatClosingParentheses(token, query) {
    token.value = this.cfg.uppercase ? token.value.toUpperCase() : token.value;
    if (this.inlineBlock.isActive()) {
      this.inlineBlock.end();
      return this.formatWithSpaceAfter(token, query);
    } else {
      this.indentation.decreaseBlockLevel();
      return this.formatWithSpaces(token, this.addNewline(query));
    }
  }

  formatPlaceholder(token, query) {
    return query + this.params.get(token) + ' ';
  }

  // Commas start a new line (unless within inline parentheses or SQL "LIMIT" clause)
  formatComma(token, query) {
    query = trimSpacesEnd(query) + token.value + ' ';
    if (this.inlineBlock.isActive()) {
      return query;
    } else if (/^LIMIT$/iu.test(this.previousReservedWord.value)) {
      return query;
    } else if (includes(this.formatItemsAfterTopLevelReservedWordsWithoutLinebreak, this.previousReservedWord.value.toUpperCase())) {
      if (this.previousToken().type === tokenTypes.CLOSE_PAREN){
        return this.addNewline(query);  
      }
      return query;
    } else {
      return this.addNewline(query);
    }
  }

  formatWithSpaceAfter(token, query) {
    return trimSpacesEnd(query) + token.value + ' ';
  }

  formatWithoutSpaces(token, query) {
    return trimSpacesEnd(query) + token.value;
  }

  formatWithSpaces(token, query) {
    const value = token.type === 'reserved' ? this.formatReservedWord(token.value) : token.value;
    return query + value + ' ';
  }

  formatReservedWord(value) {
    return this.cfg.uppercase ? value.toUpperCase() : value;
  }

  formatQuerySeparator(token, query) {
    this.indentation.resetIndentation();
    return trimSpacesEnd(query) + token.value + '\n'.repeat(this.cfg.linesBetweenQueries || 1);
  }

  addNewline(query) {
    query = trimSpacesEnd(query);
    if (!query.endsWith('\n')) query += '\n';
    return query + this.indentation.getIndent();
  }

  previousToken(offset = 1) {
    return this.tokens[this.index - offset] || {};
  }
}

module.exports = Formatter;