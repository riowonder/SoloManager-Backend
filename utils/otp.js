import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import User from "../models/user.js";
import redis from "../config/redisClient.js";
import "dotenv/config";

// Generate a 4-digit numeric OTP
const generateOTP = () => {
    return otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });
};

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.OTP_EMAIL,  // Sender's email
        pass: process.env.OTP_PSWD  // App password from Google
    },
});

// Function to send OTP via email
export const sendmail = async (email) => {
    try {
        // Check if OTP was recently requested (Rate Limiting)
        const otpRequestedRecently = await redis.get(`user:${email}:otp_requested`);
        if (otpRequestedRecently) {
            console.log(`OTP request blocked for ${email} (Too many requests)`);
            return { success: false, message: "You can request a new OTP after 1 minute." };
        }

        // Generate OTP
        let OTP = generateOTP();

        // Store OTP in Redis for the user (expires in 5 minutes)
        await redis.setex(`user:${email}:otp`, 300, OTP);

        // Set rate limiting flag (expires in 60 seconds)
        await redis.setex(`user:${email}:otp_requested`, 60, "true");

        // Send OTP email
        const mailOptions = {
            from: `"Zenith Manager Support" <${process.env.OTP_EMAIL}>`,
            to: email,
            subject: "🔐 Zenith Manager OTP Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="text-align: center; color: #333;">Zenith Manager OTP Verification</h2>
                    <p>Hello,</p>
                    <p>Thank you for using <strong>Zenith Manager</strong>! Please use the following OTP:</p>
                    <div style="text-align: center; font-size: 22px; font-weight: bold; background: #007bff; color: #fff; padding: 10px; border-radius: 5px; width: fit-content; margin: 10px auto;">
                        ${OTP}
                    </div>
                    <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <br>
                    <p style="color: #555;">Best regards,</p>
                    <p><strong>Zenith Manager Team</strong></p>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log("OTP sent to:", email, "Message ID:", info.messageId);
        return { success: true, message: "OTP sent successfully!" };

    } catch (err) {
        console.error("Error sending email:", err);
        return { success: false, message: "Error sending OTP." };
    }
};


export const sendResetPasswordMail = async (email) => {
    try {
        // Check if OTP was requested recently (rate limiting)
        const otpRequestedRecently = await redis.get(`admin:${email}:otp_requested`);
        if (otpRequestedRecently) {
            console.log(`OTP request blocked for ${email} (Too many requests)`);
            return { success: false, message: "You can request a new OTP after 1 minute." };
        }

        // Generate OTP
        let OTP = generateOTP();

        // Store OTP in Redis for the admin (expires in 5 minutes)
        await redis.setex(`admin:${email}:otp`, 300, OTP);

        // Set rate limiting flag (expires in 60 seconds)
        await redis.setex(`admin:${email}:otp_requested`, 60, "true");

        // Send OTP email
        const mailOptions = {
            from: `"Zenith Manager Support" <${process.env.OTP_EMAIL}>`,
            to: email,
            subject: "🔐 Zenith Manager Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="text-align: center; color: #333;">Password Reset OTP</h2>
                    <p>Hello,</p>
                    <p>You have requested to reset your password for <strong>Zenith Manager</strong>. Please use the following OTP:</p>
                    <div style="text-align: center; font-size: 22px; font-weight: bold; background: #007bff; color: #fff; padding: 10px; border-radius: 5px; width: fit-content; margin: 10px auto;">
                        ${OTP}
                    </div>
                    <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
                    <p>If you did not request this password reset, you can safely ignore this email.</p>
                    <br>
                    <p style="color: #555;">Best regards,</p>
                    <p><strong>Zenith Manager Team</strong></p>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log("Password reset OTP sent to:", email, "Message ID:", info.messageId);
        return { success: true, message: "Password reset OTP sent successfully!" };

    } catch (err) {
        console.error("Error sending password reset email:", err);
        return { success: false, message: "Error sending password reset OTP." };
    }
};


export const sendInvitation = async (email, gym_name, admin_name, your_email, your_password, your_username) => {
    try {
        // Check if email is provided
        if (!email || !gym_name || !admin_name || !your_email || !your_password) {
            return { success: false, message: "All parameters are required." };
        }

        // Send invitation email
        const mailOptions = {
            from: `"Zenith Manager Support" <${process.env.OTP_EMAIL}>`,
            to: your_email,
            subject: `🎯 You're Invited to Join ${gym_name} on Zenith Manager`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="text-align: center; color: #333;">Manager Invitation</h2>
                    <p>Hello,</p>
                    <p>You have been invited by <strong>${admin_name}</strong> to join <strong>${gym_name}</strong> as a manager on <strong>Zenith Manager</strong>.</p>
                    <p>Here are your login credentials:</p>
                    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Email:</strong> ${your_email}</p>
                        <p><strong>Username:</strong> ${your_username}</p>
                        <p><strong>Password:</strong> ${your_password}</p>
                    </div>
                    <p>Please use these credentials to log in to your Zenith Manager account. We recommend changing your password after your first login for security purposes.</p>
                    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                    <br>
                    <p style="color: #555;">Best regards,</p>
                    <p><strong>Zenith Manager Team</strong></p>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log("Manager invitation sent to:", email, "Message ID:", info.messageId);
        return { success: true, message: "Manager invitation sent successfully!" };

    } catch (err) {
        console.error("Error sending manager invitation:", err);
        return { success: false, message: "Error sending manager invitation." };
    }
};



// OTP Verification
export const verifyOTP = async (OTP, inputOTP) => {
    try {
        if (!OTP || !inputOTP) return false;

        if (OTP !== inputOTP) return false;

        // Clear OTP after successful verification 
        return true;
    } catch (err) {
        console.log("Error in verifying OTP:", err.message);
        return false;
    }
};