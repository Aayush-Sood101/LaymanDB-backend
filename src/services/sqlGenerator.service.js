const { format } = require('sql-formatter');
const logger = require('../utils/logger');

/**
 * Generate SQL for the given schema and dialect
 * @param {Object} schema - Database schema
 * @param {string} dialect - SQL dialect (mysql, postgresql, sqlite, sqlserver)
 * @returns {string} - Generated SQL script
 */
exports.generateSQL = async (schema, dialect = 'mysql') => {
  try {
    logger.info(`Generating ${dialect} SQL script for schema: ${schema.name}`);
    
    // Get the appropriate generator for the dialect
    const generator = getDialectGenerator(dialect);
    
    // Generate CREATE TABLE statements
    const tableStatements = schema.tables.map(table => 
      generator.createTableStatement(table, schema)
    );
    
    // Generate foreign key constraints (for dialects that don't support inline)
    const alterTableStatements = [];
    if (dialect === 'sqlserver') {
      schema.tables.forEach(table => {
        const foreignKeys = getForeignKeyConstraints(table, schema);
        if (foreignKeys.length > 0) {
          foreignKeys.forEach(fk => {
            alterTableStatements.push(
              generator.addForeignKeyStatement(table.name, fk)
            );
          });
        }
      });
    }
    
    // Generate indexes
    const indexStatements = schema.tables.flatMap(table => 
      generator.createIndexStatements(table, schema)
    );
    
    // Combine all statements
    const statements = [
      generator.headerComment(schema),
      ...tableStatements,
      ...alterTableStatements,
      ...indexStatements
    ];
    
    // Format the SQL for readability
    const sql = format(statements.join('\n\n'), { 
      language: dialect,
      keywordCase: 'upper',
      indentStyle: 'standard',
      logicalOperatorNewline: 'before'
    });
    
    logger.info(`SQL generation complete for schema: ${schema.name}`);
    
    return sql;
  } catch (error) {
    logger.error('Error generating SQL:', error);
    throw new Error(`Failed to generate SQL script: ${error.message}`);
  }
};

/**
 * Get the appropriate SQL generator for the given dialect
 * @param {string} dialect - SQL dialect
 * @returns {Object} - Dialect-specific generator
 */
function getDialectGenerator(dialect) {
  const generators = {
    mysql: require('./dialects/mysql.generator'),
    postgresql: require('./dialects/postgresql.generator'),
    sqlite: require('./dialects/sqlite.generator'),
    sqlserver: require('./dialects/sqlserver.generator')
  };
  
  // Normalize dialect name
  const normalizedDialect = dialect.toLowerCase();
  
  // Return the appropriate generator or MySQL as default
  return generators[normalizedDialect] || generators.mysql;
}

/**
 * Extract foreign key constraints from a table
 * @param {Object} table - Table object
 * @param {Object} schema - Full schema
 * @returns {Array} - Foreign key constraints
 */
function getForeignKeyConstraints(table, schema) {
  return table.columns
    .filter(column => column.isForeignKey && column.references)
    .map(column => ({
      columnName: column.name,
      referenceTable: column.references.table,
      referenceColumn: column.references.column,
      onDelete: column.references.onDelete || 'NO ACTION',
      onUpdate: column.references.onUpdate || 'NO ACTION'
    }));
}

module.exports = exports;
