module.exports = function(robot) {
  
	var slack_msg = 'slack:msg_action:'; 

	robot.on(slack_msg + 'wopr_game', function(data, res) {
		console.log('robot.on: TODO');
		res.send('wopr_game')
	});
  
}









