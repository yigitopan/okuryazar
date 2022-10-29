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
  
  


/*

const searchForNews = async(req, res, next) => {
    const text = `SELECT news_id, title, author_name FROM articles WHERE LOWER(title) LIKE LOWER('%${req.params.query}%')`
    const results = await client.query(text)
    console.log(results.rows)

    res.status(200).json(results.rows)
}

*/


const pushNewsToDb = async(newObj) => {
    const search = newObj.title.replaceAll("'","''")
    const check = `SELECT EXISTS (SELECT news_id FROM news WHERE title LIKE '${search}') AS it_does_exist; `
    const text = 'INSERT INTO news(title, spot, date, img_url, context, newspaper_id, category_name) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *'

    const values = [
        newObj.title,
        newObj.spot,
        newObj.date,
        newObj.image,
        newObj.content,
        newObj.newspaperID,
        newObj.categoryName
    ] 

    try {
        const exists = await client.query(check)
        const existsResult = await exists.rows[0].it_does_exist
        if(existsResult === true) {
            report.alreadyexists = report.alreadyexists+1
        }
        
        else  {
            try {
                const res = await client.query(text, values)
                report.added++;
            } 
            catch (err) {
                console.log("error adding->"+err)
                unChecked.push(newObj.title)
            }

        }
    } 
    catch (err) {
        unChecked.push(search);
        console.log("error checking")
    }

   
}


const getAllNews = async(req, res, next) => { 
    const text = 'SELECT * FROM public.news ORDER BY news_id DESC'
    let news;
            try {
                const res = await client.query(text)
                news = res.rows;
            } 
            catch (err) {
                console.log("error adding")
            }

            res.status(200).json(news);
}


const getContent = async(req, res, next) => {
    const newspaper = req.params.newspaper
    var nachrichten = {
        nachrictArray: []
    };

//// --MILLIYET-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --MILLIYET-- ////
    if(newspaper === "milliyet"){
        const newspaperName = "Milliyet"
        const newspaperID = newspapers.indexOf(newspaperName) + 1;

        let categoryName;

        if(req.params.subject == "gundem") {
            categoryName = "Gündem"
        }

        else if(req.params.subject == "ekonomi") {
            categoryName = "Ekonomi"
        }

        else if(req.params.subject == "dunya") {
            categoryName = "Dünya"
        }

        const responseSubject = await fetch(
            `https://www.milliyet.com.tr/${req.params.subject}` //gundem-ekonomi-dünya
        );

        const subjectText = await responseSubject.text();
        var $ = cheerio.load(subjectText);
        var nachrichtenURLS = [];

        $('a.category-card').each((i,a)=>{
            nachrichtenURLS.push($(a).attr('href'))
        });


        await Promise.all(nachrichtenURLS.map(async url =>  {
        

            const response = await fetch(
                `http://www.milliyet.com.tr${url}`
            );
            const text = await response.text();
            var $ = cheerio.load(text);
            var content = ""

            $('.nd-content-column p').each((i,p)=>{
                content = content.concat($(p).text().trim());
            });

            var dateString =  $('.nd-article__info-block').first().contents().filter(function() {
                return this.type === 'text';
            }).text().substring(0,10)

            var dateArray = dateString.split('.');
            // dateArray[0] 15 (gun)
            // dateArray[1] 10 (ay)
            // dateArray[2] 2022 (yil)

            var finalDate = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}` 
            var newsObject = 
            {
                title: $('h1.nd-article__title').text(),
                spot: $('h2.nd-article__spot').text(),
                date: finalDate,
                image: $('.nd-article__spot-img').find('img').attr('data-src'),
                content,
                newspaperID,
                categoryName
            }
            
            nachrichten.nachrictArray.push(newsObject)
        }))

    }
//// --MILLIYET-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --MILLIYET-- ////


//// --SABAH-- Codesequenz, um die Daten einer Nachricht auf, deren Link bestimmt ist, aufzurufen --SABAH-- ////
    else if (newspaper === "sabah") {

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
else if (newspaper === "sozcu") { 
    const newspaperName = "Sözcü"
    const newspaperID = newspapers.indexOf(newspaperName) + 1;
    let categoryName;

    if(req.params.subject == "gundem") {
        categoryName = "Gündem"
    }

    else if(req.params.subject == "ekonomi") {
        categoryName = "Ekonomi"
    }

    else if(req.params.subject == "dunya") {
        categoryName = "Dünya"
    }

    else if(req.params.subject == "spor") {
        categoryName = "Spor"
    }



    var subject = `kategori/${req.params.subject}`;

    if(req.params.subject == "hayat"){
        subject = `hayatim`;
    }

    else if(req.params.subject == "spor"){
        subject = `spor`;
    }

    else if(req.params.subject == "finans"){
        subject = `finans`;
    }

    const responseSubject = await fetch(
        `https://www.sozcu.com.tr/${subject}` //gundem-spor-hayat-dünya-ekonomi- otomotiv
    );

    const subjectText = await responseSubject.text();
    var $ = cheerio.load(subjectText);
    var nachrichtenURLS = [];

    $('div.news-item a.img-holder').each((i,a)=>{
        nachrichtenURLS.push($(a).attr('href'))
    });

    await Promise.all(nachrichtenURLS.map(async url =>  {
    const response = await fetch(
        `${url}`
    );

    const text = await response.text();
    var $ = cheerio.load(text);

    var content = ""

    $('article p').each((i,p)=>{
        content = content.concat($(p).text().trim());
    });

    var dateString = $('div.content-meta-dates span.content-meta-date').first().text();

    var dateArray = dateString.substring(dateString.length - 13, dateString.length-1);
    dateArray = dateArray.split(' ')

    var months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    // dateArray[0] 15 (gun)
    // dateArray[1] Ekim (ay AMA yazıyla)
    // dateArray[2] 2022 (yil)
    dateArray[1] = months.indexOf(dateArray[1]) + 1;
    var finalDate = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}` 

    var newsObject = 
    {
        title: $('article').find('h1').first().text(),
        spot: $('h2.spot').text(),
        date: finalDate,
        image: $('.main-img .img-holder').find('img').attr('src'),
        content,
        newspaperID,
        categoryName
    }

    nachrichten.nachrictArray.push(newsObject)
}))

}

//// --SOZCU-- Codesequenz, um die Daten einer Nachricht, deren Link bestimmt ist, aufzurufen --SOZCU-- ////

await Promise.all(nachrichten.nachrictArray.map(async news =>  {
    await pushNewsToDb(news)
}))

    res.status(200).json({report:report, missedOnes:unChecked});
}

module.exports = {
    getContent, getAllNews
} 