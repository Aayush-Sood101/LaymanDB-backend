const logger = require('../utils/logger');

/**
 * Generate documentation for a database schema
 * @param {Object} schema - Database schema
 * @param {string} format - Documentation format (markdown, html, pdf)
 * @returns {string} - Generated documentation
 */
exports.generateDocumentation = async (schema, format = 'markdown') => {
  try {
    logger.info(`Generating ${format} documentation for schema: ${schema.name}`);
    
    // Choose the appropriate generator based on format
    let documentationContent;
    switch (format.toLowerCase()) {
      case 'html':
        documentationContent = generateHtmlDocumentation(schema);
        break;
      case 'pdf':
        // In a real implementation, this would generate a PDF
        // For now, we'll just generate Markdown
        documentationContent = generateMarkdownDocumentation(schema);
        break;
      case 'markdown':
      default:
        documentationContent = generateMarkdownDocumentation(schema);
        break;
    }
    
    logger.info(`Documentation generation complete for schema: ${schema.name}`);
    
    return documentationContent;
  } catch (error) {
    logger.error('Error generating documentation:', error);
    throw new Error(`Failed to generate documentation: ${error.message}`);
  }
};

/**
 * Generate Markdown documentation for a schema
 * @param {Object} schema - Database schema
 * @returns {string} - Markdown documentation
 */
function generateMarkdownDocumentation(schema) {
  let markdown = `# Database Schema: ${schema.name}\n\n`;
  
  // Add schema description
  if (schema.description) {
    markdown += `${schema.description}\n\n`;
  }
  
  markdown += `## Overview\n\n`;
  markdown += `This schema contains ${schema.tables.length} tables and ${schema.relationships.length} relationships.\n\n`;
  
  // Table of contents
  markdown += `## Table of Contents\n\n`;
  markdown += `- [Tables](#tables)\n`;
  schema.tables.forEach(table => {
    markdown += `  - [${table.name}](#${table.name.toLowerCase()})\n`;
  });
  markdown += `- [Relationships](#relationships)\n\n`;
  
  // Tables
  markdown += `## Tables\n\n`;
  schema.tables.forEach(table => {
    markdown += `### ${table.name}\n\n`;
    
    if (table.description) {
      markdown += `${table.description}\n\n`;
    }
    
    markdown += `#### Columns\n\n`;
    markdown += `| Name | Data Type | Primary Key | Nullable | Default | Description |\n`;
    markdown += `| ---- | --------- | ----------- | -------- | ------- | ----------- |\n`;
    
    table.columns.forEach(column => {
      const isPrimaryKey = column.isPrimaryKey ? '✓' : '';
      const isNullable = column.isNullable !== false ? '✓' : '';
      const defaultValue = column.defaultValue || '';
      const description = column.description || '';
      
      markdown += `| ${column.name} | ${column.dataType} | ${isPrimaryKey} | ${isNullable} | ${defaultValue} | ${description} |\n`;
    });
    
    markdown += `\n`;
  });
  
  // Relationships
  markdown += `## Relationships\n\n`;
  markdown += `| Source Table | Relationship | Target Table | Description |\n`;
  markdown += `| ------------ | ------------ | ------------ | ----------- |\n`;
  
  schema.relationships.forEach(relationship => {
    const relationshipType = formatRelationshipType(relationship.type);
    const description = relationship.description || '';
    
    markdown += `| ${relationship.sourceTable} | ${relationshipType} | ${relationship.targetTable} | ${description} |\n`;
  });
  
  return markdown;
}

/**
 * Generate HTML documentation for a schema
 * @param {Object} schema - Database schema
 * @returns {string} - HTML documentation
 */
function generateHtmlDocumentation(schema) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Schema: ${schema.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .table-container {
      margin-bottom: 30px;
    }
    .toc {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .toc ul {
      list-style-type: none;
      padding-left: 20px;
    }
    .primary-key {
      background-color: #e8f4f8;
    }
    .foreign-key {
      background-color: #f8f4e8;
    }
  </style>
</head>
<body>
  <h1>Database Schema: ${schema.name}</h1>
  
  ${schema.description ? `<p>${schema.description}</p>` : ''}
  
  <h2>Overview</h2>
  <p>This schema contains ${schema.tables.length} tables and ${schema.relationships.length} relationships.</p>
  
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      <li><a href="#tables">Tables</a>
        <ul>
          ${schema.tables.map(table => `<li><a href="#${table.name.toLowerCase()}">${table.name}</a></li>`).join('\n          ')}
        </ul>
      </li>
      <li><a href="#relationships">Relationships</a></li>
    </ul>
  </div>
  
  <h2 id="tables">Tables</h2>`;
  
  // Tables
  schema.tables.forEach(table => {
    html += `
  <div class="table-container">
    <h3 id="${table.name.toLowerCase()}">${table.name}</h3>
    
    ${table.description ? `<p>${table.description}</p>` : ''}
    
    <h4>Columns</h4>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Data Type</th>
          <th>Primary Key</th>
          <th>Nullable</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${table.columns.map(column => {
          const rowClass = column.isPrimaryKey ? 'primary-key' : (column.isForeignKey ? 'foreign-key' : '');
          return `<tr class="${rowClass}">
          <td>${column.name}</td>
          <td>${column.dataType}</td>
          <td>${column.isPrimaryKey ? '✓' : ''}</td>
          <td>${column.isNullable !== false ? '✓' : ''}</td>
          <td>${column.defaultValue || ''}</td>
          <td>${column.description || ''}</td>
        </tr>`;
        }).join('\n        ')}
      </tbody>
    </table>
  </div>`;
  });
  
  // Relationships
  html += `
  <h2 id="relationships">Relationships</h2>
  <table>
    <thead>
      <tr>
        <th>Source Table</th>
        <th>Relationship</th>
        <th>Target Table</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${schema.relationships.map(relationship => {
        const relationshipType = formatRelationshipType(relationship.type);
        return `<tr>
        <td>${relationship.sourceTable}</td>
        <td>${relationshipType}</td>
        <td>${relationship.targetTable}</td>
        <td>${relationship.description || ''}</td>
      </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>
</body>
</html>`;
  
  return html;
}

/**
 * Format relationship type for display
 * @param {string} type - Relationship type
 * @returns {string} - Formatted relationship type
 */
function formatRelationshipType(type) {
  switch (type) {
    case 'ONE_TO_ONE':
      return 'One-to-One (1:1)';
    case 'ONE_TO_MANY':
      return 'One-to-Many (1:N)';
    case 'MANY_TO_ONE':
      return 'Many-to-One (N:1)';
    case 'MANY_TO_MANY':
      return 'Many-to-Many (N:M)';
    default:
      return type;
  }
}

module.exports = exports;
