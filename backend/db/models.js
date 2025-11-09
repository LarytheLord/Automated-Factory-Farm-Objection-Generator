import mongoose, { Schema, models, model } from 'mongoose';

export const PermitApplication = new Schema({
    _created_at: { type: Date, default: Date.now },
    application_date: { type: Date },
    application_number: { type: String }, 
    project_title: { type: String },    // Title of the project eg. Bob's Farm
    permit_type: {type: String},        // References type of permit
    permit_grant_body: { type: String}, // eg. EPA
    original_url: {type: String},
    raw_text: {type: String},
    location: { type: String }, // <- Country > Region > Locations (eg. City)
    region: { type: String },   // <- Country > Region > Locations (eg. City)
    country: { type: String },  // <- Country > Region > Locations (eg. City)
    activity: { type: String },
    capacity: { type: String },
    effluent_limit: { type: Object },
    solid_waste: { type: Object[] },
    air_emission_standard: { type: Object },
    notes: { type: String | null },

    status:{ type: String }, // "closed" | "open" | "public_comment" ?
  });