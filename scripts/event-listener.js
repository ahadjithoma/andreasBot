module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 
  	var callback_id = 'wopr_game'; // 'wopr_game' is an example for testing purposes

	robot.on(slack_msg + callback_id, function(data, res) {
		console.log('robot.on: TODO');
		res.send('wopr_game')
	});
  
}