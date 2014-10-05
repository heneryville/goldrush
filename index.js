var util = require('util')
  , _ = require('lodash')
  , constants = require('./constants.json')
  , Game = require('./game')
  , readline = require('readline')
;

//**************
//* State
//*************
var game = new Game('./mine.dot');
game.report();
//game.survey('rv1');
var year = 1;


//******************
//* Loop
//******************
var rl = readline.createInterface(process.stdin, process.stdout);
updatePrompt();
rl.prompt();
rl.on('line', function(line) {
  var pieces = line.trim().split(' ');
  switch(pieces[0]) {
    case 'next':
      game.simulate();
      year++;
      updatePrompt();
    break;
    case 'report':
      game.report();
    break;
    case 'mine':
      attempt(function() {
      console.log("Mined ",game.sample(pieces[1],pieces[2]));
      });
    break;
    case 'stock':
      attempt(function() {
        game.stock(pieces[1], +pieces[2]);
        console.log("Now at ",game.get(pieces[1]));
      });
    break;
    case 'get':
      attempt(function() {
      console.log("Got ",game.get(pieces[1]));
      });
    break;
    case 'survey':
      attempt(game.survey.bind(game,pieces[1]));
    break;
    default:
        console.log('Unknown command');
    break;
  }
  rl.prompt();
}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});
;

function attempt(cb) {
  try {
    cb();
  }
  catch(e) {
    console.log("Error: ", e.message || e);
  }
}

function updatePrompt() {
  rl.setPrompt('Year '+year+' [next, mine, get, stock, report] >');
}
