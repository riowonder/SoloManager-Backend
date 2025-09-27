import axios from 'axios';
import Admin from '../models/admin.js';
import User from '../models/user.js';


export const sendExpiryMessage = async (userId, plan, extra_days, expiryDate, gymId) => {
    try {
        const adminData = await Admin.findById(gymId);
        const gymName = adminData?.gym_name || "Bodylyn Gym";

        const userData = await User.findById(userId);
        const userName = userData?.name || "Member";
        let userPh = userData?.phone_number;
        if (!userPh) {
            throw new Error(`User with ID ${userId} does not have a phone number.`);
        }

        userPh = "+91" + userPh; // Ensure country code is included

        let planName = plan;
        if (planName === 'Custom') {
            planName = `Custom + ${extra_days} days`;
        }

        const expireDate = new Date(expiryDate).toLocaleDateString('en-GB'); // Format: DD/MM/YYYY

        const response = await axios({
            url: 'https://graph.facebook.com/v22.0/747330215135915/messages',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                messaging_product: "whatsapp",
                to: userPh,    // change it to userPh
                type: "template",
                template: {
                    name: 'sub_exp',
                    language: {
                        code: 'en'
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: userName },           // {{1}}
                                { type: "text", text: planName },           // {{2}}
                                { type: "text", text: gymName },            // {{3}} 
                                { type: "text", text: expireDate },         // {{4}}
                                { type: "text", text: gymName },            // {{5}}
                                { type: "text", text: gymName }             // {{6}} 
                            ]
                        }
                    ]
                }
            })
        });
        console.log("Expiry message sent to user:", userId);
        console.log("Message sent to phone number:", userPh);

        if (response.data.errors) {
            console.error("WhatsApp API error:", response.data.errors);
        } else if (!response.data.messages) {
            console.warn("No messages object in WhatsApp API response:", response.data);
        } else {
            console.log("WhatsApp message sent successfully:", response.data.messages);
        }
        return response;
    } catch (err) {
        console.error("Error in sendExpiryMessage:", err);
        if (err.stack) {
            console.error("Stack trace:", err.stack);
        }
        throw err;
    }
}

export const sendReminderMessage = async (userId, plan, extra_days, expiryDate, gymId) => {
    try {
        const adminData = await Admin.findById(gymId);
        const gymName = adminData?.gym_name || "Bodylyn Gym";

        const userData = await User.findById(userId);
        const userName = userData?.name || "Member";
        let userPh = userData?.phone_number;
        if (!userPh) {
            throw new Error(`User with ID ${userId} does not have a phone number.`);
        }

        userPh = "+91" + userPh; // Ensure country code is included

        let planName = plan;
        if (planName === 'Custom') {
            planName = `Custom + ${extra_days} days`;
        }

        const response = await axios({
            url: 'https://graph.facebook.com/v22.0/747330215135915/messages',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                messaging_product: "whatsapp",
                to: userPh,
                type: "template",
                template: {
                    name: 'expiry_reminder',
                    language: {
                        code: 'en'
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: userName },           // {{1}}
                                { type: "text", text: planName },           // {{2}} 
                                { type: "text", text: gymName },            // {{3}} 
                                { type: "text", text: expiryDate },         // {{4}}
                                { type: "text", text: gymName }             // {{5}}
                            ]
                        }
                    ]
                }
            })
        });
        console.log("Reminder message sent to user:", userId);
        console.log("Message sent to phone number:", userPh);

        return response;
    } catch (err) {
        console.error("Error in sendReminderMessage:", err);
        if (err.stack) {
            console.error("Stack trace:", err.stack);
        }
        throw err;
    }
}
