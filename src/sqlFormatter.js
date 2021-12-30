const Db2Formatter = require('./languages/Db2Formatter.js');
const N1qlFormatter = require('./languages/N1qlFormatter');
const PlSqlFormatter = require('./languages/PlSqlFormatter');
const StandardSqlFormatter = require('./languages/StandardSqlFormatter');

/**
 * @typedef {Object} FormatterConfigs
 * @property {string} language Query language, default is Standard SQL
 * @property {string} indent Characters used for indentation, default is "  " (2 spaces)
 * @property {boolean} uppercase Converts keywords to uppercase
 * @property {number} linesBetweenQueries How many line breaks between queries
 * @property {Object} params Collection of params for placeholder replacement
*/

/**
 * Format whitespace in a query to make it easier to read.
 *
 * @param {string} query
 * @param {FormatterConfigs} cfg
 * @return {string}
 */
const format = (query, cfg = {
  language: 'sql',
  indent: "\t",
  uppercase: true,
  linesBetweenQueries: 0,
  params: undefined
}) => {
  switch (cfg.language) {
    case 'db2':
      return new Db2Formatter(cfg).format(query);
    case 'n1ql':
      return new N1qlFormatter(cfg).format(query);
    case 'pl/sql':
      return new PlSqlFormatter(cfg).format(query);
    case 'sql':
    case undefined:
      return new StandardSqlFormatter(cfg).format(query);
    default:
      throw Error(`Unsupported SQL dialect: ${cfg.language}`);
  }
};
module.exports = format;