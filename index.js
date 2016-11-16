const Twitter = require('twitter');
const winston = require('winston');
const express = require('express');
const sentiment = require('sentiment');
const Promise = require('promise');
const elegantSpinner = require('elegant-spinner');
const logUpdate = require('log-update');
const frame = elegantSpinner();

var twitter = new Twitter({
  consumer_key: 'cQLiUAXWc6PCgzT6IFVbbmPRu',
  consumer_secret: 'K43X0pBt86TbaLpJFnYKdIfR1gE4mTZ5OAQBSasji4JwxhuqId',
  access_token_key: '2221736836-iWiWERD1nZB5JCcdXSuWSQsgX2ag3QEeF8K8KqA',
  access_token_secret: 'za4WSsnPGQE0Ot77cRbFy0G4TKCjmuWhUqQbfHUrfcayK'
});

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

function getTweets(screen_name, max_length) {
  var spinner = setInterval(function () {
    logUpdate("Loading Tweets "+frame());
  }, 50);
  var tweets_left = max_length;
  var tweets_full = [];
  var max_id = undefined;
  return new Promise(function (resolve, reject) {
    getNext();
    function getNext() {
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
            clearInterval(spinner);
            resolve(tweets_full);  
          } else {
            getNext();
          }
        } else {
          console.log("Error getting tweets, aborting");
          process.exit(1);
        }
      });
    }
  });
}

getTweets('realDonaldTrump', 24000).then(function (tweets) {
  printTweets(tweets);
  console.log(tweets.length + " tweets downloaded");
});

/*console.log("Tweets from Donald Trump:");
twitter.get('statuses/user_timeline', { screen_name: "realDonaldTrump", count: 200 }, function (error, tweets, response) {
  if (!error) {
    console.log("Tweet count " + tweets.length);
    console.log("Average sentiment level: " + printTweets(tweets).average);
    console.log("---------------------------------------------------------");
    console.log("Tweets from Hillary Clinton:");
    twitter.get('statuses/user_timeline', { screen_name: "HillaryClinton", count: 200 }, function (error, tweets, response) {
      if (!error) {
        console.log("Average sentiment level: " + printTweets(tweets).average);
      }
    });
  }
});*/