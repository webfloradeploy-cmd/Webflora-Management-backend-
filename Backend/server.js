import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import adminRoutes from './route/adminRoute.js';
import employeeRoutes from './route/employeeRoute.js';
import connectDB from './config/mongoDB.js';
import communicationRoutes from './route/communicationRoute.js';
import noticeRoutes from './route/noticeRoute.js';
import attendanceRoute from './route/attendanceRoute.js';
import internRoute from "./route/internRoute.js";
import clientRoute from "./route/clientRoute.js";
import invoiceRoute from './route/invoiceRoute.js';
import projectRoute from './route/projectRoute.js';
import handoverRoute from './route/handoverRoute.js';
import salaryRoute from './route/salaryRoute.js';
import authRoutes from './route/authRoute.js';
import reportRoutes from './route/reportRoute.js';
import activityRoutes from './route/activityRoute.js';
import expenseRoutes from './route/expenseRoute.js';
import leadRoutes from './route/leadRoute.js';
import quotationRoutes from './route/quotationRoute.js';
import agreementRoutes from './route/agreementRoute.js';
import { verifyEmailConfig } from './utils/emailService.js';

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:8080', 
    'http://localhost:8081', 
    'https://webflora-management-frontend.vercel.app', 
    'https://crm.webfloratechnologies.com'
];

const checkCorsOrigin = (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    // Allow any localhost or 127.0.0.1 port (for local dev)
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, origin);
    }
    // Allow vercel preview / production domains
    if (origin.endsWith('.vercel.app')) {
        return callback(null, origin);
    }
    return callback(null, false);
};

app.use(cors({
    origin: checkCorsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicit preflight handler for all routes
app.options('{*path}', cors({
    origin: checkCorsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check / Root route
app.get('/', (req, res) => {
    res.send('Hello From Backend!');
});
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/attendance', attendanceRoute);
app.use('/api/intern', internRoute);
app.use('/api/client', clientRoute);
app.use('/api/invoice', invoiceRoute);
app.use('/api/project', projectRoute);
app.use('/api/handover', handoverRoute);
app.use('/api/salary', salaryRoute);
app.use('/api/auth', authRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/lead', leadRoutes);
app.use('/api/quotation', quotationRoutes);
app.use('/api/agreement', agreementRoutes);


// Connect to MongoDB
connectDB();

// Run SMTP verification diagnostic check (non-blocking)
verifyEmailConfig().catch(err => {
    console.warn('[SMTP Startup Diagnostic Warning]:', err.message);
});

const PORT = process.env.PORT || 5001;

// Only listen when not running on Vercel (Vercel uses the exported app directly)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
