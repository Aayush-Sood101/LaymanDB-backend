/**
 * Mermaid ER Diagram Generator Service
 * Converts schema objects to Mermaid ER diagram syntax
 */

class MermaidGeneratorService {
  /**
   * Auto-format and repair common Mermaid syntax issues
   * @param {String} mermaidSyntax - The Mermaid syntax to format/repair
   * @returns {String} - The formatted/repaired Mermaid syntax
   */
  autoFormatMermaidSyntax(mermaidSyntax) {
    if (!mermaidSyntax) return mermaidSyntax;
    
    let formatted = mermaidSyntax;
    
    // Fix common formatting issues - ensure entity definitions are properly separated
    // 1. Fix missing newlines before closing braces
    formatted = formatted.replace(/(\w+\s+\w+\s+\w+)\s*}(\w+)/g, '$1\n    }\n\n    $2');
    
    // 2. Fix missing newlines between entity blocks
    formatted = formatted.replace(/}\s*(\w+)\s*{/g, '}\n\n    $1 {');
    
    // 3. Add spacing around relationship operators to avoid rendering issues
    // This is crucial for avoiding the "appendChild" errors
    formatted = formatted.replace(/(\|\||\}o|o\{)--(\|\||\}o|o\{)/g, '$1 -- $2');
    formatted = formatted.replace(/(\|\||\}o|o\{)-(\|\||\}o|o\{)/g, '$1 -- $2'); // Fix single dash
    formatted = formatted.replace(/(\|\||\}o|o\{)—(\|\||\}o|o\{)/g, '$1 -- $2'); // Fix em dash
    
    // 4. Ensure all relationship labels are properly quoted
    formatted = formatted.replace(/:\s*([^"\n]+)$/gm, ': "$1"');
    formatted = formatted.replace(/:\s*"([^"]*)"$/gm, ': "$1"'); // Normalize quoted labels
    
    // 5. Ensure proper indentation of entity definitions
    const lines = formatted.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Add proper indentation to entity definitions
      if (/^\s*\w+\s+{$/.test(lines[i].trim()) && !lines[i].startsWith('    ')) {
        lines[i] = '    ' + lines[i].trim();
      }
      
      // Add proper indentation to closing braces
      if (lines[i].trim() === '}' && !lines[i].startsWith('    ')) {
        lines[i] = '    ' + lines[i].trim();
      }
      
      // Add proper indentation to attributes
      if (/^\s*\w+\s+\w+/.test(lines[i].trim()) && !lines[i].startsWith('        ')) {
        // Only indent if this looks like an attribute inside an entity
        if (i > 0 && /{\s*$/.test(lines[i-1])) {
          lines[i] = '        ' + lines[i].trim();
        }
      }
      
      // Add proper indentation to relationships and ensure proper spacing
      if (/^\s*\w+\s+(\|\||\}o|o\{).*--.*(\|\||\}o|o\{)\s+\w+/.test(lines[i].trim())) {
        // First ensure it starts with proper indentation
        if (!lines[i].startsWith('    ')) {
          lines[i] = '    ' + lines[i].trim();
        }
        
        // Then ensure proper spacing around the relationship operator
        lines[i] = lines[i].replace(/(\|\||\}o|o\{)--(\|\||\}o|o\{)/g, '$1 -- $2');
        lines[i] = lines[i].replace(/(\|\||\}o|o\{)-(\|\||\}o|o\{)/g, '$1 -- $2');
        lines[i] = lines[i].replace(/(\|\||\}o|o\{)—(\|\||\}o|o\{)/g, '$1 -- $2');
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate Mermaid ER diagram syntax from a schema object
   * @param {Object} schema - The schema object with tables and relationships
   * @returns {String} - Mermaid ER diagram syntax
   */
  generateMermaidERD(schema) {
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      throw new Error('Invalid schema structure');
    }

    let mermaidSyntax = 'erDiagram\n';
    
    // Process all entities (tables)
    schema.tables.forEach(table => {
      // Add entity definitions with attributes
      mermaidSyntax += this.generateEntityDefinition(table);
    });
    
    // Process all relationships
    if (schema.relationships && Array.isArray(schema.relationships)) {
      schema.relationships.forEach(relationship => {
        mermaidSyntax += this.generateRelationshipDefinition(relationship);
      });
    }
    
    // Auto-format the syntax to fix any formatting issues
    mermaidSyntax = this.autoFormatMermaidSyntax(mermaidSyntax);
    
    // Validate the generated syntax
    const validation = this.validateMermaidSyntax(mermaidSyntax);
    if (!validation.isValid) {
      console.warn('Mermaid syntax validation warnings:', validation.errors);
      // Add validation warnings as comments to the diagram
      mermaidSyntax += '\n    %% Validation Warnings:\n';
      validation.errors.forEach(error => {
        mermaidSyntax += `    %% - ${error}\n`;
      });
    }
    
    return mermaidSyntax;
  }
  
  /**
   * Generate Mermaid entity definition with attributes
   * @param {Object} table - The table/entity object
   * @returns {String} - Mermaid entity definition
   */
  generateEntityDefinition(table) {
    if (!table || !table.name) return '';
    
    let entityDef = '';
    
    // Add entity - consistently use lowercase for entity names
    const sanitizedTableName = this.sanitizeName(table.name).toLowerCase();
    
    // Start entity definition
    entityDef += `    ${sanitizedTableName} {\n`;
    
    // Add attributes
    if (table.columns && Array.isArray(table.columns)) {
      table.columns.forEach(column => {
        const dataType = this.mapDataType(column.dataType);
        
        // Generate the key indicator - this will be the third column
        let keyIndicator = '';
        if (column.primaryKey) {
          keyIndicator = 'PK';
        } else if (column.foreignKey) {
          keyIndicator = 'FK';
        }
        
        // Generate the nullable indicator - this will be the fourth column
        const nullableIndicator = column.nullable ? '' : '';
        
        // Format: dataType name keyIndicator nullableIndicator
        // Make sure to properly align the columns with spaces between them
        entityDef += `        ${dataType} ${this.sanitizeName(column.name)} ${keyIndicator} ${nullableIndicator}\n`;
      });
    }
    
    // Close entity definition - ensure proper closure with a newline
    entityDef += '    }\n\n';
    
    return entityDef;
  }
  
  /**
   * Generate Mermaid relationship definition
   * @param {Object} relationship - The relationship object
   * @returns {String} - Mermaid relationship definition
   */
  generateRelationshipDefinition(relationship) {
    if (!relationship || !relationship.sourceEntity || !relationship.targetEntity) return '';
    
    const sourceEntity = this.sanitizeName(relationship.sourceEntity || relationship.sourceTable);
    const targetEntity = this.sanitizeName(relationship.targetEntity || relationship.targetTable);
    let relationshipName = relationship.name || 'relates';
    
    // Sanitize relationship name to prevent rendering issues
    relationshipName = relationshipName.replace(/"/g, '\\"');  // Escape quotes
    
    // Make sure to use the exact same case as used in entity definitions
    // This prevents the common error of mismatched entity names in relationships
    const sourceEntityLowerCase = sourceEntity.toLowerCase();
    const targetEntityLowerCase = targetEntity.toLowerCase();
    
    // Determine cardinality
    let sourceCardinality = '||';  // Default to one-to-one
    let targetCardinality = '||';
    
    if (relationship.cardinality) {
      // Parse cardinality from the schema
      if (relationship.cardinality.source === 'many') {
        sourceCardinality = '}o';
      } else if (relationship.cardinality.source === 'one') {
        sourceCardinality = '||';
      }
      
      if (relationship.cardinality.target === 'many') {
        targetCardinality = 'o{';
      } else if (relationship.cardinality.target === 'one') {
        targetCardinality = '||';
      }
    } else if (relationship.type) {
      // Use relationship type as fallback
      if (relationship.type === 'one-to-many') {
        sourceCardinality = '||';
        targetCardinality = 'o{';
      } else if (relationship.type === 'many-to-one') {
        sourceCardinality = '}o';
        targetCardinality = '||';
      } else if (relationship.type === 'many-to-many') {
        sourceCardinality = '}o';
        targetCardinality = 'o{';
      }
    }
    
    // Ensure proper spacing around the relationship operator
    // This is crucial for avoiding the "appendChild" rendering errors
    return `    ${sourceEntityLowerCase} ${sourceCardinality} -- ${targetCardinality} ${targetEntityLowerCase} : "${relationshipName}"\n`;
  }
  
  /**
   * Sanitize name for Mermaid compatibility
   * @param {String} name - The original name
   * @returns {String} - Sanitized name
   */
  sanitizeName(name) {
    if (!name) return 'unnamed';
    
    // Replace spaces and special characters
    let sanitized = name.replace(/[^\w]/g, '_');
    
    // Handle JavaScript reserved keywords that would cause conflicts in Mermaid
    const reservedKeywords = [
      'class', 'break', 'case', 'catch', 'const', 'continue', 'debugger', 
      'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 
      'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 
      'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 
      'while', 'with', 'yield'
    ];
    
    // If the name is a reserved keyword, append '_entity' to it
    if (reservedKeywords.includes(sanitized.toLowerCase())) {
      sanitized = sanitized + '_entity';
    }
    
    return sanitized;
  }
  
  /**
   * Map data types to simplified Mermaid types
   * @param {String} dataType - Original data type
   * @returns {String} - Simplified type for Mermaid
   */
  mapDataType(dataType) {
    if (!dataType) return 'string';
    
    const lowerType = dataType.toLowerCase();
    
    if (lowerType.includes('int') || lowerType.includes('number') || lowerType.includes('decimal') || 
        lowerType.includes('float') || lowerType.includes('double')) {
      return 'number';
    } else if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string') ||
               lowerType.includes('uuid') || lowerType.includes('json')) {
      return 'string';
    } else if (lowerType.includes('date') || lowerType.includes('time')) {
      return 'date';
    } else if (lowerType.includes('bool')) {
      return 'boolean';
    } else {
      return 'string';  // Default to string for unknown types
    }
  }
  
  /**
   * Validate the final Mermaid syntax to catch common issues
   * @param {String} mermaidSyntax - The generated Mermaid syntax
   * @returns {Object} - Validation result with isValid and errors
   */
  validateMermaidSyntax(mermaidSyntax) {
    const result = {
      isValid: true,
      errors: []
    };
    
    // Check for empty diagram
    if (!mermaidSyntax || mermaidSyntax === 'erDiagram\n') {
      result.isValid = false;
      result.errors.push('Empty diagram: No entities or relationships defined');
      return result;
    }
    
    // Try to auto-format the syntax to fix common issues
    const formattedSyntax = this.autoFormatMermaidSyntax(mermaidSyntax);
    
    // Check for basic structural errors on the formatted syntax
    this.checkStructuralErrors(formattedSyntax, result);
    
    // Extract entities and relationships for validation
    const entityMatches = formattedSyntax.match(/\s+(\w+)\s+{/g) || [];
    const entityNames = entityMatches.map(match => {
      const parts = match.trim().split(/\s+/);
      return parts && parts[0] ? parts[0].toLowerCase() : '';
    }).filter(Boolean);
    
    // Check for too many entities (can cause rendering issues)
    if (entityNames.length > 20) {
      result.isValid = false;
      result.errors.push(`Warning: Diagram contains ${entityNames.length} entities. Large diagrams may have rendering issues.`);
    }
    
    // Extract relationships - use a more flexible pattern to catch different spacing variations
    // This helps identify improperly formatted relationships that might cause rendering issues
    const relationshipMatches = formattedSyntax.match(/\s+(\w+)\s+(\|\||}\o|\o\{)\s*--\s*(\|\||}\o|\o\{)\s+(\w+)/g) || [];
    
    // Check for complex layout that might cause rendering issues
    if (relationshipMatches.length > 30) {
      result.isValid = false;
      result.errors.push(`Warning: Diagram contains ${relationshipMatches.length} relationships. Complex layouts may have rendering issues.`);
    }
    
    // Validate relationships reference existing entities
    for (const relationshipMatch of relationshipMatches) {
      const parts = relationshipMatch.trim().split(/\s+/);
      // The pattern may vary based on spacing, so we need to be more flexible in extracting entity names
      const sourceEntity = parts && parts[0] ? parts[0].toLowerCase() : '';
      let targetEntity = '';
      
      // Find the target entity by looking for the last word in the relationship
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] && parts[i].match(/^\w+$/)) {
          targetEntity = parts[i].toLowerCase();
          break;
        }
      }
      
      if (!entityNames.includes(sourceEntity)) {
        result.isValid = false;
        result.errors.push(`Relationship references undefined source entity: ${sourceEntity}`);
      }
      
      if (!entityNames.includes(targetEntity)) {
        result.isValid = false;
        result.errors.push(`Relationship references undefined target entity: ${targetEntity}`);
      }
    }
    
    return result;
  }
  
  /**
   * Check for structural syntax errors in the Mermaid diagram
   * @param {String} mermaidSyntax - The Mermaid syntax to check
   * @param {Object} result - The validation result object to update
   */
  checkStructuralErrors(mermaidSyntax, result) {
    const lines = mermaidSyntax.split('\n');
    const openBraces = [];
    const entities = [];
    let currentEntity = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (line === '' || line.startsWith('%%')) continue;
      
      // Check for entity definition start
      const entityMatch = line.match(/^\s*(\w+)\s+{$/);
      if (entityMatch) {
        currentEntity = entityMatch[1];
        entities.push(currentEntity);
        openBraces.push({ entity: currentEntity, line: i + 1 });
        continue;
      }
      
      // Check for missing newlines between entity definitions
      // This detects patterns like "} entity {" which indicate missing newlines
      const missingNewlineMatch = line.match(/}(\s*)(\w+)(\s*){/);
      if (missingNewlineMatch) {
        result.isValid = false;
        result.errors.push(`Syntax error on line ${i + 1}: Missing newline between entity definitions. Found "${line}". Entities should be separated by newlines.`);
        // Add contextual help
        result.errors.push(`Hint: Replace "${line}" with "}\n\n    ${missingNewlineMatch[2]} {"`);
        continue;
      }
      
      // Check for missing newline after attribute and before closing brace
      // This detects patterns like "attribute}entity" indicating missing newline before closing brace
      const missingNewlineBeforeBraceMatch = line.match(/(\w+)(\s+)(\w+)(\s+)(\w+)}(\w+)/);
      if (missingNewlineBeforeBraceMatch) {
        result.isValid = false;
        const attribute = `${missingNewlineBeforeBraceMatch[1]} ${missingNewlineBeforeBraceMatch[3]} ${missingNewlineBeforeBraceMatch[5]}`;
        const nextEntity = missingNewlineBeforeBraceMatch[6];
        result.errors.push(`Syntax error on line ${i + 1}: Missing newline before closing brace. Found "${line}".`);
        // Add contextual help with specific formatting guidance
        result.errors.push(`Fix: Add a newline after "${attribute}" and before the closing brace.`);
        result.errors.push(`Proper format:\n    ${attribute}\n    }\n\n    ${nextEntity} {`);
        continue;
      }
      
      // Check for entity definition end
      if (line === '}') {
        if (openBraces.length === 0) {
          result.isValid = false;
          result.errors.push(`Unexpected closing brace on line ${i + 1} with no matching opening brace`);
        } else {
          openBraces.pop();
        }
        continue;
      }
      
      // Check for malformed relationship definitions (common cause of appendChild errors)
      // Should have spaces around the -- operator
      const badRelationshipMatch = line.match(/^\s*(\w+)\s+(\|\||}\o|\o\{)(--|\-\-|—)(\|\||}\o|\o\{)\s+(\w+)/);
      if (badRelationshipMatch) {
        result.isValid = false;
        result.errors.push(`Malformed relationship on line ${i + 1}: "${line}". Relationships should have spaces around the -- operator.`);
        result.errors.push(`Fix: Format as "${badRelationshipMatch[1]} ${badRelationshipMatch[2]} -- ${badRelationshipMatch[4]} ${badRelationshipMatch[5]}"`);
        continue;
      }
      
      // Check for relationship definition inside entity block (common error)
      const relationshipMatch = line.match(/^\s*(\w+)\s+(\|\||}\o|\o\{)\s+--\s+(\|\||}\o|\o\{)\s+(\w+)/);
      if (relationshipMatch && openBraces.length > 0) {
        result.isValid = false;
        result.errors.push(`Relationship defined inside entity block at line ${i + 1}. Close the entity definition first.`);
        continue;
      }
      
      // Check for malformed attribute lines within entities
      if (openBraces.length > 0) {
        // Attributes should follow the pattern: type name [PK/FK] [required]
        const attributeMatch = line.match(/^\s*(\w+)\s+(\w+)(\s+.*)?$/);
        if (line.length > 0 && !attributeMatch && !line.startsWith('%%')) {
          result.isValid = false;
          result.errors.push(`Malformed attribute on line ${i + 1} in entity "${currentEntity}": "${line}"`);
        }
      }
    }
    
    // Check for unclosed entity definitions
    if (openBraces.length > 0) {
      for (const brace of openBraces) {
        result.isValid = false;
        result.errors.push(`Unclosed entity definition for '${brace.entity}' started on line ${brace.line}`);
      }
    }
    
    // Check for duplicate entity definitions
    const entityCounts = {};
    for (const entity of entities) {
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    }
    
    for (const [entity, count] of Object.entries(entityCounts)) {
      if (count > 1) {
        result.isValid = false;
        result.errors.push(`Duplicate entity definition: '${entity}' defined ${count} times`);
      }
    }
  }
}

module.exports = new MermaidGeneratorService();
