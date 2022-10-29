const fetch = require("isomorphic-fetch")
const cheerio = require("cheerio")
const { Pool, Client } = require("pg");
require('dotenv').config();

const newspapers = ["Sözcü", "Milliyet", "Sabah"]

var report = {
    alreadyexists:0,
    added:0
}  
let unChecked = []; 

  const client = new Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.DBPASS,
    port: process.env.POSTGREPORT,
    ssl:{
        rejectUnauthorized:false
    }
});

client.connect();

const checkAuthor = async(articleObj) => {
    const checkAuthor = `SELECT EXISTS (SELECT author_name FROM authors WHERE author_name LIKE '${articleObj.authorName}') AS author_exist; `

    try {
        const authorExists = await client.query(checkAuthor)
        const authorExistsResult = await authorExists.rows[0].author_exist

        if(authorExistsResult === false) {
            const text = 'INSERT INTO authors(author_name, img_url) VALUES($1, $2) RETURNING *'

            const values = [
                articleObj.authorName,
                articleObj.image
            ] 
            const res = await client.query(text, values)
            await pushArticlesToDb(articleObj)
        }
        else {
            await pushArticlesToDb(articleObj)
        }
    } 
    catch (error) {
        
    }
}

const pushArticlesToDb = async(articleObj) => {
    const search = articleObj.title.replaceAll("'","''")
    const check = `SELECT EXISTS (SELECT article_id FROM articles WHERE title LIKE '${search}') AS it_does_exist; `
    const text = 'INSERT INTO articles(title, date, context, newspaper_id, author_name) VALUES($1, $2, $3, $4, $5) RETURNING *'

    const values = [
        articleObj.title,
        articleObj.date,
        articleObj.content,
        articleObj.newspaperID,
        articleObj.authorName
    ] 

    try {
        const exists = await client.query(check)
        const existsResult = await exists.rows[0].it_does_exist
        if(existsResult === true) {
            report.alreadyexists =  report.alreadyexists + 1;
            console.log("var bundan"+articleObj.title)
        }

        else  {
            try {
                const res = await client.query(text, values)
                report.added++;
            } 
            catch (err) {
                console.log(err)
                console.log("error adding")
            }

        }
    } 
    catch (err) {
        console.log(err);
        console.log("error checking")
    }

}

/////////////////

const searchForArticles = async(req, res, next) => {
    const text = `SELECT article_id, title, author_name FROM articles WHERE LOWER(title) LIKE LOWER('%${req.params.query}%')`
    const results = await client.query(text)
    res.status(200).json(results.rows)
}

/////////////////

const getAllArticles = async(req, res, next) => { 
    const text = 'SELECT * FROM public.articles ORDER BY article_id DESC'
    let articles;
            try {
                const res = await client.query(text)
                articles = res.rows;
            } 
            catch (err) {
                console.log("error adding")
            }

            res.status(200).json(articles);
}

const getContent = async(req, res, next) => {
    console.log(req.params)
    var articles = {
        articleArray: []
    };

//// --MILLIYET-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --MILLIYET-- ////
    if(req.params.newspaper === "milliyet"){
        const newspaperName = "Milliyet"
        const newspaperID = newspapers.indexOf(newspaperName) + 1;

        const responseArticlesPage = await fetch(
            `https://www.milliyet.com.tr/yazarlar/` //gundem-ekonomi-dünya div.card-listing a.card-listing__link
        );

        const articlesText = await responseArticlesPage.text();
        var $ = cheerio.load(articlesText);
        var articlesURL = [];

        $('div.card-listing a.card-listing__link').each((i,a)=>{
            articlesURL.push($(a).attr('href'))
        });


        await Promise.all(articlesURL.map(async url =>  {
          if(url.includes('yazarlar')) {
             
            const response = await fetch(
                `http://www.milliyet.com.tr${url}`
            );
            const text = await response.text();
            var $ = cheerio.load(text);
            var content = ""

            $('.article__content p').each((i,p)=>{
                content = content.concat($(p).text().trim());
            });

            var dateString =  $('.article__date').text();
            var dateArray = dateString.split(' ');

            var months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
            dateArray[1] = months.indexOf(dateArray[1]) + 1;
            var finalDate = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}` 

            var articleObject = 
            {
                title: $('.article__title').text(),
                date: finalDate,
                image: $('.card-heading__figure-img').first().attr('src'),
                content,
                newspaperID,
                authorName:$('.card-heading__content-text-1 a').text()
            }
            //pushNewsToDb(newsObject) 
            if(articleObject.content.length>10){
                articles.articleArray.push(articleObject)
            }
          }
        }))

    }
//// --MILLIYET-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --MILLIYET-- ////


//// --SABAH-- Codesequenz, um die Daten einer Nachricht auf, deren Link bestimmt ist, aufzurufen --SABAH-- ////
    else if (req.params.newspaper === "sabah") {

        const responseSubject = await fetch(
            `https://www.sabah.com.tr/${req.params.subject}` //gundem-yasam-saglik-dünya
        );

        const subjectText = await responseSubject.text();
        var $ = cheerio.load(subjectText);
        var nachrichtenURLS = [];

        $('.headlineNumeric ul li a').each((i,a)=>{
            nachrichtenURLS.push($(a).attr('href'))
        });

        await Promise.all(nachrichtenURLS.map(async url =>  {
                var fullUrl = `https://www.sabah.com.tr${url}`

                if(url.includes('sabah.com.tr')){
                    fullUrl = url;
                }

                const response = await fetch(
                    `${fullUrl}`
                );

                const text = await response.text(); 
                var $ = cheerio.load(text);
                var scripts = ""
                var mainScript = ""
                var content = ""
                var spot = ""

                $('script').each((idx, script) => {
                    scripts = scripts.concat($(script).text());
                    if($(script).text().includes('NewsArticle')) {
                        mainScript = $(script).text()
                    }
                });

                scripts =  scripts.split(`NewsArticle"`).pop().split(`keywords`)[0].trim(); // returns 'two'

                content =  scripts.split(`articleBody`).pop().split(`description`)[0].trim();  // returns 'two'
                spot =  scripts.split(`description`).pop().split(`articleBody`)[0].trim();  // returns 'two'

                $('.newsBox.selectionShareable p').each((i ,p)=>{
                    content = content.concat($(p).text());
                });

                var newsObject = 
                {
                    title: $('figure.newsImage img').attr('alt'),
                    spot,
                    date: $('.news-detail-info span span').first().text(),
                    image: $('figure.newsImage').find('img').attr('src'),
                    content
                }
                nachrichten.nachrictArray.push(newsObject)
        }))

}
//// --SABAH-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --SABAH-- ////


//// --SOZCU-- Codesequenz, um die Daten einer Nachricht auf, deren Link bestimmt ist, aufzurufen --SOZCU-- ////
else if (req.params.newspaper === "sozcu") { 
    const newspaperName = "Sözcü"
        const newspaperID = newspapers.indexOf(newspaperName) + 1;

        const responseArticlesPage = await fetch(
            `https://www.sozcu.com.tr/kategori/yazarlar/`
        );

        const articlesText = await responseArticlesPage.text();
        var $ = cheerio.load(articlesText);
        var articlesURL = [];

        $('a.columnist-card').each((i,a)=>{
            articlesURL.push($(a).attr('href'))
        });


        await Promise.all(articlesURL.map(async url =>  {
          if(url.includes('yazarlar')) {
             
            const response = await fetch(
                `${url}`
            );
            const text = await response.text();
            var $ = cheerio.load(text);
            var content = ""

            $('article p').each((i,p)=>{
                content = content.concat($(p).text().trim());
            });

            var dateString =  $('.content-meta-date').first().contents().filter(function() {
                return this.type === 'text';
            }).text()

            dateString = dateString.substring(1,dateString.length)
            var dateArray = dateString.split(' ');
            var months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
            dateArray[1] = months.indexOf(dateArray[1]) + 1;
            var finalDate = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}` 

            var articleObject = 
            {
                title: $('article h1').first().text(),
                date: finalDate,
                image: $('.columnist-header .img-holder img').first().attr('src'),
                content,
                newspaperID,
                authorName:$('article a.name').text()
            }
            //pushNewsToDb(newsObject) 
            if(articleObject.content.length>10){
                articles.articleArray.push(articleObject)
            }
          }
        }))

}

//// --SOZCU-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --SOZCU-- ////

    await Promise.all(articles.articleArray.map(async article =>  {
        await checkAuthor(article)
    }))


    res.status(200).json({data:report});
}

module.exports = {
    getContent, getAllArticles, searchForArticles
} 