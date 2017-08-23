module.exports = function (robot) {

    const Conversation = require('./hubot-conversation/index.js');
    var switchBoard = new Conversation(robot);

    robot.respond(/jump/, function (res) {
        var convModel = {
            abortKeyword: "quit",
            onAbortMessage: "You have cancelled the creation of an issue.",
            requiredMessage: "This value is required!",
            onCompleteMessage: "Thank you.",
            conversation: [
                {
                    question: ['What is the title of the issue? (Required)', 'rf'],
                    answer: {
                        name: 'title',
                        type: 'string', //// could be string, number
                        required: true
                    }
                }
                ,
                {
                    question: 'Leave a comment for that issue (`skip` to avoid)', answer: {
                        name: 'body',
                        type: 'number',
                        required: false
                    }
                }
                ,
                {
                    question: 'You can set a milestone if you want!',
                    answer: {
                        name: 'mileston',
                        type: 'string',
                        required: false
                    }
                },
                {
                    question: 'Are there any assignees? (comma separeted please)',
                    answer: {
                        name: 'assignees',
                        type: 'string',
                        required: false
                    }
                }
            ]
        }

        askUser(res, convModel).then(ans=>{console.log('ans',ans)}).catch(err =>{console.log('e',err)})

    });

    function askUser(res, convModel, answers = {}, n = 0) {

        return new Promise((resolve, reject) => {

            var conversation = convModel.conversation
            if (n < conversation.length) {
                var dialog = switchBoard.startDialog(res, 6000 * 10);
                var question = conversation[n].question
                if (question.constructor == Array) {
                    res.reply(question[getRandom(0, question.length)]);
                } else {
                    res.reply(question);
                }

                dialog.addChoice(new RegExp(robot.name + " (.*)", "i"), function (res) {
                    msg = res.match[1]
                    dialog.finish()

                    if (msg == convModel.abortKeyword) {
                        res.reply(convModel.onAbortMessage)
                        reject('cancelled')
                    } else if (msg == 'skip' && conversation[n].answer.required) {
                        res.reply(convModel.requiredMessage)
                        resolve(askUser(res, convModel, answers, n))
                    } else if (msg == 'skip') {
                        answers[conversation[n].answer.name]  = null
                        resolve(askUser(res, convModel, answers, n + 1))
                    } else {
                        if (conversation[n].answer.type == 'string') {
                            answers[conversation[n].answer.name] = msg
                            resolve(askUser(res, convModel, answers, n + 1))
                        } else if (conversation[n].answer.type == 'number' && isNumber(msg)) {
                            answers[conversation[n].answer.name] = msg
                            resolve(askUser(res, convModel, answers, n + 1))
                        } else if (conversation[n].answer.type == 'number' && !isNumber(msg)) {
                            res.reply('(Answer must be a number)')
                            resolve(askUser(res, convModel, answers, n))
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

}