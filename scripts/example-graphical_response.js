module.exports = function(robot) {

  var games_buttons = require('./games.json');
  var games_menu = require('./games.json');

  robot.hear(/games - buttons/i, function(res) {
	res.send(games_menu)
  })

  robot.respond(/games - menu/i, function(res) {
	res.send(games_menu)
  })

}
