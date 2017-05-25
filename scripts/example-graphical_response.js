module.exports = function(robot) {

  var games_buttons = require('./games.json');
  var games_menu = require('./games.json');

  robot.hear(/games - buttons/i, function(res) {
	msg.attachments[0].callback_id = 'wopr_game';
	res.send(games_buttons)
  })

  robot.respond(/games - menu/i, function(res) {
	res.send(games_menu)
  })

}
