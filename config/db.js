const mongoose = require("mongoose");

const dbConnect = () => {
    mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database Connected Succsessfully!"))
    .catch((err) => console.log("Database Connection Unsuccessfull!"))
}

module.exports = dbConnect;