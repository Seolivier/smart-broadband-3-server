// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// ===============================
// 🛠️ Load Environment Variables
// ===============================
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvbowddtvansmqvmivke.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY is not set. Add it to your .env file.');
  process.exit(1);
}

// ===============================
// 🟢 CORS Configuration
// ===============================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  FRONTEND_URL
];

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// ===============================
// 🗄️ Supabase Client
// ===============================
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  fetch: (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)),
  autoRefreshToken: true,
  persistSession: false,
  detectSessionInUrl: false
});

// Confirm Supabase connection
console.log('🗄️ Database: Supabase Connected');

// ===============================
// 🛠️ Helper to initialize tables if not exist
// ===============================
async function createClientsTable() {
  try {
    await supabase.from('clients').select('*').limit(1);
    console.log('✅ Clients table ready');
  } catch (err) {
    console.error('❌ Error accessing Clients table:', err.message);
  }
}

// ===============================
// 🛠️ API ROUTES
// ===============================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: '✅ Smart Broadband Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('❌ Error fetching clients:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching client:', err.message);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const clientData = req.body;
    const { data, error } = await supabase.from('clients').insert([clientData]);
    if (error) throw error;
    res.json({ message: '✅ Client added successfully', client: data[0] });
  } catch (err) {
    console.error('❌ Error adding client:', err.message);
    res.status(500).json({ error: 'Failed to add client' });
  }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientData = req.body;
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id);
    if (error) throw error;
    res.json({ message: '✅ Client updated successfully', client: data[0] });
  } catch (err) {
    console.error('❌ Error updating client:', err.message);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: '✅ Client deleted successfully', client: data[0] });
  } catch (err) {
    console.error('❌ Error deleting client:', err.message);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ===============================
// 🚀 Start Server
// ===============================
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🌐 Allowed Origins:', allowedOrigins);

  // Initialize tables
  await createClientsTable();
});





