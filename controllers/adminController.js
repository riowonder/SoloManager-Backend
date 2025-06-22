const Admin = require('../models/admin');
const Manager = require('../models/manager');
const bcrypt = require('bcrypt');
const { sendInvitation } = require('../utils/otp');

exports.updateGymName = async (req, res) => {
  try {
    const { gym_name } = req.body;
    const adminId = req.user.id;

    // Validate input
    if (!gym_name || typeof gym_name !== 'string' || gym_name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym name is required and must be a non-empty string' 
      });
    }

    if (gym_name.trim().length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym name must be 50 characters or less' 
      });
    }

    // Find and update the admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { gym_name: gym_name.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gym name updated successfully',
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        gym_name: updatedAdmin.gym_name
      }
    });

  } catch (error) {
    console.error('Update gym name error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}; 


exports.inviteManager = async (req, res) => {
  try {
    const { name, email, password, admin_email } = req.body;

    // Find the admin/gym by email to get gym_id
    const admin = await Admin.findOne({ email: admin_email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found with the provided email'
      });
    }
    const adminId = admin._id;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name must be a non-empty string' 
      });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid email is required' 
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if manager with this email already exists
    const existingManager = await Manager.findOne({ email: email.toLowerCase() });
    if (existingManager) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manager with this email already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new manager
    const newManager = new Manager({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      gym_id: adminId,
      role: 'manager'
    });

    await newManager.save();

    // Send invitation email
    const invitationResult = await sendInvitation(
      admin.email,
      admin.gym_name,
      admin.name,
      email,
      password,
      name
    );

    if (!invitationResult.success) {
      // If email fails, delete the created manager and return error
      await Manager.findByIdAndDelete(newManager._id);
      return res.status(500).json({ 
        success: false, 
        message: invitationResult.message 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Manager invited successfully',
      manager: {
        id: newManager._id,
        name: newManager.name,
        email: newManager.email,
        role: newManager.role
      }
    });

  } catch (error) {
    console.error('Invite manager error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
