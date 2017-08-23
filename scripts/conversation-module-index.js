var Conversation = require('./hubot-conversation/index.js');

function DynamicConversation(robot) {
    this.robot = robot;
    this.switchBoard = new Conversation(robot, 'user');
}

DynamicConversation.prototype.startDialog = function (res, convModel, answers = {}, n = 0) {

    return new Promise((resolve, reject) => {

        var conversation = convModel.conversation
        if (n < conversation.length) {
            var dialog = this.switchBoard.startDialog(res, 6000 * 10);
            var question = conversation[n].question
            if (question.constructor == Array) {
                res.reply(question[getRandom(0, question.length)]);
            } else {
                res.reply(question);
            }

            dialog.addChoice(new RegExp(" (.*)", "i"), function (res) {
                msg = res.match[1]
                dialog.finish()

                if (msg == convModel.abortKeyword) {
                    res.reply(convModel.onAbortMessage)
                    reject('canceled')
                } else if (msg == 'skip' && conversation[n].answer.required) {
                    res.reply(convModel.requiredMessage)
                    resolve(DynamicConversation.startDialog(res, convModel, answers, n))
                } else if (msg == 'skip') {
                    answers[conversation[n].answer.name] = null
                    resolve(startDialog(res, convModel, answers, n + 1))
                } else {
                    if (conversation[n].answer.type == 'string') {
                        answers[conversation[n].answer.name] = msg
                        resolve(startDialog(res, convModel, answers, n + 1))
                    } else if (conversation[n].answer.type == 'number' && isNumber(msg)) {
                        answers[conversation[n].answer.name] = msg
                        resolve(startDialog(res, convModel, answers, n + 1))
                    } else if (conversation[n].answer.type == 'number' && !isNumber(msg)) {
                        res.reply('(Answer must be a number)')
                        resolve(startDialog(res, convModel, answers, n))
                    }
                }
            });
        } else {
            resolve(answers)
            res.reply(convModel.onCompleteMessage)
        }
    })

}

function createIssue(userid, data) {
    console.log(userid + ' ', data)
}

function isNumber(obj) { return !isNaN(parseFloat(obj)) }

// get an integer between [min, max) or [min, max-1]
function getRandom(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}



module.exports = function (robot) {
    return new DynamicConversation(robot);
};