const Twitter = require('twitter');
const winston = require('winston');
const express = require('express');
const sentiment = require('sentiment');
const Promise = require('promise');
const elegantSpinner = require('elegant-spinner');
const logUpdate = require('log-update');
const Dexie = require('dexie');
const gui = require('nw.gui');
const frame = elegantSpinner();

var twitter = new Twitter({
  consumer_key: 'cQLiUAXWc6PCgzT6IFVbbmPRu',
  consumer_secret: 'K43X0pBt86TbaLpJFnYKdIfR1gE4mTZ5OAQBSasji4JwxhuqId',
  access_token_key: '2221736836-iWiWERD1nZB5JCcdXSuWSQsgX2ag3QEeF8K8KqA',
  access_token_secret: 'za4WSsnPGQE0Ot77cRbFy0G4TKCjmuWhUqQbfHUrfcayK'
});

var db = new Dexie("TweetDatabase");
db.version(1).stores({
  tweets: "&id, user_name, sentiment, retweeted, lang, truncated, entities.*hashtags, entities.*symbols, entities.*urls, entities.*user_mentions, retweet_count, favorite_count, favorited"
});


gui.Window.get().on('close', function () {
  gui.App.quit();
});

gui.Window.get().focus();
gui.Window.get().show();
gui.Window.get().showDevTools();

const menu = new gui.Menu({ type: 'menubar' });

menu.createMacBuiltin('Tweet Analysis', {
  hideEdit: false,
  hideWindow: true
});

let databaseMenuItems = new gui.Menu();

let databaseMenu = {
  clear: new gui.MenuItem({ label: 'Clear', key: "c", modifiers: "shift-cmd" }),
  recover: new gui.MenuItem({ label: 'Recover', key: "r", modifiers: "ctrl-alt" }),
  reload: new gui.MenuItem({ label: 'Reload', key: "r", modifiers: "cmd" })
}
databaseMenu.clear.click = function (event) {
  db.tweets.clear();
};
databaseMenu.recover.click = function (event) {
  loadTweets(false);
};
databaseMenu.reload.click = function (event) {
  loadTweets(true, 1500);
};

databaseMenuItems.append(databaseMenu.clear);
databaseMenuItems.append(databaseMenu.recover);
databaseMenuItems.append(databaseMenu.reload);

menu.append(
  new gui.MenuItem({
    label: 'Database',
    submenu: databaseMenuItems
  })
);

// Append Menu to Window
gui.Window.get().menu = menu;

let show = {
  toolbar: true,
  footer: true
};

let cols = [
  { field: 'recid', caption: 'Twitter Id', sortable: true, size: '15%' },
  { field: 'date', caption: 'Created', sortable: true, resizable: true, size: '30%' },
  { field: 'sentiment', caption: 'Sentiment', sortable: true, size: '5%' },
  { field: 'retweet_count', caption: 'Retweets', sortable: true, resizable: true, size: '10%' },
  { field: 'favorite_count', caption: 'Favorites', sortable: true, resizable: true, size: '10%' },
  { field: 'text', caption: 'Tweet Text', sortable: false, resizable: true, size: '70%' }
];

let searches = [
  { field: 'recid', caption: 'Twitter Id', type: 'int' },
  { field: 'date', caption: 'Date', type: 'date' },
  { field: 'sentiment', caption: 'Sentiment', type: 'int' },
  { field: 'retweet_count', caption: 'Retweets', type: 'int' },
  { field: 'favorite_count', caption: 'Favorites', type: 'int' },
  { field: 'text', caption: 'Text', type: 'text' }
];

let clinton_tweets = [];
let trump_tweets = [];

let config = {
  layout: {
    name: 'layout',
    padding: 0,
    panels: [
      { type: 'left', size: 150, resizable: true, minSize: 100 },
      { type: 'main', minSize: 400, overflow: 'hidden' }
    ]
  },
  sidebar: {
    name: 'sidebar',
    nodes: [
      {
        id: 'users', text: 'Twitter Users', group: true, expanded: true, nodes: [
          { id: 'trump', text: 'Donald Trump', img: 'icon-page', selected: true },
          { id: 'clinton', text: 'Hillary Clinton', img: 'icon-page' },
          { id: 'all', text: 'All Tweets', img: 'icon-page' }
        ]
      }
    ],
    onClick: function (event) {
      switch (event.target) {
        case 'trump':
          w2ui.layout.content('main', w2ui.trump);
          break;
        case 'clinton':
          w2ui.layout.content('main', w2ui.clinton);
          break;
        case 'all':
          w2ui.layout.content('main', w2ui.all);
          break;
      }
    }
  },
  trump: {
    name: 'trump',
    header: 'Trump Tweets',
    show: show,
    columns: cols,
    searches: searches,
    records: [],
    onReload: function () {
      loadTweets(true, 1500);
    }
  },
  clinton: {
    name: 'clinton',
    header: 'Clinton Tweets',
    show: show,
    columns: cols,
    searches: searches,
    records: [],
    onReload: function () {
      loadTweets(true, 1500);
    }
  },
  all: {
    name: 'all',
    header: 'All Tweets',
    show: show,
    columns: [
      { field: 'user_name', caption: 'User', sortable: true, size: '15%' }
    ].concat(cols),
    searches: [
      { field: 'user_name', caption: 'User', type: 'text' }
    ].concat(searches),
    records: [],
    sortData: [
      { field: 'date', direction: 'desc' }
    ],
    onReload: function () {
      loadTweets(true, 1500);
    }
  }
}

$(document).ready(function () {
  //Configure layout
  $('#main').w2layout(config.layout);
  w2ui.layout.content('left', $().w2sidebar(config.sidebar));
  w2ui.layout.content('main', $().w2grid(config.trump));
  $().w2grid(config.clinton);
  $().w2grid(config.all);
  w2ui.layout.lock('main', '', true);
  loadTweets(false);
});

function loadTweets(reload, amount) {
  if (!amount) amount = 1500;
  w2ui.all.clear();
  w2ui.trump.clear();
  getTweets('realDonaldTrump', amount, 'trump', reload).then(function (tweets) {
    trump_tweets = tweets;
    saveTweets(trump_tweets);
    console.log("Loaded");
    w2ui.trump.add(trump_tweets);
    w2ui.all.add(trump_tweets);
    w2ui.layout.unlock('main');
  }, function () {
    //w2ui.layout.unlock('main');
    w2alert('Error loading tweets');
  });
  w2ui.clinton.clear();
  getTweets('HillaryClinton', amount, 'clinton', reload).then(function (tweets) {
    clinton_tweets = tweets;
    saveTweets(clinton_tweets);
    console.log("Loaded");
    w2ui.layout.unlock('main');
    w2ui.clinton.add(clinton_tweets);
    w2ui.all.add(clinton_tweets);
    w2ui.layout.unlock('main');
  }, function () {
    //w2ui.layout.unlock('main');
    //w2alert('Error Loading Tweets');
  });
}

function processTweets(tweets, user) {
  tweets.forEach(function (value, index) {
    tweets[index].user_name = user;
    tweets[index].sentiment = sentiment(value.text).score;
    tweets[index].recid = value.id;
    tweets[index].date = new Date(value.created_at);
  });
  return tweets;
}

function saveTweets(tweets) {
  var midPoint = Math.round(tweets.length / 2);
  var arr1 = tweets.slice(0, midPoint);
  var arr2 = tweets.slice(midPoint + 1);
  db.tweets.bulkPut(arr1).then(function () {
    db.tweets.bulkPut(arr2).then(function () {
      console.log("Saved to database");
    });
  });
}

function printTweets(tweets) {
  var total = 0;
  tweets.forEach(function (value, index) {
    var score = sentiment(value.text);
    console.log(value.created_at + ": " + value.text + " - " + value.retweet_count + " Retweets " + value.favorite_count + " Favorites, Sentiment: " + score.score + " Comparative: " + score.comparative);
    console.log("-----------");
    total += score.score;
  });
  return { average: total / tweets.length };
}

function getTweets(screen_name, max_length, grid, reload) {
  w2ui.layout.lock('main', "Loading tweets", true);
  var tweets_left = max_length;
  var tweets_full = [];
  var max_id = undefined;
  return new Promise(function (resolve, reject) {
    if (reload) {
      getNext();
    } else {
      db.tweets.where('user_name').equals(screen_name).toArray().then(function (data) {
        if (data.length != 0) {
          if (grid) w2ui[grid].status("Finished Loading");
          resolve(data);
        } else {
          getNext();
        }
      }).catch(function (error) {
        console.log("Error getting tweets from database");
        getNext();
      });
    }
    function getNext() {
      if (grid) w2ui[grid].status(tweets_full.length + " tweets loaded");
      var count = 200;
      if (tweets_left < 200) {
        count = tweets_left;
      }
      twitter.get('statuses/user_timeline', { screen_name: screen_name, count: count, max_id: max_id, trim_user: true }, function (error, tweets, response) {
        if (!error) {
          tweets_full = tweets_full.concat(tweets);
          tweets_left -= tweets.length;
          max_id = tweets[tweets.length - 1].id;
          if (tweets.length != 200 || tweets_full.length >= max_length) {
            //clearInterval(spinner);
            if (grid) w2ui[grid].status("Finished Loading");
            resolve(processTweets(tweets_full, screen_name));
          } else {
            getNext();
          }
        } else {
          console.log("Error getting tweets, aborting");
          reject();
        }
      });
    }
  });
}
