// Cloud-compatible database configuration for Render.com
// This version avoids better-sqlite3 compilation issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple JSON-based database for cloud deployment
class CloudDatabase {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data');
        this.dbFile = path.join(this.dataPath, 'fingrow.json');
        this.data = {
            users: [],
            products: [],
            orders: [],
            earnings: [],
            categories: []
        };
        this.ensureDataDirectory();
        this.loadData();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    loadData() {
        try {
            if (fs.existsSync(this.dbFile)) {
                const jsonData = fs.readFileSync(this.dbFile, 'utf8');
                this.data = JSON.parse(jsonData);
            } else {
                this.initializeDefaultData();
                this.saveData();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.initializeDefaultData();
        }
    }

    saveData() {
        try {
            fs.writeFileSync(this.dbFile, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    initializeDefaultData() {
        // Create root user
        const rootUser = {
            id: '25AAA0000',
            username: 'Anatta999',
            email: 'root@fingrow.app',
            password: '$2a$10$defaulthash', // Default hashed password
            full_name: 'Anatta Boonnuam',
            invite_code: 'ANATTA999ROOT',
            invitor_id: null,
            parent_id: null,
            status: 'active',
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        };

        this.data.users = [rootUser];
        this.data.categories = [
            { id: '1', name: 'เสื้อผ้า', slug: 'clothing' },
            { id: '2', name: 'อิเล็กทรอนิกส์', slug: 'electronics' },
            { id: '3', name: 'เครื่องใช้ในบ้าน', slug: 'home' },
            { id: '4', name: 'กีฬา', slug: 'sports' },
            { id: '5', name: 'หนังสือ', slug: 'books' },
            { id: '6', name: 'ของเล่น', slug: 'toys' },
            { id: '7', name: 'เครื่องสำอาง', slug: 'beauty' },
            { id: '8', name: 'อื่นๆ', slug: 'other' }
        ];
    }

    // SQLite-compatible query methods
    prepare(query) {
        return {
            get: (...params) => this.executeQuery(query, params, 'get'),
            all: (...params) => this.executeQuery(query, params, 'all'),
            run: (...params) => this.executeQuery(query, params, 'run')
        };
    }

    executeQuery(query, params, type) {
        try {
            const normalizedQuery = query.toLowerCase().trim();
            
            if (normalizedQuery.startsWith('select')) {
                return this.handleSelect(query, params, type);
            } else if (normalizedQuery.startsWith('insert')) {
                return this.handleInsert(query, params);
            } else if (normalizedQuery.startsWith('update')) {
                return this.handleUpdate(query, params);
            } else if (normalizedQuery.startsWith('delete')) {
                return this.handleDelete(query, params);
            }
            
            return type === 'all' ? [] : null;
        } catch (error) {
            console.error('Query error:', error);
            return type === 'all' ? [] : null;
        }
    }

    handleSelect(query, params, type) {
        const tableMatch = query.match(/from\s+(\w+)/i);
        if (!tableMatch) return type === 'all' ? [] : null;
        
        const tableName = tableMatch[1];
        const data = this.data[tableName] || [];
        
        // Simple filtering (this is a basic implementation)
        let results = [...data];
        
        // Handle WHERE conditions (basic implementation)
        const whereMatch = query.match(/where\s+(.+?)(?:\s+order|\s+limit|$)/i);
        if (whereMatch && params.length > 0) {
            const whereClause = whereMatch[1];
            if (whereClause.includes('id = ?')) {
                results = results.filter(item => item.id === params[0]);
            } else if (whereClause.includes('username = ?')) {
                results = results.filter(item => item.username === params[0]);
            }
        }
        
        // Handle LIMIT
        const limitMatch = query.match(/limit\s+(\d+)(?:\s+offset\s+(\d+))?/i);
        if (limitMatch) {
            const limit = parseInt(limitMatch[1]);
            const offset = parseInt(limitMatch[2]) || 0;
            results = results.slice(offset, offset + limit);
        }
        
        return type === 'get' ? results[0] || null : results;
    }

    handleInsert(query, params) {
        const tableMatch = query.match(/insert\s+into\s+(\w+)/i);
        if (!tableMatch) return { changes: 0 };
        
        const tableName = tableMatch[1];
        if (!this.data[tableName]) this.data[tableName] = [];
        
        // Extract column names and values (basic implementation)
        const columnsMatch = query.match(/\(([^)]+)\)/);
        const valuesMatch = query.match(/values\s*\(([^)]+)\)/i);
        
        if (columnsMatch && valuesMatch) {
            const columns = columnsMatch[1].split(',').map(col => col.trim());
            const newItem = {};
            
            columns.forEach((col, index) => {
                newItem[col] = params[index];
            });
            
            this.data[tableName].push(newItem);
            this.saveData();
            return { changes: 1 };
        }
        
        return { changes: 0 };
    }

    handleUpdate(query, params) {
        const tableMatch = query.match(/update\s+(\w+)/i);
        if (!tableMatch) return { changes: 0 };
        
        const tableName = tableMatch[1];
        const data = this.data[tableName] || [];
        
        // Simple update implementation
        const whereMatch = query.match(/where\s+id\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
            const targetId = params[params.length - 1]; // ID is usually last parameter
            const itemIndex = data.findIndex(item => item.id === targetId);
            
            if (itemIndex !== -1) {
                // Basic field updates (this would need to be more sophisticated)
                const setMatch = query.match(/set\s+(.+?)\s+where/i);
                if (setMatch) {
                    const setClause = setMatch[1];
                    const updates = setClause.split(',');
                    
                    updates.forEach((update, index) => {
                        const fieldMatch = update.trim().match(/(\w+)\s*=\s*\?/);
                        if (fieldMatch && params[index] !== undefined) {
                            data[itemIndex][fieldMatch[1]] = params[index];
                        }
                    });
                }
                
                this.saveData();
                return { changes: 1 };
            }
        }
        
        return { changes: 0 };
    }

    handleDelete(query, params) {
        const tableMatch = query.match(/delete\s+from\s+(\w+)/i);
        if (!tableMatch) return { changes: 0 };
        
        const tableName = tableMatch[1];
        const data = this.data[tableName] || [];
        const originalLength = data.length;
        
        // Simple delete implementation
        if (params.length > 0) {
            this.data[tableName] = data.filter(item => item.id !== params[0]);
            this.saveData();
            return { changes: originalLength - this.data[tableName].length };
        }
        
        return { changes: 0 };
    }

    exec(query) {
        // Handle simple exec queries
        console.log('Executing:', query);
    }
}

let db = null;

export const initDatabase = () => {
    if (db) return db;
    
    try {
        if (process.env.NODE_ENV === 'production' && process.env.RENDER) {
            // Use JSON database for Render.com
            db = new CloudDatabase();
            console.log('✅ Cloud JSON Database initialized');
        } else {
            // Use SQLite for local development
            const Database = require('better-sqlite3');
            const dbPath = path.join(__dirname, '../../data', 'fingrow.db');
            db = new Database(dbPath);
            db.exec('PRAGMA foreign_keys = OFF');
            console.log('✅ SQLite Database connected:', dbPath);
        }
        
        return db;
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        // Fallback to JSON database
        db = new CloudDatabase();
        console.log('✅ Fallback to JSON Database');
        return db;
    }
};

export const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

export default { initDatabase, getDatabase };