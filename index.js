const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
var config = require('./config.json');
require('./patch.js');

const s3Bucket = "s3-ttmi-storage-prod";
const endpoint = "kmwnrvhe1e.execute-api.ap-northeast-1.amazonaws.com/test"
let send = undefined; 

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
    init(event)
    
    let auth = event.auth;
    let platoonId = event.platoonId;
    let username = jwt.verify(auth, config.jwt.KEY)
    

    if (typeof auth === "undefined" || typeof platoonId === "undefined") {
        return {}
    }
    else{

        getFile(platoonId).then(res => {
            // for checking time difference 
            var d = new Date();
            var n = d.getTime();
            var checkDiff = n - res.LastModified.getTime();
            var isOutDated = false;
            
            if(checkDiff > 300000){
                isOutDated = true; 
            }
            console.log("checkdiff: "+checkDiff)
            console.log("is outdated? "+isOutDated)
            var body = res.Body.toString()
             s3.getObject({Bucket: s3Bucket, Key: "sessions/"+username.username+"/auth.json"}, function (err,data){
                 var content = ""+data.Body+"";
                 var jsonVar = JSON.parse(content);
                 
                 if(auth == jsonVar.token){
                    if(isOutDated == false){
                        send(jsonVar.connectionId, JSON.stringify({data:body}));
                    }else{
                        send(jsonVar.connectionId,JSON.stringify({data:null}));
                    }
                 }
            })
           
        }, err => {
            console.log(err)
            s3.getObject({Bucket: s3Bucket, Key: "sessions/"+username.username+"/auth.json"}, function (err,data){
                 var content = ""+data.Body+"";
                 var jsonVar = JSON.parse(content);
                 
                 if(auth == jsonVar.token){
                    send(jsonVar.connectionId, JSON.stringify({statusCode:500, data :{}}));
                 }
            })
            
        })
    }

};


async function getFile(platoonId) {
    const s3Key = "platoons/"+platoonId + "/" + platoonId + ".json";
    return await new AWS.S3().getObject({ Bucket: s3Bucket, Key: s3Key }).promise();
}


async function getImage(platoonId) {
    const s3Key = "images/"+platoonId + "/" +platoonId + ".json";
    return await new AWS.S3().getObject({Bucket:s3Bucket,Key: s3Key}).promise();
}