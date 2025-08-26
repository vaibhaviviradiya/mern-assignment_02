
const mongoose = require("mongoose");

const structure = new mongoose.Schema({
    id : {type : Number, required : true, unique : true},
    name : {type : String, required : true, trim : true},
    email : {type : String, required : true, unique : true, lowercase : true},
    password : {type : String, required : true},
    salary : {type : Number, required : true, default : 1}
})

module.exports = mongoose.model("Employee", structure, "question4")