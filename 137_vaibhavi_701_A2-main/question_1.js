const express = require("express");
const multer = require("multer")
const path = require("path")
const bodyParser = require("body-parser")
const {body, validationResult} = require("express-validator");
const { profile } = require("console");
const app = express();

app.use(express.urlencoded({ extended : true}))
app.use(express.json())

app.use('/uploads', express.static('uploads'))

app.set("view engine", "ejs")
app.set("views", "views")

// ----------------------------------------- Multer -----------------------------------------
const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null, "uploads/")
    },
    filename : (req, file, cb) => {
        cb(null, file.originalname)
    }
})


const upload = multer({storage : storage})
// ----------------------------------------- Routes -----------------------------------------

app.get("/q1/", (req, res) => {
    res.render("q1_registration", {
        errors: {},
        oldData: {}   // ensures safe access
    });
});


app.post("/q1/test",
    upload.fields([ 
        { name : 'profilePic', maxCount : 1 },
        { name : 'otherPics', maxCount : 5 }
    ]),

    [
        body("username").trim().notEmpty().withMessage("Username must not be empty..!!"),
        body("email").isEmail().withMessage("Email must be in valid formate..!!"),
        body("password").isLength({ min: 5, max: 10}).withMessage("Password must be within 5 to 10 char length"),
        body("confirmPassword").custom((val, {req}) => {
            if(!val.trim())
            {
                throw new Error("Password must not be empty")
            }
            if(val != req.body.password)
            {
                throw new Error("Password is not matching..!")
            }
            return true
        }),
        body("gender").notEmpty().withMessage("Gender must be selected..!!"),
        body("hobbies").custom((val, {req}) => {
            if(!val) throw new Error("Please select atleast one hobby")
            if((typeof val == 'string' && val.trim() != '') || (Array.isArray(val) && val.length > 0)) return true;
            throw new Error("Select at least one hobby..!!");
        })
    ],

    (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty())
        {
            return res.render("q1_registration", {errors : errors.mapped(), oldData : req.body})
        }
        
        console.log('✅')
        
        let profilePic = req.files.profilePic ? req.files.profilePic[0] : null
        let otherPics = req.files.otherPics || []

        const collected_data = {
            username : req.body.username,
            email : req.body.email,
            password : req.body.password,
            gender : req.body.gender,
            hobbies : Array.isArray(req.body.hobbies) ? req.body.hobbies : [req.body.hobbies],
            profile_pic : profilePic ? profilePic.path : null,
            other_pic : otherPics.map(f => f.path)
        }

        res.render("q1_Success", { data : collected_data })
    }
)

app.get("/q1/download/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const file = path.join(__dirname, "uploads", filename)
    res.download(file);
})

app.listen(3000, () => {
    console.log("🌐 Flying on http://localhost:3000")
})