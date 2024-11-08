// Required dependencies
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs').promises; // Using promises for file operations
require('dotenv').config();
const { validatePost } = require('./validators'); // Adjust the path as necessary

const app = express();
const DATA_FILE = 'posts.json'; // File to store posts

// Middleware
app.use(cors({
  origin: '*',
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
})

app.use(express.json());

// Ensure the data file exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
}

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', (req, res) => {
  const { email = null, password = null } = req?.body;
  // Demo credentials - replace with proper auth in production
  if (email === 'test@example.com' && password === 'password') {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials Provided!' });
  }
});

// Helper function to read posts from the file
async function readPosts() {
  const data = await fs.readFile(DATA_FILE);
  return JSON.parse(data);
}

// Helper function to write posts to the file
async function writePosts(posts) {
  await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2));
}

// Get posts with pagination
app.get('/api/posts', authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;

  try {
    const posts = await readPosts();
    const paginatedPosts = posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .slice(skip, skip + limit);

    res.json({
      posts: paginatedPosts,
      totalPages: Math.ceil(posts.length / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
app.get('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const posts = await readPosts();
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create post
app.post('/api/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await readPosts();
    const newPost = {
      id: String(Date.now()), // Simple ID generation based on timestamp
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { error } = validatePost({ 
      ...newPost
    });
  
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    posts.push(newPost);
    await writePosts(posts);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update post
app.put('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const posts = await readPosts();
    const index = posts.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Post not found' });

    posts[index] = { ...posts[index], ...req.body, updatedAt: new Date() };
    await writePosts(posts);
    res.json(posts[index]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete post
app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const posts = await readPosts();
    const index = posts.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Post not found' });

    posts.splice(index, 1);
    await writePosts(posts);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Ensure data file exists and start server
ensureDataFile()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch(err => console.error('Error ensuring data file:', err));
