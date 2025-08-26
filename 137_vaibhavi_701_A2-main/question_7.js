const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const session = require("express-session")
const cors = require("cors")

const app = express()

// --------------------- MODELS ------------------------

// User Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    cart: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }]
}, { timestamps: true })

const User = mongoose.model("User", userSchema)

// Category Model (Level 1)
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    image: String
}, { timestamps: true })

const Category = mongoose.model("Category", categorySchema)

// Subcategory Model (Level 2)
const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    image: String
}, { timestamps: true })

const Subcategory = mongoose.model("Subcategory", subcategorySchema)

// Product Model
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    image: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory', required: true }
}, { timestamps: true })

const Product = mongoose.model("Product", productSchema)

// --------------------- MIDDLEWARE ------------------------
app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(session({
    secret: "shopping_cart_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        return next()
    }
    res.redirect("/q7/login")
}

function requireAdmin(req, res, next) {
    if (req.session.userId && req.session.isAdmin) {
        return next()
    }
    res.redirect("/q7/admin/login")
}

// -------------------- MONGODB ----------------------
mongoose.connect("mongodb://localhost:27017/ShoppingCart").then(() => 
    console.log(" Connected to MongoDB successfully..")
).catch((err) => console.error("Error: ", err))

// -------------------- ROUTES ---------------------

// Home page
app.get("/q7", async (req, res) => {
    try {
        const categories = await Category.find().populate({
            path: 'subcategories',
            model: 'Subcategory'
        })
        const products = await Product.find().populate('categoryId subcategoryId').limit(8)
        res.render("home", { 
            categories, 
            products, 
            user: req.session.userId ? await User.findById(req.session.userId) : null 
        })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

// User Authentication Routes
app.get("/q7/register", (req, res) => {
    res.render("register")
})

app.post("/q7/register", async (req, res) => {
    try {
        const { username, email, password } = req.body
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = new User({ username, email, password: hashedPassword })
        await user.save()
        res.redirect("/q7/login")
    } catch (error) {
        res.status(400).send("Registration failed")
    }
})

app.get("/q7/login", (req, res) => {
    res.render("login")
})

app.post("/q7/login", async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id
            req.session.isAdmin = user.isAdmin
            res.redirect("/q7")
        } else {
            res.status(401).send("Invalid credentials")
        }
    } catch (error) {
        res.status(500).send("Login failed")
    }
})

app.get("/q7/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/q7")
})

// Product Routes
app.get("/q7/products", async (req, res) => {
    try {
        const { category, subcategory } = req.query
        let query = {}
        
        if (category) {
            const cat = await Category.findOne({ name: category })
            if (cat) query.categoryId = cat._id
        }
        
        if (subcategory) {
            const subcat = await Subcategory.findOne({ name: subcategory })
            if (subcat) query.subcategoryId = subcat._id
        }
        
        const products = await Product.find(query).populate('categoryId subcategoryId')
        const categories = await Category.find()
        const subcategories = await Subcategory.find()
        
        res.render("products", { 
            products, 
            categories, 
            subcategories, 
            user: req.session.userId ? await User.findById(req.session.userId) : null 
        })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.get("/q7/product/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categoryId subcategoryId')
        res.render("product_detail", { 
            product, 
            user: req.session.userId ? await User.findById(req.session.userId) : null 
        })
    } catch (error) {
        res.status(404).send("Product not found")
    }
})

// Cart Routes
app.post("/q7/cart/add", requireAuth, async (req, res) => {
    try {
        const { productId, quantity } = req.body
        const user = await User.findById(req.session.userId)
        
        const existingItem = user.cart.find(item => item.productId.toString() === productId)
        if (existingItem) {
            existingItem.quantity += parseInt(quantity)
        } else {
            user.cart.push({ productId, quantity: parseInt(quantity) })
        }
        
        await user.save()
        res.json({ success: true, message: "Added to cart" })
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add to cart" })
    }
})

app.get("/q7/cart", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).populate({
            path: 'cart.productId',
            populate: { path: 'categoryId subcategoryId' }
        })
        
        let total = 0
        user.cart.forEach(item => {
            total += item.productId.price * item.quantity
        })
        
        res.render("cart", { user, total })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.post("/q7/cart/update", requireAuth, async (req, res) => {
    try {
        const { productId, quantity } = req.body
        const user = await User.findById(req.session.userId)
        
        const item = user.cart.find(item => item.productId.toString() === productId)
        if (item) {
            if (quantity <= 0) {
                user.cart = user.cart.filter(item => item.productId.toString() !== productId)
            } else {
                item.quantity = parseInt(quantity)
            }
            await user.save()
        }
        
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ success: false })
    }
})

// Admin Routes
app.get("/q7/admin/login", (req, res) => {
    res.render("admin/login")
})

app.post("/q7/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email, isAdmin: true })
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id
            req.session.isAdmin = true
            res.redirect("/q7/admin/dashboard")
        } else {
            res.status(401).send("Invalid admin credentials")
        }
    } catch (error) {
        res.status(500).send("Login failed")
    }
})

app.get("/q7/admin/dashboard", requireAdmin, async (req, res) => {
    try {
        const stats = {
            users: await User.countDocuments(),
            products: await Product.countDocuments(),
            categories: await Category.countDocuments(),
            subcategories: await Subcategory.countDocuments()
        }
        res.render("admin/dashboard", { stats })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

// Admin Category Management
app.get("/q7/admin/categories", requireAdmin, async (req, res) => {
    try {
        const categories = await Category.find()
        res.render("admin/categories", { categories })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.post("/q7/admin/categories", requireAdmin, async (req, res) => {
    try {
        const { name, description, image } = req.body
        const category = new Category({ name, description, image })
        await category.save()
        res.redirect("/q7/admin/categories")
    } catch (error) {
        res.status(400).send("Failed to create category")
    }
})

// Admin Subcategory Management
app.get("/q7/admin/subcategories", requireAdmin, async (req, res) => {
    try {
        const subcategories = await Subcategory.find().populate('categoryId')
        const categories = await Category.find()
        res.render("admin/subcategories", { subcategories, categories })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.post("/q7/admin/subcategories", requireAdmin, async (req, res) => {
    try {
        const { name, description, categoryId, image } = req.body
        const subcategory = new Subcategory({ name, description, categoryId, image })
        await subcategory.save()
        res.redirect("/q7/admin/subcategories")
    } catch (error) {
        res.status(400).send("Failed to create subcategory")
    }
})

// Admin Product Management
app.get("/q7/admin/products", requireAdmin, async (req, res) => {
    try {
        const products = await Product.find().populate('categoryId subcategoryId')
        res.render("admin/products", { products })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.get("/q7/admin/products/new", requireAdmin, async (req, res) => {
    try {
        const categories = await Category.find()
        const subcategories = await Subcategory.find()
        res.render("admin/product_form", { categories, subcategories })
    } catch (error) {
        res.status(500).send("Server error")
    }
})

app.post("/q7/admin/products", requireAdmin, async (req, res) => {
    try {
        const { name, description, price, stock, categoryId, subcategoryId, image } = req.body
        const product = new Product({ 
            name, 
            description, 
            price: parseFloat(price), 
            stock: parseInt(stock), 
            categoryId, 
            subcategoryId, 
            image 
        })
        await product.save()
        res.redirect("/q7/admin/products")
    } catch (error) {
        res.status(400).send("Failed to create product")
    }
})

// Initialize admin user
async function initializeAdmin() {
    try {
        const adminExists = await User.findOne({ isAdmin: true })
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash("admin123", 10)
            const admin = new User({
                username: "admin",
                email: "admin@shop.com",
                password: hashedPassword,
                isAdmin: true
            })
            await admin.save()
            console.log(" Admin user created: admin@shop.com / admin123")
        }
    } catch (error) {
        console.error("Failed to create admin user:", error)
    }
}

app.listen(3000, () => {
    console.log("Shopping Cart running on http://localhost:3000")
    initializeAdmin()
})
