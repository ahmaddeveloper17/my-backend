const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
    {
        keyname: { type: String, },
        keyvalue: { type: String, },
        referenceid: { type: String,  },
        one_month_profit: { type: String,  },
        three_month_profit: { type: String,  },
        six_month_profit: { type: String,  },
        min_fixed_term_amount: { type: String,  },
    },
    { collection: "setting", versionKey: false, timestamps: true }
);

const setting = mongoose.model("setting", settingSchema);

module.exports = setting;
