module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 
	var callback_id = 'wopr_game'; // 'wopr_game' is an example for testing purposes

  	robot.on(slack_msg + 'wopr_game', function(data, res) {
		 res.send('robot.on: TODO')
	});
  
}
