const mongoose = require("mongoose");

const adminAuthSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },  
    usertype: { type: String, default: 'user' },  
  },
  { collection: "userdata", versionKey: false, timestamps: true }
);

const Admin = mongoose.model("Admin", adminAuthSchema);

module.exports = Admin;
