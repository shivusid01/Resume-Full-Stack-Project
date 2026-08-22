import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) {
            return;
        }

        mongoose.connection.on("connected", () => {
            console.log("Database Connected Successfully");
        });

        mongoose.connection.on("error", (error) => {
            console.error("MongoDB connection error:", error);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

        const mongodbURI = process.env.MONGODB_URI;

        if (!mongodbURI) {
            throw new Error("MONGODB_URI environment variable is not set");
        }

        await mongoose.connect(mongodbURI, {
            serverSelectionTimeoutMS: 10000,
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
};

export default connectDB;