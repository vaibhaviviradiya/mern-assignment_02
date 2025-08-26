const path = require("path")
const crypto = require("crypto")
const bcrypt = require("bcrypt")
const express = require("express")
const session = require("express-session")
const mongoose = require("mongoose")
const nodemailer = require("nodemailer")
const Employee = require("./models/Employee")

const app = express()

// ------------------------ FUNCTIONS -----------------------------

function generate_password() {
    return crypto.randomBytes(4).toString("hex"); // 8 chars
}

async function hash_password(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// ------------------------ MAILER ------------------------

const mailer = nodemailer.createTransport({
    service : "gmail",
    auth : {
        user : "vaibhaviviradiya@gmail.com",
        pass : "jlwtajfloperddmg"
    }
})

// ------------------------ EJS ------------------------
app.set("view engine", "ejs")
app.set("views", "views")

// ------------------------ FORM ------------------------
app.use(express.urlencoded({ extended : true}))
app.use(express.json())

// ------------------------ SESSION ------------------------
app.use(session({
    secret : "IT7_Q4_Ass-2",
    resave : false,
    saveUninitialized : false
}))

// ------------------------ MIDDLEWARE ------------------------
const gate_keeper = (req, res, next) => {
    if(!req.session.admin)
        return res.redirect("/q4")
    next()   
}

// ------------------------ MONGODB ------------------------
mongoose.connect("mongodb://localhost:27017/Employee").then(() => console.log(" Connection established..")).catch((err) => console.error("❌ MongoDB connection error:", err))

// ------------------------ ID setup -----------------------
async function get_max_id()
{
    const maxEmp = await Employee.findOne().sort({ id : -1 }).exec();
    return maxEmp ? maxEmp.id + 1: 1;
}


// ------------------------ ROUTES ------------------------

app.get("/q4", (req, res) => {
    res.render("q4_login")
})

app.post("/q4/login", (req, res) => {
    const {username, password } = req.body;
    if(username == 'admin' && password == 'admin')
    {
        req.session.admin = username
        return res.redirect("/q4/render_data")
    }
    res.send("Invalid username and password, try again <br> <a href='/q4'>Try again</a>")
})

app.get("/q4/render_data", gate_keeper, async (req, res) => {
    try {
        const emp_data = await Employee.find({});
        return res.render("q4_home", { data: emp_data });
        // console.json(emp_data)
    } catch (err) {
        console.error("Error fetching employees:", err);
        return res.status(500).send("Failed to load employees");
    }
})

app.get("/q4/add", gate_keeper, (req, res) => {
    res.render("q4_add");
})

app.post("/q4/add_new", async (req, res) => {
    const { name, email, salary, bonus, deduction } = req.body

    let id = await get_max_id()
    let bonus_amount = ((salary * bonus) / 100);
    let deduction_amount = ((salary * deduction) / 100);
    let new_salary = (Number(salary) + bonus_amount - deduction_amount)

    let plain_pass = generate_password()
    console.log(plain_pass)
    let hashed_pass = await hash_password(plain_pass)

    let new_emp = new Employee({
        id : id,
        name : name,
        email : email,
        password : hashed_pass,
        salary : new_salary
    })
    await new_emp.save();

    const send_mail = {
        from : "parthkachhadiya04@gmail.com",
        to : email,
        subject : "Welcome to the Company ",
        text : `Hello ${name},\n\nYour Employee ID is ${id}.\n\nWelcome aboard!`
    }
    
    await mailer.sendMail(send_mail)

    return res.redirect("/q4/render_data")
})

app.get("/q4/delete/:id", gate_keeper, async (req, res) => {
    let id = parseInt(req.params.id)
    await Employee.deleteOne({ id : id})
    return res.redirect("/q4/render_data")
})

app.get("/q4/update/:id", gate_keeper, async (req, res) => {
    let e_id = parseInt(req.params.id)
    let emp_obj = await Employee.findOne({ id : e_id})
    console.log(emp_obj)
    res.render("q4_update", { data : emp_obj})
})

app.post("/q4/update", async (req, res) => {
    let {id, name, email} = req.body
    await Employee.updateOne(
        { id : id },
        { $set : { name, email }}
    )
    return res.redirect("/q4/render_data")
})

app.get("/q4/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/q4")
})

app.listen(3000, () => {console.log("Flying on http://localhost:3000")})