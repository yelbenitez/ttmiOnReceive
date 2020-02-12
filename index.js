const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
require('./patch.js');
let send = undefined;

const endpoint = "0qplh5wgmg.execute-api.ap-northeast-1.amazonaws.com/Test"
const s3Bucket = "s3-ttmi-storage-dev";

const dynamoTable = 'ttmi-sessions'

function init(event) {
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: endpoint
    });
    send = async(connectionId, data) => {
        await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: `${data}`
        }).promise();
    }
}

exports.handler = (event, context, callback) => {
    init(event);
    console.log("handler event")
    console.log(event)
    console.log("BODY")
    console.log(event.body)
    //const body = JSON.parse(event.body);
    let message = event.message;
    let auth = event.auth;
    let platoonId = event.platoonId;

    console.log(auth);
    console.log(platoonId);

    // let message = "Temo"
    if (typeof auth === "undefined" || typeof platoonId === "undefined") {
        //Dont send anything if no authT
        console.log("AUTH PLATOON")
        return {}
    }
    else {

        getFile(platoonId).then(data => {
          //  if (err) {
           //     console.log("hase errro in getting file");
           //     console.log(err);
           //     return callback(null, { statusCode: 500, message: "Something went wrong in getting the S3 File." })
          //  }
            console.log("has data")
            console.log(data)
            var data = data.Body.toString()
            getConnections().then((conn) => {
                console.log(conn.Items);
                conn.Items.forEach(function(connection) {
                    if (connection.authToken == auth) {
                        console.log("Connection " + connection.connectionId)
                        // if (connection.type == "receiver") {
                        send(connection.connectionId, JSON.stringify({statusCode:200, data:data}));
                        // }
                    }
                });
            });
        }, err => {
            console.log(err)
            console.log("WE HAVE A PROBLEM")
          
           getConnections().then((conn) => {
                console.log(conn.Items);
                conn.Items.forEach(function(connection) {
                    if (connection.authToken == auth) {
                        console.log("Connection " + connection.connectionId)
                        // if (connection.type == "receiver") {
                        send(connection.connectionId, JSON.stringify({statusCode:500, data :{}}));
                        // }
                    }
                });
            });
            
        })
    }

};

function getConnections() { return ddb.scan({ TableName: dynamoTable, }).promise(); }

async function getFile(platoonId) {
    console.log("GET fiLE")
    const s3Key = platoonId + "/" + platoonId + ".json";
    return await new AWS.S3().getObject({ Bucket: s3Bucket, Key: s3Key }).promise();
}
