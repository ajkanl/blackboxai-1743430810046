const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
const users = new Map();
const tasks = new Map();
const otps = new Map();

// Email configuration (replace with your email service credentials in production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: 'your-password'         // Replace with your password
    }
});

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Endpoints
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (users.has(email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Store user
        users.set(email, { name, password });
        
        // Generate and store OTP
        const otp = generateOTP();
        otps.set(email, otp);

        // Send OTP email
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Your OTP for Task Scheduler',
            text: `Your OTP is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Signup successful. Please check your email for OTP.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/verify', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedOTP = otps.get(email);
    if (!storedOTP || storedOTP !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Clear OTP after successful verification
    otps.delete(email);
    res.json({ message: 'OTP verified successfully' });
});

app.post('/tasks', (req, res) => {
    try {
        const { email, title, description, scheduledDate } = req.body;

        if (!email || !title || !description || !scheduledDate) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userTasks = tasks.get(email) || [];
        userTasks.push({
            id: Date.now().toString(),
            title,
            description,
            scheduledDate: new Date(scheduledDate)
        });
        tasks.set(email, userTasks);

        res.json({ message: 'Task created successfully', tasks: userTasks });
    } catch (error) {
        console.error('Task creation error:', error);
        res.status(500).json({ error: 'Server error while creating task' });
    }
});

app.get('/tasks/:email', (req, res) => {
    try {
        const { email } = req.params;
        const userTasks = tasks.get(email) || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTasks = userTasks.filter(task => {
            const taskDate = new Date(task.scheduledDate);
            return taskDate >= today && taskDate < tomorrow;
        });

        const upcomingTasks = userTasks.filter(task => {
            const taskDate = new Date(task.scheduledDate);
            return taskDate >= tomorrow;
        });

        res.json({
            todayTasks,
            upcomingTasks
        });
    } catch (error) {
        console.error('Task retrieval error:', error);
        res.status(500).json({ error: 'Server error while retrieving tasks' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});