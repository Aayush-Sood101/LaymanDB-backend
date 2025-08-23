const mongoose = require('mongoose');

// Column Schema
const ColumnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataType: { type: String, required: true },
  isPrimaryKey: { type: Boolean, default: false },
  isForeignKey: { type: Boolean, default: false },
  isNullable: { type: Boolean, default: true },
  isUnique: { type: Boolean, default: false },
  defaultValue: { type: String },
  references: {
    table: { type: String },
    column: { type: String },
    onDelete: { type: String, enum: ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'], default: 'NO ACTION' },
    onUpdate: { type: String, enum: ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'], default: 'NO ACTION' }
  },
  description: { type: String }
});

// Attribute Schema (for relationship attributes)
const AttributeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dataType: { type: String },
  isPrimaryKey: { type: Boolean, default: false },
  isForeignKey: { type: Boolean, default: false },
  isNullable: { type: Boolean, default: true },
  isMultiValued: { type: Boolean, default: false },
  description: { type: String }
});

// Table Schema
const TableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  columns: [ColumnSchema],
  description: { type: String },
  isWeakEntity: { type: Boolean, default: false },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
});

// Relationship Schema
const RelationshipSchema = new mongoose.Schema({
  name: { type: String },
  sourceTable: { type: String, required: true },
  sourceEntity: { type: String },
  targetTable: { type: String, required: true },
  targetEntity: { type: String },
  sourceColumn: { type: String, required: true },
  targetColumn: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'], 
    required: true 
  },
  isIdentifying: { type: Boolean, default: false },
  attributes: [AttributeSchema],
  sourceCardinality: { type: String },
  targetCardinality: { type: String },
  sourceParticipation: { type: String },
  targetParticipation: { type: String },
  description: { type: String },
  position: { 
    x: { type: Number },
    y: { type: Number },
    isDraggable: { type: Boolean, default: true }
  }
});

// Database Schema Model
const DatabaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  tables: [TableSchema],
  relationships: [RelationshipSchema],
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Schema = mongoose.model('Schema', DatabaseSchema);

module.exports = Schema;
