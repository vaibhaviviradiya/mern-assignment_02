const mongoose = require("mongoose")

const leaveSchema = mongoose.Schema({
    empId : { type : mongoose.Schema.Types.ObjectId, ref : "Employee" , required : true },
    date : { type : Date, required : true },
    reason : { type : String, required : true },
    grant : { type : String, enum : ["Pending", "Yes", "No"], default : "Pending"}
}, { timestamps : true });

module.exports = mongoose.model("Leave", leaveSchema, "Leaves")