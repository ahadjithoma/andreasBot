var url = require('url');
var querystring = require('querystring');
var slackMsgs = require('./slackMsgs.js')
var color = require('./colors.js')
var Promise = require('bluebird')

var githubURL = 'https://www.github.com/'

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
			case 'create':
			case 'delete':
				createAndDeleteEvent(eventBody)
				break
			case 'issues':
				issuesEvent(eventBody);
				break;
			case 'issue_comment':
				issueCommentEvent(eventBody);
				break;
			case 'pull_request':
				pullRequestEvent(eventBody)
				break
			case 'pull_request_review':
				pullRequestReviewEvent(eventBody)
				break
			case 'pull_request_review_comment':
				pullRequestReviewCommentEvent(eventBody)
				break
			case 'fork':
				break;
			case 'pull':
				break;
			default:
				var room = eventBody.query.room
				robot.messageRoom(room, `event: ${eventBody.eventType}`);
				break;
		}
	}

	function pullRequestReviewEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload

		// NOT HANDLING these type of ACTIONS.
		// Delete them in case of handling them.
		if (payload.action == 'edited' || payload.action == 'dismiss') {
			return 0
		}

		var msg = { attachments: [] }
		var attachment = slackMsgs.attachment()

		var repoFullName = payload.repository.full_name
		var repoURL = githubURL + repoFullName
		var senderUsername = payload.sender.login
		var senderURL = payload.sender.html_url
		var pullReqNum = payload.pull_request.number
		var pullReqURL = payload.pull_request.html_url
		var pullReqTitle = payload.pull_request.title

		var state = payload.review.state
		switch (state) {
			case 'commented':
			case 'changes_requested':
				state = state.split('_').reverse().join(' ')
				attachment.pretext = `<${repoURL}|[${repoFullName}]> <${senderURL}|${senderUsername}> ` +
					`${bold(state)} on pull request <${pullReqURL}|#${pullReqNum}: ${pullReqTitle}> `
				attachment.text = payload.review.body
				attachment.color = 'warning'
				msg.attachments.push(attachment)
				break
			case 'approved':
				state = state.split('_').reverse().join(' ')
				attachment.pretext = `<${repoURL}|[${repoFullName}]> <${senderURL}|${senderUsername}> ` +
					`${bold(state)} pull request <${pullReqURL}|#${pullReqNum}: ${pullReqTitle}> `
				attachment.text = payload.review.body
				attachment.color = 'good'
				msg.attachments.push(attachment)
				break
		}
		attachment.fallback = attachment.pretext

		robot.messageRoom(room, msg)
	}

	function pullRequestReviewCommentEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload

		var msg = { attachments: [] }
		var attachment = slackMsgs.attachment()

		var repoFullName = payload.repository.full_name
		var repoURL = githubURL + repoFullName
		var refType = payload.ref_type //repo, branch or tag 
		var refName = payload.ref
		var refURL = repoURL + '/tree/' + refName
		var senderUsername = payload.sender.login
		var senderURL = payload.sender.html_url

		var action = payload.action
		switch (action) {
			case 'created':

				break
		}
	}

	function issueCommentEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload

		var msg = { attachments: [] }
		var attachment = slackMsgs.attachment()

		var repoFullName = payload.repository.full_name
		var repoURL = githubURL + repoFullName
		var issueURL = payload.issue.html_url
		var issueNum = payload.issue.number
		var issueTitle = payload.issue.title
		var issueType = ''
		var senderUsername = payload.sender.login
		var senderURL = payload.sender.html_url

		var action = payload.action
		switch (action) {
			case 'created':

				if (payload.issue.pull_request) {
					issueType = 'pull request'
				}
				else {
					issueType = 'issue'
				}
				attachment.pretext = `<${repoURL}|[${repoFullName}]> ${bold('New comment')} ` +
					`by <${senderURL}|${senderUsername}> on ${issueType} <${issueURL}|#${issueNum}: ${issueTitle}> `
				attachment.text = payload.comment.body
				attachment.color = color.getHex('gray')
				msg.attachments.push(attachment)
				attachment = slackMsgs.attachment()
				attachment.color = color.getHex('blue')

				if (payload.issue.assignees.length) {
					attachment.fields.push({
						title: 'Assignees:',
						value: getUsersToString(payload.issue.assignees),
						short: true
					})
				}
				msg.attachments.push(attachment)

				robot.messageRoom(room, msg)
				break
			case 'edited':
			case 'deleted':
				// TODO: is it usefull? 
				break
		}
	};


	function createAndDeleteEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload

		var repoFullName = payload.repository.full_name
		var repoURL = githubURL + repoFullName
		var refType = payload.ref_type //repo, branch or tag 
		var refName = payload.ref
		var refURL = repoURL + '/tree/' + refName
		var senderUsername = payload.sender.login
		var senderURL = payload.sender.html_url

		var msg = { attachments: [] };
		var attachment = slackMsgs.attachment()

		if (eventBody.eventType == 'delete') {
			attachment.pretext = `<${repoURL}|[${repoFullName}]> The follow ${refType} was deleted by <${senderURL}|${senderUsername}>`
		}
		else if (eventBody.eventType == 'create') {
			attachment.pretext = `<${repoURL}|[${repoFullName}]> New ${refType} was pushed by <${senderURL}|${senderUsername}>`
		}
		attachment.text = `<${refURL}|${refName}>`
		attachment.color = color.getHex('blue')
		attachment.fallback = attachment.pretext

		msg.attachments.push(attachment)

		robot.messageRoom(room, msg)
	}


	function pullRequestEvent(eventBody) {
		var room = eventBody.query.room
		var payload = eventBody.payload

		var msg = { attachments: [] }
		var attachment = slackMsgs.attachment()

		var repoFullName = payload.repository.full_name
		var repoURL = githubURL + repoFullName
		var senderUsername = payload.sender.login
		var senderURL = payload.sender.html_url
		var pullReqNum = payload.number
		var pullReqURL = payload.pull_request.html_url
		var pullReqTitle = payload.pull_request.title
		var pullReqDescr = payload.pull_request.body

		var action = payload.action // PR's action
		switch (action) {
			case 'opened':
				attachment.pretext = `<${repoURL}|[${repoFullName}]> Pull request submitted by <${senderURL}|${senderUsername}>`
				attachment.title = `<${pullReqURL}|#${pullReqNum} ${pullReqTitle}>`
				attachment.text = pullReqDescr
				var assignees = []
				var reviewers = []
				for (var i = 0; i < payload.pull_request.assignees.length; i++) {
					assignees.push(payload.pull_request.assignees[i].login)
				}
				for (var i = 0; i < payload.pull_request.requested_reviewers.length; i++) {
					reviewers.push(payload.pull_request.requested_reviewers[i].login)
				}
				if (assignees.length) {
					attachment.fields.push({
						title: 'Assignees:',
						value: assignees.toString().replace(/,/g, ', '),
						short: true
					})
				}
				if (reviewers.length) {
					attachment.fields.push({
						title: 'Reviewers:',
						value: reviewers.toString().replace(/,/g, ', '),
						short: true
					})
				}
				attachment.color = 'good'
				break
			case 'closed':
			case 'reopened':
				attachment.pretext = `<${repoURL}|[${repoFullName}]> Pull request ${bold(action)} by <${senderURL}|${senderUsername}>`
				attachment.title = `<${pullReqURL}|#${pullReqNum} ${pullReqTitle}>`
				attachment.text = pullReqDescr
				if (action == 'closed') {
					attachment.color = 'danger'
				}
				else if (action == 'reopened') {
					attachment.color = color.getHex('blue')
				}
				break
			case 'edited':
				var changedElement = ''
				if (payload.changes.base) {
					changedElement = ' the base branch'
				}
				else if (payload.changes.title) {
					changedElement = ' the title'
				}
				attachment.pretext = `<${repoURL}|[${repoFullName}]> <${senderURL}|${senderUsername}> `
					+ `${bold(action + changedElement)} on pull request <${pullReqURL}|#${pullReqNum}: ${pullReqTitle}>`
				break
			case 'assigned':
			case 'unassigned':
				attachment.pretext = `<${repoURL}|[${repoFullName}]> <${senderURL}|${senderUsername}> `
					+ `${bold('changed assignees')} (${action}) on pull request <${pullReqURL}|#${pullReqNum}: ${pullReqTitle}>`
				var assignees = []
				for (var i = 0; i < payload.pull_request.assignees.length; i++) {
					assignees.push(payload.pull_request.assignees[i].login)
				}
				if (assignees.length) {
					attachment.fields.push({
						title: 'Assignees:',
						value: assignees.toString().replace(/,/g, ', '),
						short: false
					})
				}
				attachment.color = color.getHex('blue')
				break
			case 'review_requested':
			case 'review_request_removed':
				var actionText = action.split('_').reverse().toString().replace(/,/g, ' ')

				attachment.pretext = `<${repoURL}|[${repoFullName}]> <${senderURL}|${senderUsername}> `
					+ `${bold(actionText)} on pull request <${pullReqURL}|#${pullReqNum}: ${pullReqTitle}>`
				var reviewers = []
				for (var i = 0; i < payload.pull_request.requested_reviewers.length; i++) {
					reviewers.push(payload.pull_request.requested_reviewers[i].login)
				}
				if (reviewers.length) {
					attachment.fields.push({
						title: 'Reviewers:',
						value: reviewers.toString().replace(/,/g, ', '),
						short: false
					})
				}
				attachment.color = color.getHex('blue')
				break
			default:
				robot.logger.info('pull request event action: ' + action + 'not handled')
				break
		}
		msg.attachments.push(attachment)
		robot.messageRoom(room, msg)

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
		if (payload.created) {
			msg.text = `<${repo_url}|[${repo_name}:${branch}]> ${commits} new <${compare_url}|commit(s)> by <${user_url}|${user_name}>:`;
		}
		else if (payload.forced) {
			//TODO
		}
		else if (payload.deleted) {
			// TODO
		}
		else {
			msg.text = `<${repo_url}|[${repo_name}:${branch}]> ${commits} new <${compare_url}|commit(s)> by <${user_url}|${user_name}>:`;
		}

		msg.attachments[0].color = '#0000ff'; // set color = blue
		robot.messageRoom(room, msg);


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



	function bold(text) {
		if (robot.adapterName == 'slack') {
			return `*${text}*`
		}
		// Add any other adapters here  
		else {
			return text
		}
	}

	function getUsersToString(usersArray) {
		var usersString = []
		for (var i = 0; i < usersArray.length; i++) {
			usersString.push(usersArray[i].login)
		}
		return usersString.toString().replace(/,/g, ', ')

	}

}
