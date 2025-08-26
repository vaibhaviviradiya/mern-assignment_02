const express = require("express")
const cors = require("cors")
const axios = require("axios")

const app = express()

// --------------------- EJS ------------------------
app.set("view engine", "ejs")
app.use(express.json())

// --------------------- FORM ------------------------
app.use(express.urlencoded( { extended : true } ))
app.use(cors())

// -------------------- ROUTES ---------------------

app.get("/q6", (req, res) => {
    res.render("q6_dashboard");
})

// Backend API call - News API
app.get("/q6/news", async (req, res) => {
    try {
        const category = req.query.category || "technology"
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&category=${category}&apiKey=1f1309676d1f48ff806847598fa02e14`)
        
        const newsData = response.data.articles.slice(0, 5).map(article => ({
            title: article.title,
            description: article.description,
            url: article.url,
            publishedAt: new Date(article.publishedAt).toLocaleDateString(),
            source: article.source.name
        }))
        
        res.json(newsData)
    } catch (error) {
        console.error("News API Error:", error.message)
        res.status(500).json({ error: "Failed to fetch news data" })
    }
})

app.listen(3000, () => console.log(" Flying on http://localhost:3000"))

/*
Note: For News API, you need to:
1. Sign up at https://newsapi.org/
2. Get your free API key
3. Replace 'YOUR_NEWS_API_KEY' in the news route
*/
