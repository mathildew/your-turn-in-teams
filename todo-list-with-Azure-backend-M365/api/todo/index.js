// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const { TeamsFx } = require("@microsoft/teamsfx");
const uuid = require("uuid");


/**
 * This function handles requests sent from teamsfx client SDK.
 * The HTTP request should contain an SSO token in the header and any content in the body.
 * The SSO token should be queried from Teams client by teamsfx client SDK.
 * Before trigger this function, teamsfx binding would process the SSO token and generate teamsfx configuration.
 *
 * This function initializes the teamsfx Server SDK with the configuration and calls these APIs:
 * - getUserInfo() - Get the user's information from the received SSO token.
 * - getMicrosoftGraphClientWithUserIdentity() - Get a graph client to access user's Microsoft 365 data.
 *
 * The response contains multiple message blocks constructed into a JSON object, including:
 * - An echo of the request body.
 * - The display name encoded in the SSO token.
 * - Current user's Microsoft 365 profile if the user has consented.
 *
 * @param {Context} context - The Azure Functions context object.
 * @param {HttpRequest} req - The HTTP request.
 * @param {teamsfxConfig} config - The teamsfx configuration generated by teamsfx binding.
 */
module.exports = async function (context, req, config) {
    try {
        const method = req.method.toLowerCase();
        const accessToken = config.AccessToken;
        const teamsfx = new TeamsFx().setSsoToken(accessToken);
        // Get the user info from access token
        const currentUser = await teamsfx.getUserInfo();
        const objectId = currentUser.objectId;

        let result = "";
        switch (method) {
            case "get":
                result = database.listBy(TodoDatabase.columns.channelOrChatId, req.query.channelOrChatId);
                break;
            case "put":
                if (req.body.description) {
                    result = database.setColumn(req.body.id, TodoDatabase.columns.description, req.body.description);
                } else {
                    result = database.setColumn(req.body.id, TodoDatabase.columns.isCompleted, req.body.isCompleted ? 1 : 0);
                }
                break;
            case "post":
                result = database.insert(req.body.description, objectId, req.body.isCompleted ? 1 : 0, req.body.channelOrChatId);
                break;
            case "delete":
                if (req.body) {
                    result = database.deleteBy(TodoDatabase.columns.id, req.body.id);
                } else {
                    result = database.deleteBy(TodoDatabase.columns.objectId, objectId);
                }
                break;
        }
        return {
            status: 200,
            body: result
        }
    }
    catch (err) {
        return {
            status: 500,
            body: {
                error: err.message
            }
        }
    }
}

// TODO: Use some storage service (for example, Azure SQL Database) to store the data instead of global variables.
// This is just sample code for demonstration purpose, do not use this in production.
// Global variables in Azure Functions are not guarenteed to persist across different requests.
class TodoDatabase {
    static columns = {
        id: "id",
        description: "description",
        objectId: "objectId",
        isCompleted: "isCompleted",
        channelOrChatId: "channelOrChatId",
    }
    data = [];
    listBy(column, value) {
        const result = []
        for (const item of this.data) {
            if (item[column] === value) {
                result.push(item);
            }
        }
        return result;
    }
    setColumn(id, column, value) {
        for (const item of this.data) {
            if (item.id === id) {
                item[column] = value;
            }
        }
    }
    insert(description, objectId, isCompleted, channelOrChatId) {
        const row = {
            id: uuid.v4(),
            description,
            objectId,
            isCompleted,
            channelOrChatId,
        };
        this.data.push(row);
    }
    deleteBy(column, id) {
        this.data = this.data.filter((item) => item[column] != id);
    }
}

const database = new TodoDatabase();
