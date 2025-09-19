
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Pool configuration
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

// Test PostgreSQL connection
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL', err.message);
    });

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route for the homepage
app.get('/', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Endpoints for PostgreSQL
// Create a new post
app.post('/api/posts/pg', async (req, res) => {
    console.log('POST /api/posts/pg - Request received');
    const { title, author, content } = req.body;
    console.log('Request body:', { title, author, content });
    try {
        console.log('Executing INSERT query...');
        const result = await pool.query(
            'INSERT INTO posts (title, author, content) VALUES ($1, $2, $3) RETURNING *',
            [title, author, content]
        );
        console.log('INSERT query successful. New post created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating post:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all posts
app.get('/api/posts/pg', async (req, res) => {
    console.log('GET /api/posts/pg - Request received');
    try {
        console.log('Executing SELECT all posts query...');
        const result = await pool.query('SELECT * FROM posts ORDER BY id DESC');
        console.log(`SELECT all posts query successful. Found ${result.rows.length} posts.`);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error retrieving all posts:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get a single post by ID
app.get('/api/posts/pg/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`GET /api/posts/pg/${id} - Request received`);
    try {
        console.log(`Executing SELECT post by ID (${id}) query...`);
        const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            console.log(`Post with ID ${id} not found.`);
            return res.status(404).json({ error: 'Post not found' });
        }
        console.log(`SELECT post by ID (${id}) query successful. Found post:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error retrieving post ${id}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a post by ID
app.put('/api/posts/pg/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, content } = req.body;
    console.log(`PUT /api/posts/pg/${id} - Request received. Body:`, { title, author, content });
    try {
        console.log(`Executing UPDATE post by ID (${id}) query...`);
        const result = await pool.query(
            'UPDATE posts SET title = $1, author = $2, content = $3 WHERE id = $4 RETURNING *',
            [title, author, content, id]
        );
        if (result.rows.length === 0) {
            console.log(`Post with ID ${id} not found for update.`);
            return res.status(404).json({ error: 'Post not found' });
        }
        console.log(`UPDATE post by ID (${id}) query successful. Updated post:`, result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating post ${id}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a post by ID
app.delete('/api/posts/pg/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/posts/pg/${id} - Request received`);
    try {
        console.log(`Executing DELETE post by ID (${id}) query...`);
        const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            console.log(`Post with ID ${id} not found for deletion.`);
            return res.status(404).json({ error: 'Post not found' });
        }
        console.log(`DELETE post by ID (${id}) query successful.`);
        res.status(204).send(); // No content to send back on successful deletion
    } catch (err) {
        console.error(`Error deleting post ${id}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
