const path = require("path")
const express = require("express")
const session = require("express-session")
const FileStore = require("session-file-store")(session)
const BodyParser = require("body-parser")

const app = express()

app.set("view engine", "ejs")
app.set("views", "views")

// Middleware
app.use(BodyParser.urlencoded({ extended : true}))

// Session
app.use(
    session({
        store : new FileStore(),
        secret : "IT7_701_137_AS-2",
        resave : false,
        saveUninitialized : false,
        cookie : { maxAge : 1000 * 60 * 5} // 5 min
    })
)

const user = { username : "parth", password : "datascientist"}

app.get("/q2", (req, res) => {
    if(req.session.user)
        return res.render("q2_dashboard");
    res.render("q2_login")
})

app.post("/q2/login", (req, res) => {
    const {username, password} = req.body;

    if(username == user.username && password == user.password)
    {
        req.session.user = username
        return res.redirect("/q2/dashboard")
    }

    res.status(404).send("Invalid credintials, <strong><a href='/q2'>Try Again</a></strong>")
})

app.get("/q2/dashboard", (req, res) => {
    if(!req.session.user)
        return res.redirect("/q2")
    res.render("q2_dashboard")
})

app.get("/q2/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/q2")
    })
})

app.listen(3000, () => console.log(" Flying on http://localhost:3000"))