import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

/* =======================
   BASIC SETUP
======================= */
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic-platform';

/* =======================
   MONGODB CONNECT
======================= */
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error(err));

/* =======================
   MODELS
======================= */
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
});

const IssueSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    status: String,
    location: String,
    createdBy: String,
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
const Issue = mongoose.model('Issue', IssueSchema);

/* =======================
   SEED DUMMY DATA
======================= */
const seedData = async () => {
  if (await User.countDocuments()) return;

  const password = await bcrypt.hash('password123', 10);

  const users = await User.insertMany([
    { name: 'Ravi Kumar', email: 'user@test.com', password, role: 'user' },
    { name: 'Anita Volunteer', email: 'volunteer@test.com', password, role: 'volunteer' },
    { name: 'City Admin', email: 'admcomin@test.', password, role: 'admin' },
  ]);

  await Issue.insertMany([
    {
      title: 'Garbage overflow near market',
      description: 'Garbage not collected for 4 days.',
      status: 'pending',
      location: 'Main Market Road',
      createdBy: users[0]._id,
    },
    {
      title: 'Street light not working',
      description: 'Dark street causing safety issues.',
      status: 'in-progress',
      location: 'Green Park',
      createdBy: users[1]._id,
    },
    {
      title: 'Water leakage from pipe',
      description: 'Continuous leakage wasting water.',
      status: 'resolved',
      location: 'Sector 12',
      createdBy: users[0]._id,
    },
  ]);

  console.log('🌱 Dummy data seeded');
};

seedData();

/* =======================
   API ROUTES (PREFIX /api)
======================= */

/* AUTH */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

/* ISSUES */
app.get('/api/issues', async (req, res) => {
  const issues = await Issue.find().sort({ createdAt: -1 });
  res.json(issues);
});

app.get('/api/issues/:id', async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  res.json(issue);
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
