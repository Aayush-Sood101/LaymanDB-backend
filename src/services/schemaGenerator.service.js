const logger = require('../utils/logger');

/**
 * Generate database schema from extracted entities and relationships
 * @param {Object} extractedData - Extracted entities and relationships from NLP
 * @param {Object} options - Additional options for schema generation
 * @returns {Object} - Generated database schema
 */
exports.generateSchema = async (extractedData, options = {}) => {
  try {
    const { entities = [], relationships = [] } = extractedData;
    const { name = 'New Schema', description = '' } = options;
    
    logger.info('Generating schema from extracted data', { 
      entityCount: entities.length,
      relationshipCount: relationships.length
    });
    
    // Transform entities into tables
    const tables = entities.map((entity, index) => ({
      name: transformTableName(entity.name),
      columns: generateColumnsFromAttributes(entity.attributes || []),
      description: entity.description || `Table for ${entity.name}`,
      position: {
        x: 100 + (index % 3) * 350,
        y: 100 + Math.floor(index / 3) * 250
      }
    }));
    
    // Transform relationships
    const transformedRelationships = relationships.map((rel) => {
      return transformRelationship(rel, tables);
    }).filter(Boolean);
    
    // Handle many-to-many relationships by creating junction tables
    const { updatedTables, junctionRelationships } = createJunctionTables(tables, transformedRelationships);
    
    // Final schema
    const schema = {
      name,
      description,
      tables: updatedTables,
      relationships: [...transformedRelationships, ...junctionRelationships],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    logger.info('Schema generation completed', {
      tableCount: schema.tables.length,
      relationshipCount: schema.relationships.length
    });
    
    return schema;
  } catch (error) {
    logger.error('Error generating schema:', error);
    throw new Error(`Failed to generate schema: ${error.message}`);
  }
};

/**
 * Transform entity name to valid table name
 * @param {string} entityName - Entity name
 * @returns {string} - Transformed table name
 */
function transformTableName(entityName) {
  // Convert to snake_case for table names
  return entityName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^[0-9]/, '_$&');
}

/**
 * Generate columns from attributes
 * @param {Array} attributes - Entity attributes
 * @returns {Array} - Generated columns
 */
function generateColumnsFromAttributes(attributes) {
  // If no attributes are provided, create default columns
  if (!attributes || attributes.length === 0) {
    return [
      {
        name: 'id',
        dataType: 'INTEGER',
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: true,
        description: 'Primary key'
      },
      {
        name: 'name',
        dataType: 'VARCHAR(255)',
        isPrimaryKey: false,
        isForeignKey: false,
        isNullable: false,
        isUnique: false,
        description: 'Name field'
      },
      {
        name: 'created_at',
        dataType: 'TIMESTAMP',
        isPrimaryKey: false,
        isForeignKey: false,
        isNullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        description: 'Creation timestamp'
      },
      {
        name: 'updated_at',
        dataType: 'TIMESTAMP',
        isPrimaryKey: false,
        isForeignKey: false,
        isNullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        description: 'Last update timestamp'
      }
    ];
  }
  
  // Transform attributes into columns
  return attributes.map(attr => ({
    name: attr.name.toLowerCase().replace(/\s+/g, '_'),
    dataType: attr.dataType || inferDataType(attr.name),
    isPrimaryKey: !!attr.isPrimaryKey,
    isForeignKey: !!attr.isForeignKey,
    isNullable: attr.isNullable !== false,
    isUnique: !!attr.isUnique || !!attr.isPrimaryKey,
    defaultValue: attr.defaultValue,
    references: attr.references,
    description: attr.description || `${attr.name} field`
  }));
}

/**
 * Infer SQL data type based on attribute name
 * @param {string} attributeName - Attribute name
 * @returns {string} - Inferred SQL data type
 */
function inferDataType(attributeName) {
  const name = attributeName.toLowerCase();
  
  if (name === 'id' || name.endsWith('_id') || name.endsWith('id')) {
    return 'INTEGER';
  } else if (name.includes('date') || name.includes('time')) {
    return 'TIMESTAMP';
  } else if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
    return 'DECIMAL(10,2)';
  } else if (name.includes('is_') || name.includes('has_') || name === 'active' || name === 'enabled') {
    return 'BOOLEAN';
  } else if (name.includes('description') || name.includes('content') || name.includes('text')) {
    return 'TEXT';
  } else if (name.includes('email')) {
    return 'VARCHAR(255)';
  } else if (name.includes('phone')) {
    return 'VARCHAR(20)';
  } else {
    return 'VARCHAR(255)';
  }
}

/**
 * Transform relationship data into schema relationship
 * @param {Object} relationship - Relationship data
 * @param {Array} tables - Tables in the schema
 * @returns {Object|null} - Transformed relationship
 */
function transformRelationship(relationship, tables) {
  const sourceTable = tables.find(t => 
    t.name.toLowerCase() === transformTableName(relationship.sourceEntity).toLowerCase()
  );
  
  const targetTable = tables.find(t => 
    t.name.toLowerCase() === transformTableName(relationship.targetEntity).toLowerCase()
  );
  
  // Skip if source or target table doesn't exist
  if (!sourceTable || !targetTable) {
    return null;
  }
  
  // Find or create ID columns
  const sourceColumn = sourceTable.columns.find(c => c.isPrimaryKey) || { name: 'id' };
  const targetColumn = targetTable.columns.find(c => c.isPrimaryKey) || { name: 'id' };
  
  // Create foreign key columns for one-to-many relationships
  if (relationship.type === 'ONE_TO_MANY') {
    // Add foreign key to "many" side
    const fkName = `${sourceTable.name.toLowerCase()}_id`;
    if (!targetTable.columns.some(c => c.name === fkName)) {
      targetTable.columns.push({
        name: fkName,
        dataType: sourceColumn.dataType || 'INTEGER',
        isPrimaryKey: false,
        isForeignKey: true,
        isNullable: true,
        isUnique: false,
        references: {
          table: sourceTable.name,
          column: sourceColumn.name,
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        description: `Foreign key reference to ${sourceTable.name}`
      });
    }
  }
  
  return {
    name: `${sourceTable.name}_${targetTable.name}`,
    sourceTable: sourceTable.name,
    targetTable: targetTable.name,
    sourceColumn: sourceColumn.name,
    targetColumn: relationship.type === 'ONE_TO_MANY' ? `${sourceTable.name.toLowerCase()}_id` : targetColumn.name,
    type: relationship.type,
    description: relationship.description || `Relationship between ${sourceTable.name} and ${targetTable.name}`
  };
}

/**
 * Create junction tables for many-to-many relationships
 * @param {Array} tables - Existing tables
 * @param {Array} relationships - Existing relationships
 * @returns {Object} - Updated tables and junction relationships
 */
function createJunctionTables(tables, relationships) {
  const updatedTables = [...tables];
  const junctionRelationships = [];
  
  // Find many-to-many relationships
  const manyToManyRelationships = relationships.filter(r => r.type === 'MANY_TO_MANY');
  
  for (const rel of manyToManyRelationships) {
    const sourceTable = tables.find(t => t.name === rel.sourceTable);
    const targetTable = tables.find(t => t.name === rel.targetTable);
    
    if (!sourceTable || !targetTable) continue;
    
    // Create junction table name
    const junctionTableName = `${rel.sourceTable}_${rel.targetTable}`;
    
    // Create junction table
    const junctionTable = {
      name: junctionTableName,
      columns: [
        {
          name: `${rel.sourceTable.toLowerCase()}_id`,
          dataType: 'INTEGER',
          isPrimaryKey: true,
          isForeignKey: true,
          isNullable: false,
          isUnique: false,
          references: {
            table: rel.sourceTable,
            column: rel.sourceColumn,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          description: `Foreign key reference to ${rel.sourceTable}`
        },
        {
          name: `${rel.targetTable.toLowerCase()}_id`,
          dataType: 'INTEGER',
          isPrimaryKey: true,
          isForeignKey: true,
          isNullable: false,
          isUnique: false,
          references: {
            table: rel.targetTable,
            column: rel.targetColumn,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          description: `Foreign key reference to ${rel.targetTable}`
        },
        {
          name: 'created_at',
          dataType: 'TIMESTAMP',
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          description: 'Creation timestamp'
        }
      ],
      description: `Junction table for ${rel.sourceTable} and ${rel.targetTable} many-to-many relationship`,
      position: {
        x: (sourceTable.position.x + targetTable.position.x) / 2,
        y: (sourceTable.position.y + targetTable.position.y) / 2 + 100
      }
    };
    
    // Add junction table
    updatedTables.push(junctionTable);
    
    // Create relationships to junction table
    junctionRelationships.push(
      {
        name: `${rel.sourceTable}_to_${junctionTableName}`,
        sourceTable: rel.sourceTable,
        targetTable: junctionTableName,
        sourceColumn: rel.sourceColumn,
        targetColumn: `${rel.sourceTable.toLowerCase()}_id`,
        type: 'ONE_TO_MANY',
        junctionTable: junctionTableName,
        description: `One-to-many relationship from ${rel.sourceTable} to junction table`
      },
      {
        name: `${rel.targetTable}_to_${junctionTableName}`,
        sourceTable: rel.targetTable,
        targetTable: junctionTableName,
        sourceColumn: rel.targetColumn,
        targetColumn: `${rel.targetTable.toLowerCase()}_id`,
        type: 'ONE_TO_MANY',
        junctionTable: junctionTableName,
        description: `One-to-many relationship from ${rel.targetTable} to junction table`
      }
    );
  }
  
  return { 
    updatedTables, 
    junctionRelationships
  };
}

module.exports = exports;
