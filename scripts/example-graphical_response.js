module.exports = function(robot) {

  var games_buttons = require('./example-buttons.json');
  var games_menu = require('./example-menu.json');

  robot.hear(/games - buttons/i, function(res) {
	res.send(games_buttons)
  })

  robot.respond(/games - menu/i, function(res) {
	res.send(games_menu)
  })

}
