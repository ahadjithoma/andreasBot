var cache = require("./cache.js").getCache()

var createIssue = {
    "abortKeyword": "quit",
    "onAbortMessage": "You have cancelled the creation of an issue.",
    "requiredMessage": "This value is required!",
    "onCompleteMessage": "Thank you.",
    "conversation": [
        {
            "question": [
                "Specify `repo` name and `owner` in this format: `owner/repo`"
                +"\nLeave owner blank for Default Team's Organisation "
            ],
            "answer": {
                "name": "repo",
                "type": "string",
                "required": true
            }
        },
        {
            "question": [
                "What is the title of the issue? (required)",
                "Please give me the title of the issue. (required)"
            ],
            "answer": {
                "name": "title",
                "type": "string",
                "required": true
            }
        },
        {
            "question": "Leave a comment for that issue (`skip` to avoid)",
            "answer": {
                "name": "body",
                "type": "string",
                "required": false
            }
        },
        {
            "question": "You can set a milestone if you want!",
            "answer": {
                "name": "mileston",
                "type": "number",
                "required": false
            }
        },
        {
            "question": "Are there any assignees? (comma separated)",
            "answer": {
                "name": "assignees",
                "type": "string",
                "required": false
            }
        }
    ]
}


module.exports = { createIssue }