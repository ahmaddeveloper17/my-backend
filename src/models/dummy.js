const mongoose = require("mongoose");

const dummySchema = new mongoose.Schema(
  {
    dummydata: { type: String},
  },
  { collection: "dummy", versionKey: false, timestamps: true }
);

const Dummy = mongoose.model("Dummy", dummySchema);

module.exports = Dummy;
