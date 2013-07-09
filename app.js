
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , FeedParser = require('feedparser')
  , request = require('request')
  , $ = require('jquery')
  , fs = require('fs');;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));



app.get('/rss/en', function(req, res){
    res.header("Access-Control-Allow-Origin", "*");  
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
    
    //Feed Directory
    var feedDir = __dirname + '/public/feeds';
    
    //Read Feed JSON File, parse it then pull out the date
    fs.readFile(feedDir + '/en.json', 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      var jsonParsed = JSON.parse(data)
      , feedDate = jsonParsed[0].date
      , dateObj = new Date(feedDate)
      , dateNow = new Date();
      
      if(dateNow - dateObj >= 12*60*60*1000){
    
        var jsonObj=[];
        
        $("<div class='articles'></div>").appendTo("body");
        
        request('http://t3me.com/rss/all')
        .pipe(new FeedParser())
        .on('error', function(error) {
          console.log(error);
          return res.send(jsonParsed);   
        })
        .on('meta', function (meta) {
          //console.log(meta);
        })
        .on('readable', function () {
          var stream = this, item;
          while (item = stream.read()) {
                
              //DOM Maniupulation: Cleaning description from related links and authors
              $("<div class='article'>"+item.description+"</div>").appendTo("body");   
              $(".article").find('p').eq(-1).remove();   
              $(".article").find('table').eq(-1).remove();  
              
              
              //Constructing Summar, type and proper guid
              var summary = $(".article").find('h3').first()
              , image = $(".article").find('img').first().attr('src')
              , guidStr = item.guid
              , arr = guidStr.split('/')
              , type = arr[3]
              , guid = arr[arr.length-1];
              
              //DOM Manipulation: remove first image then construct the article
              $(".article").find('img').first().remove();  
              var article = $(".article ").html()
              
              //Cleaning Summary
              cleanSummary = $(summary).text($(summary).text());
              
              //adding article to the jsonObj and flush "bad written" articles
              if($(summary).text().length > 3 && (type === "news" || type === "features")){
                  jsonObj.push({guid: guid,
                                type: type, 
                                image: image,
                                title: item.title, 
                                description: article, 
                                summary: cleanSummary.text(),
                                categories: item.categories,
                                author: item.author,
                                pubDate: item.pubdate});
             }                        
            
            //Remove from DOM
            $(".article").remove();
          }
    
        })
        .on('end', function(){
            
            var jsonRes = []; 
            
            //Add the current Time & Date
            jsonRes.push({date:dateNow, articles:jsonObj});
            
            //Save to file
            fs.writeFile( feedDir + "/en.json", JSON.stringify(jsonRes), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON-RSS file has been saved on " + dateNow);
                }
            });
            
            //Spit back Response
            return res.send(jsonRes);
        })
     
      }
      else{
        console.log("JSON-RSS file was fetched from file at " + dateNow);
        return res.send(jsonParsed);   
      }
      
    });   
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
