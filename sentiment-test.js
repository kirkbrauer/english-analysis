const sentiment = require('sentiment');
const readline = require('readline');
const SummaryTool = require('node-summary');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter Text: ', (answer) => {
  // TODO: Log the answer in a database
  console.log(sentiment(answer));
  SummaryTool.summarize("", answer, function(err, summary) {

    console.log(summary);
  });

  rl.close();
});