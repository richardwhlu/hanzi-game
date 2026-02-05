/**
 * JSON Schema definitions for the Hanzi Game data structures
 * Provides strict validation for characters, phrases, players, items, and bags
 * @version 1.0.0
 */

// Schema version for migration tracking
export const SCHEMA_VERSION = '1.0.0';

/**
 * Character schema definition
 */
export const CHARACTER_SCHEMA = {
    type: 'object',
    properties: {
        char: {
            type: 'string',
            minLength: 1,
            maxLength: 1,
            description: 'The Chinese character'
        },
        pinyin: {
            type: 'string',
            pattern: '^[a-zA-ZüÜ\\s]+$',
            description: 'Pinyin pronunciation'
        },
        strokes: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Number of strokes in the character'
        },
        difficulty: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Difficulty level (1-5)'
        },
        frequency: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Usage frequency score (0-100)'
        },
        level: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Character progression level'
        },
        xp: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Experience points earned'
        },
        totalPractices: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total number of practice sessions'
        },
        totalMistakes: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total mistakes made during practice'
        },
        bestAccuracy: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 0,
            description: 'Best accuracy percentage achieved'
        },
        unlocked: {
            type: 'boolean',
            default: true,
            description: 'Whether the character is unlocked for practice'
        },
        isPhraseCharacter: {
            type: 'boolean',
            default: false,
            description: 'Whether this character was generated from a phrase'
        },
        originalPhrase: {
            type: ['string', 'null'],
            default: null,
            description: 'Original phrase text if this is a phrase character'
        }
    },
    required: ['char', 'pinyin', 'strokes', 'difficulty', 'frequency'],
    additionalProperties: false
};

/**
 * Phrase schema definition
 */
export const PHRASE_SCHEMA = {
    type: 'object',
    properties: {
        text: {
            type: 'string',
            minLength: 1,
            description: 'The complete phrase text'
        },
        characters: {
            type: 'array',
            items: {
                type: 'string',
                minLength: 1,
                maxLength: 1
            },
            minItems: 1,
            description: 'Array of characters that make up the phrase'
        },
        requirements: {
            type: 'object',
            patternProperties: {
                '^.{1}$': {
                    type: 'integer',
                    minimum: 1
                }
            },
            additionalProperties: false,
            description: 'Character level requirements to unlock this phrase'
        },
        difficulty: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Phrase difficulty level (1-5)'
        },
        frequency: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Usage frequency score (0-100)'
        },
        pinyin: {
            type: 'string',
            description: 'Pinyin pronunciation of the phrase'
        },
        meaning: {
            type: 'string',
            description: 'English meaning/translation'
        },
        level: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Phrase progression level'
        },
        xp: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Experience points earned'
        },
        unlocked: {
            type: 'boolean',
            default: false,
            description: 'Whether the phrase is unlocked for practice'
        },
        totalPractices: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total number of practice sessions'
        },
        firstTimeCompleted: {
            type: 'boolean',
            default: false,
            description: 'Whether the phrase has been completed at least once'
        }
    },
    required: ['text', 'characters', 'requirements', 'difficulty', 'frequency', 'pinyin', 'meaning'],
    additionalProperties: false
};

/**
 * Item schema definition
 */
export const ITEM_SCHEMA = {
    type: 'object',
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            description: 'Unique item identifier'
        },
        name: {
            type: 'string',
            minLength: 1,
            description: 'Display name of the item'
        },
        description: {
            type: 'string',
            description: 'Item description'
        },
        type: {
            type: 'string',
            enum: ['xp_boost', 'misc'],
            description: 'Item type/category'
        },
        value: {
            type: 'integer',
            minimum: 0,
            description: 'Item value (e.g., XP amount for boosts)'
        },
        rarity: {
            type: 'string',
            enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
            description: 'Item rarity level'
        },
        icon: {
            type: 'string',
            description: 'Emoji or icon representation'
        },
        quantity: {
            type: 'integer',
            minimum: 0,
            default: 1,
            description: 'Number of items in this stack'
        }
    },
    required: ['id', 'name', 'type', 'value', 'rarity'],
    additionalProperties: false
};

/**
 * Bag/Inventory schema definition
 */
export const BAG_SCHEMA = {
    type: 'object',
    properties: {
        maxSlots: {
            type: 'integer',
            minimum: 1,
            default: 50,
            description: 'Maximum number of item slots'
        },
        items: {
            type: 'object',
            patternProperties: {
                '^.+$': {
                    $ref: '#/definitions/item'
                }
            },
            additionalProperties: false,
            description: 'Items in the bag, keyed by item ID'
        }
    },
    required: ['maxSlots', 'items'],
    additionalProperties: false,
    definitions: {
        item: ITEM_SCHEMA
    }
};

/**
 * Player schema definition
 */
export const PLAYER_SCHEMA = {
    type: 'object',
    properties: {
        level: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Player level'
        },
        xp: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Player experience points'
        },
        totalCharacters: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total characters learned'
        },
        totalPhrases: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total phrases learned'
        },
        totalPracticeTime: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Total practice time in milliseconds'
        },
        achievements: {
            type: 'array',
            items: {
                type: 'string'
            },
            default: [],
            description: 'Array of achievement IDs'
        }
    },
    required: ['level', 'xp'],
    additionalProperties: false
};

/**
 * Game data collection schemas
 */
export const GAME_DATA_SCHEMA = {
    type: 'object',
    properties: {
        version: {
            type: 'string',
            description: 'Data schema version'
        },
        characters: {
            type: 'object',
            patternProperties: {
                '^.{1}$': {
                    $ref: '#/definitions/character'
                }
            },
            additionalProperties: false,
            description: 'Character collection keyed by character'
        },
        phrases: {
            type: 'object',
            patternProperties: {
                '^.+$': {
                    $ref: '#/definitions/phrase'
                }
            },
            additionalProperties: false,
            description: 'Phrase collection keyed by phrase text'
        },
        player: {
            $ref: '#/definitions/player',
            description: 'Player progression data'
        },
        bag: {
            $ref: '#/definitions/bag',
            description: 'Player inventory/bag'
        }
    },
    required: ['version', 'characters', 'phrases', 'player', 'bag'],
    additionalProperties: false,
    definitions: {
        character: CHARACTER_SCHEMA,
        phrase: PHRASE_SCHEMA,
        item: ITEM_SCHEMA,
        bag: BAG_SCHEMA,
        player: PLAYER_SCHEMA
    }
};

/**
 * Validation function factory
 * Creates a validation function for a given schema
 * @param {Object} schema - JSON schema object
 * @returns {Function} Validation function
 */
export function createValidator(schema) {
    return function validate(data) {
        const errors = [];
        
        // Basic type validation
        function validateType(value, expectedType, path = '') {
            if (expectedType === 'object' && (value === null || Array.isArray(value))) {
                errors.push(`${path}: Expected object, got ${value === null ? 'null' : 'array'}`);
                return false;
            }
            
            if (expectedType === 'array' && !Array.isArray(value)) {
                errors.push(`${path}: Expected array, got ${typeof value}`);
                return false;
            }
            
            if (expectedType !== 'array' && expectedType !== 'object') {
                const actualType = typeof value;
                if (actualType !== expectedType) {
                    errors.push(`${path}: Expected ${expectedType}, got ${actualType}`);
                    return false;
                }
            }
            
            return true;
        }
        
        function validateProperty(value, propSchema, path) {
            // Handle type validation
            if (propSchema.type) {
                const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
                let validType = false;
                
                for (const type of types) {
                    if (type === 'null' && value === null) {
                        validType = true;
                        break;
                    }
                    if (validateType(value, type, path)) {
                        validType = true;
                        break;
                    }
                }
                
                if (!validType) {
                    return;
                }
            }
            
            // Skip null values for further validation
            if (value === null) {
                return;
            }
            
            // Validate constraints
            if (propSchema.minimum !== undefined && value < propSchema.minimum) {
                errors.push(`${path}: Value ${value} is below minimum ${propSchema.minimum}`);
            }
            
            if (propSchema.maximum !== undefined && value > propSchema.maximum) {
                errors.push(`${path}: Value ${value} is above maximum ${propSchema.maximum}`);
            }
            
            if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
                errors.push(`${path}: String length ${value.length} is below minimum ${propSchema.minLength}`);
            }
            
            if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
                errors.push(`${path}: String length ${value.length} is above maximum ${propSchema.maxLength}`);
            }
            
            if (propSchema.pattern && !new RegExp(propSchema.pattern).test(value)) {
                errors.push(`${path}: Value "${value}" does not match pattern ${propSchema.pattern}`);
            }
            
            if (propSchema.enum && !propSchema.enum.includes(value)) {
                errors.push(`${path}: Value "${value}" is not in allowed values: ${propSchema.enum.join(', ')}`);
            }
            
            // Validate array items
            if (propSchema.items && Array.isArray(value)) {
                value.forEach((item, index) => {
                    validateProperty(item, propSchema.items, `${path}[${index}]`);
                });
                
                if (propSchema.minItems !== undefined && value.length < propSchema.minItems) {
                    errors.push(`${path}: Array length ${value.length} is below minimum ${propSchema.minItems}`);
                }
            }
            
            // Validate object properties
            if (propSchema.properties && typeof value === 'object' && !Array.isArray(value)) {
                for (const [key, subSchema] of Object.entries(propSchema.properties)) {
                    if (value.hasOwnProperty(key)) {
                        validateProperty(value[key], subSchema, `${path}.${key}`);
                    }
                }
            }
            
            // Validate pattern properties
            if (propSchema.patternProperties && typeof value === 'object' && !Array.isArray(value)) {
                for (const [pattern, subSchema] of Object.entries(propSchema.patternProperties)) {
                    const regex = new RegExp(pattern);
                    for (const [key, val] of Object.entries(value)) {
                        if (regex.test(key)) {
                            validateProperty(val, subSchema, `${path}.${key}`);
                        }
                    }
                }
            }
        }
        
        // Validate required properties
        if (schema.required && typeof data === 'object' && !Array.isArray(data) && data !== null) {
            for (const requiredProp of schema.required) {
                if (!data.hasOwnProperty(requiredProp)) {
                    errors.push(`Missing required property: ${requiredProp}`);
                }
            }
        }
        
        // Validate root object
        validateProperty(data, schema, 'root');
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    };
}

// Create pre-built validators for common schemas
export const validateCharacter = createValidator(CHARACTER_SCHEMA);
export const validatePhrase = createValidator(PHRASE_SCHEMA);
export const validateItem = createValidator(ITEM_SCHEMA);
export const validateBag = createValidator(BAG_SCHEMA);
export const validatePlayer = createValidator(PLAYER_SCHEMA);
export const validateGameData = createValidator(GAME_DATA_SCHEMA);

/**
 * Validate and sanitize data with default values
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema to validate against  
 * @param {Function} validator - Validation function
 * @returns {Object} Sanitized data with defaults applied
 */
export function validateAndSanitize(data, schema, validator) {
    // Apply defaults
    function applyDefaults(obj, schemaObj) {
        if (!schemaObj.properties) return obj;
        
        const result = { ...obj };
        
        for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
            if (propSchema.default !== undefined && result[key] === undefined) {
                result[key] = propSchema.default;
            }
            
            if (propSchema.type === 'object' && result[key] && propSchema.properties) {
                result[key] = applyDefaults(result[key], propSchema);
            }
        }
        
        return result;
    }
    
    const sanitized = applyDefaults(data, schema);
    const validation = validator(sanitized);
    
    return {
        data: sanitized,
        ...validation
    };
}
