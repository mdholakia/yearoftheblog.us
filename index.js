// Importing modules
const express = require("express");
const rssParser = require('rss-parser');
const blogRegistry = require('./config')

const port = 80;
const app = express();
const parser = new rssParser();

// For serving static html files
app.use(express.static(__dirname + '/'));
app.use(express.urlencoded({ extended: true }));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

const blogUrls = Object.keys(blogRegistry)
let blogRssUrls = []
let authors = []
const NUMBER_OF_FEATURED_FEEDS = 5

for (let entry in blogRegistry) {
    blogRssUrls.push(blogRegistry[entry]['feedLink']);
    authors.push(blogRegistry[entry]['chosenName']);
}

// Handling the get request
app.get("/", (req, res) => {
    // Choose 5 feeds to feature in the spinner at the bottom of the page per reload
    // TODO: make this random, so it's not always the first 5 in the list
    // We're not actually using this in the template yet because it's not random
    let featuredFeeds = []

    const promises = blogRssUrls.map((url) => parser.parseURL(url))
    Promise.allSettled(promises).then( (feeds, index) => {
        // filter out the failed promises and get the feed object out of the promise wrapper
        let viableFeeds = feeds.filter((feedPromise) => feedPromise.status == 'fulfilled').map((feedPromise) => feedPromise.value)

        viableFeeds.forEach( (feed, index) => {
            if (feed['items'] && feed['items'].length) {
                let contentSnippet = feed['items'][0]['contentSnippet']
                if (contentSnippet == undefined) { return }
                feed['currentSnippet'] = contentSnippet?.slice(0,30) + '...'

                if (featuredFeeds.length <= NUMBER_OF_FEATURED_FEEDS) {
                    featuredFeeds.push(feed)
                }
            }

            // TODO: This is still relying on all the feeds working because otherwise the
            // index gets misaligned with the feed index. This is because failed promises are filtered out right now.
            // I haven't yet found a good way to solve this though
            feed['chosenName'] = authors[index]
            feed['blogUrl'] = blogUrls[index]
        })

        res.render("index", {'feeds': viableFeeds, 'blogRegistry': blogRegistry, 'authors': authors, 'featuredFeeds': featuredFeeds});
    });
});

// Starting the server on the 80 port
app.listen(port, () => {
    console.log(`The application started
                 successfully on port ${port}`);
});