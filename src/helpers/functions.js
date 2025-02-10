const express = require('express');
const router = express.Router();
const User = require('../models/auth');
const setting = require('../models/setting');



exports.userdata = async (id) => {

    try {

        // Check if a wallet already exists for this coin and user
        const user = await User.findOne({
            _id: id
        });
        return user
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
    }
};

exports.sponsordata = async (id) => {

    try {

        // Check if a wallet already exists for this coin and user
        const user = await User.findOne({
            _id: id
        });

        const sponsor = await User.findOne({
            _id: user.sponsorid
        });

        return sponsor
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
    }
};

exports.settingsdata = async (value) => {

    try {

        // Check if a wallet already exists for this coin and user
        const settings = await setting.findOne({
            keyname: value
        });

        return settings
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
    }
};

exports.settingsdataById = async (value) => {

    try {

        // Check if a wallet already exists for this coin and user
        const settings = await setting.findOne({
            _id: value
        });

        return settings
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
    }
};
