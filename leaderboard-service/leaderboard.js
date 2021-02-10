'use strict';

const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.list = (event, context, callback) => {
  var params = {
    TableName: process.env.SCORE_TABLE,
    ProjectionExpression: "id, username, score"
  };

  console.log("Scanning score table...");
  const onScan = (err, data) => {

    if (err) {
      console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
      callback(err);
    } else {
      console.log("Scan succeeded.");
      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          scores: data.Items
        })
      });
    }

  };

  dynamoDb.scan(params, onScan);

};

module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.SCORE_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch candidate.'));
      return;
    });
};


module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const username = requestBody.username;
  const score = requestBody.score;

  submitRecord(scoreRecord(username, score))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted record :: username=${username} :: score=${score}`,
          recordId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit record :: username=${username} :: score=${score}`
        })
      })
    });
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}



const submitRecord = record => {
  console.log('Submitting record');
  const scoreRecord = {
    TableName: process.env.SCORE_TABLE,
    Item: record,
  };
  return dynamoDb.put(scoreRecord).promise()
    .then(res => record);
};

const scoreRecord = (username, score) => {
  const timestamp = new Date().getTime();
  return {
    id: generateUUID(),
    username: username,
    score: score,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};


