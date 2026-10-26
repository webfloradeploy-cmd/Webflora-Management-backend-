import mongoose from 'mongoose';
import dns from 'dns';

let cachedPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (cachedPromise) {
        return cachedPromise;
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    // Only set custom DNS in local development where ISP DNS might block SRV records.
    // NEVER override DNS servers on Vercel / AWS Lambda, as custom DNS is blocked by AWS VPC firewall and breaks all network queries!
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
        try {
            dns.setServers(['1.1.1.1', '8.8.8.8']);
        } catch (err) {
            console.warn('Warning: Could not set custom DNS servers:', err.message);
        }
    }

    cachedPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    }).then((m) => {
        console.log("DB Connected successfully");
        return m;
    }).catch(err => {
        cachedPromise = null;
        console.error("DB Connection Failed:", err.message);
        throw err;
    });

    return cachedPromise;
};

export default connectDB;