import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { UserModel, UserRole } from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();


const connectionString = process.env.MONGO_URI || "";

export const db = mongoose.connect(connectionString, { dbName: 'blog-db'})
    .then(async () => {
        console.log("Connected to MongoDB");

        const adminEmail = "admin@demo.com";
        let admin = await UserModel.findOne({ email: adminEmail });
        if (!admin) {
            admin = await UserModel.create({
                name: "Admin",
                email: adminEmail,
                password: await bcrypt.hash("Admin123", 10),
                roles: [UserRole.ADMIN],
            });
        
            console.log("Admin:", (admin._id as mongoose.Types.ObjectId).toString());

        } else {
            console.log(`Admin already exists with ${adminEmail}`);
        }

        const userEmail = "user@demo.com";
        let user = await UserModel.findOne({ email: userEmail });
        if (!user) {
            user = await UserModel.create({
                name: "User",
                email: userEmail,
                password: await bcrypt.hash("User123", 10),
                roles: [UserRole.USER],
            });
            
            console.log("User:", (user._id as mongoose.Types.ObjectId).toString());

        } else {
            console.log(`User already exists with ${userEmail}`);
        }
    })
    .catch((error) => console.error(error));
