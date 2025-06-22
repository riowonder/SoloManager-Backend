const mongoose = require('mongoose');
const Admin = require('../models/admin');
const User = require('../models/user');

const defaultValues = {
  String: "",
  Number: 0,
  Boolean: false,
  Date: new Date(),
  Object: {},
  Array: [],
};

exports.addFieldToDocuments = async (req, res) => {
  const { fieldName, fieldType } = req.body;

  if (!fieldName || !defaultValues.hasOwnProperty(fieldType)) {
    console.log("Invalid field name or type");
    return res.status(400).json({ error: "Invalid field name or type" });
  }

  try {
    const defaultValue = defaultValues[fieldType];

    const result = await User.updateMany(
      {},
      { $set: { [fieldName]: defaultValue } }
    );

    res.status(200).json({
      message: `Field '${fieldName}' of type '${fieldType}' added to ${result.modifiedCount} documents.`,
    });
  } catch (err) {
    console.error("Error adding field:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// exports.updateGymName = async (req, res) => {
//   const { gym_name } = req.body;
//   const { email } = req.user;

//   if (!gym_name || gym_name.trim() === '') {
//     return res.status(400).json({ error: "Gym name is required" });
//   }

//   try {
//     const adminResult = await Admin.findOneAndUpdate(
//       { email: email },
//       { gym_name: gym_name.trim() },
//       { new: true }
//     );

//     const userResult = await User.findOneAndUpdate(
//       { email: email },
//       { gym_name: gym_name.trim() },
//       { new: true }
//     );

//     if (!adminResult && !userResult) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.status(200).json({
//       message: "Gym name updated successfully",
//       gym_name: gym_name.trim()
//     });

//   } catch (err) {
//     console.error("Error updating gym name:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };



