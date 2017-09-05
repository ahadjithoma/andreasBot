var url = require('url');
var querystring = require('querystring');
var slackMsgs = require('./slackMsgs.js')



module.exports = function (robot) {
	robot.router.post('/hubot/github-hooks', function (req, res) {
		var error, eventBody, data;
		try {
			if (false) {
				robot.logger.info("Github post received: ", req);
			}
			eventBody = {
				eventType: req.headers["x-github-event"],
				signature: req.headers["X-Hub-Signature"],
				deliveryId: req.headers["X-Github-Delivery"],
				payload: req.body,
				query: querystring.parse(url.parse(req.url).query)
			};
			res.send('OK');
			webhooksEventsBranching(eventBody);
		} catch (e) {
			// res.send('You supplied invalid JSON to this endpoint.');
			error = e;
			// robot.logger.error('Could not receive github response on github-hooks.js');	
			robot.logger.error("github-hooks.js error: " + error.stack + "\n");
		}
		return res.end("");
	});


	function webhooksEventsBranching(eventBody) {
		switch (eventBody.eventType) {
			case 'push':
				pushEvent(eventBody);
				break;
			case 'deployment':
				developmentEvent(eventBody);
				break;
			case 'deployment_status':
				developmentStatusEvent(eventBody);
				break;
			case 'issues':
				issuesEvent(eventBody);
				break;
			case 'issue_comment':
				issueCommentEvent(eventBody);
				break;
			case 'fork':
				break;
			case 'pull':
				break;
			case '':
				break;

			default:
				var room = eventBody.query.room
				robot.messageRoom(room, `event: ${eventBody.eventType}`);
				break;
		}
	}


	function pushEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload
		var adapter = robot.adapterName;
		let repo_name = payload.repository.full_name;
		let branch = payload.repository.default_branch;
		let repo_url = payload.repository.url + '/tree/' + branch;
		let compare_url = payload.compare;
		let commits = Object.keys(payload.commits).length;		 // get the total number of commits done

		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			let i;

			for (i = 0; i < commits; i++) {
				let user_login = payload.commits[i].author.username;
				var user_url = `https://www.github.com/${user_login}`;
				var user_name = payload.commits[i].author.name;
				var commit_id = payload.commits[i].id.substr(0, 7);		 // get the first 7 chars of the commit id
				var commit_msg = payload.commits[i].message.split('\n', 1); // get only the commit msg, not the description
				var commit_url = payload.commits[i].url;
				commit_id = "`" + commit_id + "`"; // add slack's msg format 
				msg.attachments[0].text = msg.attachments[0].text + `\n<${commit_url}|${commit_id}> ${commit_msg}`;
			}
			msg.text = `<${repo_url}|[${repo_name}:${branch}]> ${commits} new <${compare_url}|commit(s)> by <${user_url}|${user_name}>:`;
			msg.attachments[0].color = '#0000ff'; // set color = blue
			robot.messageRoom(room, msg);

		} else {
			//TODO: send a msg in plain text for other chat platforms or add any other specific formats than slack's
			robot.messageRoom(room, "push event");
		}
	}

	function developmentStatusEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload
		var adapter = robot.adapterName;
		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			let target_url = payload.deployment_status.target_url;
			let repo_url = payload.repository.html_url;
			let state = payload.deployment_status.state;
			let creator = payload.deployment_status.creator.login;
			let repo = payload.repository.full_name;
			let environment = payload.deployment.environment;
			msg.text = `<${repo_url}|[${repo}]> created by ${creator}`;
			msg.attachments[0].title = `Deployment ${state}`;
			msg.attachments[0].text = `<${target_url}|${environment}>`;
			if (state == 'pending') {
				msg.attachments[0].color = '#ff8533' // set color = orange
			} else if (state == 'success') {
				msg.attachments[0].color = '#00ff00' // set color = green 
			} else if (state == 'fail') {
				msg.attachments[0].color = '#0000ff' // set color = blue 
			} else {
				msg.attachments[0].color = '#ff0000' // set color = red 
			}
			robot.messageRoom(room, msg);
		} else {
			robot.messageRoom(room, "deployment_status event");
		}
	}

	function developmentEvent(eventBody) {
		//TODO 
	};

	function issuesEvent(eventBody) {
		//TODO: under construction
		var room = eventBody.query.room
		var payload = eventBody.payload
		var adapter = robot.adapterName;
		let repo = payload.repository.full_name;
		let repo_url = payload.repository.html_url;
		let action = payload.action;
		let issue_url = payload.issue.url;
		let issue_num = payload.issue.number;
		let issue_title = payload.issue.title;
		let issue_body = payload.issue.body;
		let user = payload.issue.user.login;
		let labels = Object.keys(payload.issue.labels).length;

		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			if (action == 'opened') {
				msg.attachments[0].pretext = `[${repo}] Issue *created* by <www.github.com/${user}|${user}>`;
				msg.attachments[0].fallback = `[${repo}] Issue created: ${issue_title}`;
				msg.attachments[0].title = `<${issue_url}|#${issue_num} ${issue_title}>`;
				msg.attachments[0].text = issue_body;
				msg.attachments[0].color = '#00ff00'; // set color = green
			} else {
				msg = `[${repo}] Issue <${issue_url}|#${issue_num} ${issue_title}>: *${action}* by <www.github.com/${user}|${user}>`;
			}

			/* assign attachement color - CURRENTLY WE ARE NOT USING ATTACHEMENTS FOR ALL ISSUES
			if (action.includes('open')){
				msg.attachments[0].color = '#00ff00'; // set color = green
			} else if (action.includes('close')){
				msg.attachments[0].color = '#ff0000'; // set color = red
			} else {
				msg.attachments[0].color = '#ff8533'; // set color = orange
			} 
			*/
			robot.messageRoom(room, msg);

		} else {
			let msg = `[${repo}] Issue ${action} by <www.github.com/${user}|${user}>`;
			msg = msg + `\n <${issue_url}|#${issue_num} ${issue_title}>` + `\n${issue_body}`;
			robot.messageRoom(room, msg);

			//todo: plain text
		}
	};

	function issueCommentEvent(eventBody) {
		//TODO
	};




}
