
/* --- application logic --- */

// constants specific to the application
const TOP_LIMIT = 10;

function findTopWords(content) {
  // split the text by sequence of non-alphanumeric characters
  const wordSequence = content.split(/[^\w]+/);

  // count each word
  const wordCounts = {}
  for (var i=0; i<wordSequence.length; i++) {
    var word = wordSequence[i];
    if (! Number.isInteger(wordCounts[word])) {
      wordCounts[word] = 0;
    }
    wordCounts[word] += 1;
  }

  // sort words by their counts in descending order
  var words = Object.keys(wordCounts);
  var wordsSortedByCount = words.sort(function(a, b) {
    return wordCounts[b] - wordCounts[a];
  });

  // determine the most frequent words
  var topWords = [];
  for (var i=0; i<TOP_LIMIT && i<wordsSortedByCount.length; i++) {
    var word = wordsSortedByCount[i];
    topWords.push({ word: word, count: wordCounts[word] });
  }

  return topWords;
}

function generateTopWordsHTMLSnippet(topWords) {
  return `
    <table border="1">
      <tr><th>word</th><th>count</th></tr>
      ${topWords.map(function(wordCount){
          return `<tr><td>${wordCount.word}</td><td>${wordCount.count}</td></tr>`;
        }).join('')}
    </table>
  `
}

//check if URL is in table and if so get top words snippet
checkURL = function (dataURL, callback){
    var AWS = require("aws-sdk");
    AWS.config.update({
      region: "us-west-2",
      endpoint: "dynamodb.us-west-2.amazonaws.com"
    });

    var docClient = new AWS.DynamoDB.DocumentClient();

    var table = "220b-week4-3";

    var url = dataURL;


    var params = {
        TableName: table,
        Key:{
            "URL": url
        }
    };
   

    docClient.get(params, function(err, data) {
      var snippet = false;
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            //console.log("GetItem topWords succeeded:", data.Item.topWords_snippet);
            try {
              snippet = data.Item.topWords_snippet;
            }
            catch(err) {
              snippet = false;
            }
            finally{
              return callback(snippet);
            }
            
            
	       
        }
    
    });
	
};
//save URL and top words snippet into a table
saveURL_snippet = function(dataURL, dataSnippet, callback){

        var AWS = require("aws-sdk");

        AWS.config.update({
            region: "us-west-2",
            endpoint: "dynamodb.us-west-2.amazonaws.com"
            });

        var docClient = new AWS.DynamoDB.DocumentClient();

        var table = "220b-week4-3";
        var url = dataURL;
        var snippet = dataSnippet;

        var params = {
            TableName:table,
            Item:{
                "URL": url,
                "topWords_snippet":snippet

            }
        };


        console.log("Adding new item URL and snippet");
            docClient.put(params, function(err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item: URL and snippet", JSON.stringify(data, null, 2));
            }
            });


}       ;

//global variabke to save URL
var URL =  null;
function handleRequest(data, callback) {
    URL = data.url;
    //console.log(URL);
  if (data.url.length == 0) {
    callback(generateTopWordsHTMLSnippet(findTopWords(data.content)));
  } else {
    
    checkURL(data.url, function(responce){
        //save response objrect
        val = responce;
        //check the type of val 
        //if string ->return callback with stored snippet
        //if else ->return callback with http object
        if (typeof(val)=="string") {
          callback(val);
            console.log("TRUE");
        }else {
            console.log("FALSE");
          const http = require('http');
            http.get(data.url, function(response) {
            var body = '';
            response.on('data', function(chunk) {
            body += chunk;
          });
           
          response.on('end', function() {
          callback(generateTopWordsHTMLSnippet(findTopWords(body)));
          });
          });
        }
}     );


    /*const http = require('http');
    http.get(data.url, function(response) {
      var body = '';
      response.on('data', function(chunk) {
        body += chunk;
      });
      response.on('end', function() {
        callback(generateTopWordsHTMLSnippet(findTopWords(body)));
      });
    });*/
  }
}

// modules/dependencies we need to run a web server
const express = require('express')  
const bodyParser = require("body-parser");
const app = express()  
const PORT = 3000;

app.use(bodyParser.urlencoded({extended : true}));

app.listen(PORT, function(err) {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${PORT}`)
})

app.post('/findTopWords', function(request, response) {  
    //store snippet response object
    var snnipet = null;
  handleRequest(request.body, function (output) {
    // add a CORS header, so that the request can be done from any domain
    response.header('Access-Control-Allow-Origin', '*')
    
    snippet = output;
    //remove \n
    snnipet_String = snippet.replace(/\r?\n|\r/g, " ");

    ///save URL and snippet into a table
    saveURL_snippet(URL, snnipet_String, function(responce){
        console.log(response);
        }
    );  
    response.send(output);
  });
})

