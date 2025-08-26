const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const Employee = require("./models/Employee")
const Leave = require("./models/Leave")

const app = express()

// --------------------- FUNCTIONS ------------------------

function authenticate_tokens(req, res, next) 
{
    const authentication_header = req.headers["authorization"] || (req.query.token ? `Bearer ${req.query.token}` : null)
    const token = authentication_header && authentication_header.split(" ")[1] || req.query.token

    if(!token) return res.sendStatus(401)

    jwt.verify(token, "IT7_Q5_137_Ass-2", (err, user) => {
        if(err)
        {
            console.log("JWT verificaton error : ", err.message)
            return res.status(403).json({ error : err.message })
        } 
        console.log("Decoded user : ", user)            
        req.user = user
        next()
    })
}



// --------------------- EJS ------------------------
app.set("view engine", "ejs")
app.use(express.json())

// --------------------- FORM ------------------------
app.use(express.urlencoded( { extended : true } ))
app.use(cors())

// -------------------- MONGODB ----------------------
mongoose.connect("mongodb://localhost:27017/Employee").then(() => console.log(" Connected successfylly..")).catch((err) => console.error("Error : " , err))

// -------------------- ROUTES ---------------------

app.get("/q4", (req, res) => {
    res.render("q4_login");
})

app.post("/q4/login", async (req, res) => {
    let { username, password } = req.body
    
    let employee = await Employee.findOne( { email : username })

    if(!employee)
        return res.status(404).json({ message : "No employee found with such email and password" })

    const doesMatching = await bcrypt.compare(password, employee.password)

    if(!doesMatching)
        return res.status(404).json({ message : "Invalid username/email or password" })

    // Using JWT with business employee id
    const token = jwt.sign(
        { _id : employee._id, id : employee.id, name : employee.name, email : employee.email, password : employee.password, salary : employee.salary },
        "IT7_Q5_137_Ass-2",
        { expiresIn : '9h'}
    )
    return res.redirect(`/q5/render_data?token=${token}`)
})

app.get("/q5/render_data", authenticate_tokens, async (req, res) => {
    try {
        const employeeId = Number(req.user.id)
        console.log(req.user)
        if(Number.isNaN(employeeId))
            return res.status(400).json({ message : "Invalid employee id in token" })

        let data = await Employee.findOne({ id : employeeId });

        if(!data)
            return res.status(404).json({ message : " Employee not found..!!" })

        res.render("q5_employee_dash", { employee : data, token : req.query.token })
    } catch (error) {
        console.error("Error fetching employee data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})

app.get("/q5/take_leave",authenticate_tokens, (req, res) => {
    console.log(req.user)
    res.render("q5_take_leave", { employee : req.user , token : req.query.token })
})

app.post("/q5/take_leave", authenticate_tokens, async (req, res) => {
    try
    {
        let {date, reason} = req.body
        let new_leave = new Leave({
            empId : req.user._id,
            date : new Date(date),
            reason : reason
        })
        await new_leave.save()
        res.redirect(`/q5/render_data?token=${req.query.token}`)
    } catch(err)
    {
        console.error("Error while applying for leave: ", err.message)
        res.json({ message : err.message })
    }
})

app.get("/q5/logout", (req, res) => {
    return res.redirect("/q4")
})

app.get("/q5/get_all", authenticate_tokens, async (req, res) => {
    let data = await Leave.find({})
    console.log(data)
    res.render("q5_get_all_leaves", { leaves : data, token: req.query.token })
})

app.listen(3000, () => console.log(" Flying on http://localhost:3000"))

/*
jaykachhadiya04@gmail.com -> 96a408c7
*/