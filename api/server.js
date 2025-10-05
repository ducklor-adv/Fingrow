import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API configuration
import { initDatabase, getDatabase } from './config/database.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
const db = initDatabase();
app.locals.db = db;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files for web interfaces
app.use(express.static(path.join(__dirname, '../')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/mobile', express.static(path.join(__dirname, '../mobile')));

// API routes
app.use('/api', apiRoutes);

// Serve index files for SPA routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.get('/mobile/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../mobile/index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🌱 Fingrow API Server                          ║
║   ━━━━━━━━━━━━━━━━━━━━━                          ║
║                                                   ║
║   🚀 Server running on port ${PORT}                  ║
║   📍 http://localhost:${PORT}                        ║
║                                                   ║
║   📱 Mobile App: http://localhost:${PORT}/mobile    ║
║   🖥️  Admin Panel: http://localhost:${PORT}/admin    ║
║   🔌 API Base: http://localhost:${PORT}/api         ║
║                                                   ║
║   Press Ctrl+C to stop the server                 ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});

export default app;