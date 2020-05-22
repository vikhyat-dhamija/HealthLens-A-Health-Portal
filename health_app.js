const express=require('express');
const path=require('path')
const http=require('http');
const io=require('socket.io');
const bodyParser = require('body-parser')
const hbs=require('hbs')
const mustache=require('mustache-express')
const jsw=require('jsonwebtoken')
const ejs=require('ejs')
//const mongoose= require('mongoose')
const mongodb=require('mongodb');
const mongoclient=mongodb.MongoClient;
//const connectionurl='mongodb://127.0.0.1:27017'
//const connectionurl='mongodb+srv://vikhyat-dhamija:Vikhyat123@cluster0-y0668.mongodb.net/admin'
//const connectionurl='mongodb+srv://vikhyat-dhamija:Vikhyat123@cluster0-y0668.mongodb.net/admin?retryWrites=true&w=majority'
//const connectionurl='mongodb+srv://vikhyat:pwd123@azurecluster-cleqy.azure.mongodb.net/admin'
const connectionurl='mongodb://vikhyat:pwd123@azurecluster-shard-00-00-cleqy.azure.mongodb.net:27017,azurecluster-shard-00-01-cleqy.azure.mongodb.net:27017,azurecluster-shard-00-02-cleqy.azure.mongodb.net:27017/test?replicaSet=azurecluster-shard-0&ssl=true&authSource=admin'
const databasename='healthlens'
const crypto = require('crypto');


const public_directory=path.join(__dirname,'public');//current directory myhealth and on that public folder attached
console.log(public_directory)
const server1=express();//express server created

//built in public directory inside the express server
server1.use(express.static(public_directory))
//server1.engine('html', ejs.renderFile)
server1.set('view engine','ejs')
server1.set('views',path.join(__dirname,"public/views"))

//starting server1 listen
const serv=server1.listen(3000,()=>{

    console.log("I have started listening ")
})



//const server2=http.createServer(serv);//http server out of express

server1.use(express.json())//to convert every json post to object form for esy access of post data

server1.use(bodyParser.urlencoded({ extended: false }))
server1.use(bodyParser.json())

//
var flag=0;//For differentiation between the login and sign up in middleware

//Registration of partial views
//server1.set('view engine', 'hbs')
//server1.engine('hbs', require('hbs').__express)
//server1.registerPartials(path.join(__dirname,'partials'))


//starting page of Login and password 

server1.get('/',(req,res)=>{

    res.render('index.ejs')
})

server1.post('/',(req,res)=>{

    flag=1;

    const un=req.body.username

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
         console.log("Not Connected")
        else
        console.log("Connected")

    const dbs=client.db(databasename)
    
    dbs.collection('users_data').findOne({username : req.body.username},(error,users)=>{
         
        if(!users)
        {
            console.log("Not Connected")
            console.log(req.body.username)
            res.render('index.ejs',{message: "User does not exist"})
        }
        else if(users.password != req.body.password )
        {
            res.render('index.ejs',{message: "Password mismatch"})
        }
        else
        {
            
            const token = jsw.sign({ _id: un }, 'thisismyfirstapplication', { expiresIn: '7 days' })
            dbs.collection('users_auth_token').insertOne({username : req.body.username , token : token})
            res.redirect('ui/'+token)
            

        }
    })
    
})

})   


//setting a middle path for the authentication
const middle_auth = (req, res, next) => {
    
    try 
    {
    
    const token = req.params.token
    console.log(token)
    const decoded_user = jsw.verify(token, 'thisismyfirstapplication')
    console.log(decoded_user)
    //Searching for the  decoded user
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
         console.log("Not Connected")
        else
        console.log("Connected")

    const dbs2=client.db(databasename)
    
    if(flag==1)
    {
    dbs2.collection('users_data').findOne({username : decoded_user._id},(error,users)=>{
    
        if(!users)
        {
            res.status(401).send({ error: 'User not found' })
        }

        else
        {
           req.user=decoded_user
           req.token=token
           console.log("Next")
           next()
           
        }
    
      
    })}
    else
    {

           req.user=decoded_user
           req.token=token
           console.log("Next")
           next()
           


    }
   })
    
    }
    catch (e) {
    
        res.status(401).send({ error: 'Please authenticate.' })
    
    }
}   

//Starting of the user UI
server1.get('/ui/:token',middle_auth,async (req,res)=>{
    
    console.log(req.token);
    res.cookie('auth',req.token).render('ui.ejs',{username : req.user._id});

})

//starting page of sign-up
server1.get('/sign_up',(req,res)=>{

    res.render("sign_up.ejs");

})


server1.post('/sign_up',(req,res)=>{
    
    
     flag=0;
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
         console.log("Not Connected")
        else
        console.log("Connected")

    const dbs=client.db(databasename)

    dbs.collection('users_data').findOne({username : req.body.un},(error,users)=>{
         
        if(users)
        {
           res.render('sign_up.ejs',{message: "User name already exist"})
        }
        else
        {

            dbs.collection('users_data').insertOne({ username: req.body.un, password: req.body.pwd , email : req.body.email})
            
            const token = jsw.sign({ _id: req.body.un }, 'thisismyfirstapplication', { expiresIn: '7 days' })
            //res.send(path.join(__dirname,"public","ui.html"))
            //res.json({ auth_token : token})

            dbs.collection('users_auth_token').insertOne({username : req.body.un , token : token})           
            res.redirect('ui/'+token)
            

        }
    
    
 

})
})
})

//To handle get request from the page of the health link on UI Page

server1.get('/healthform/:token',middle_auth,(req,res)=>{

    console.log(req.token);
    res.render('health.ejs',{username : req.user._id});

})

server1.get('/chat/:token',middle_auth,(req,res)=>{

    
    res.render('chat.ejs',{username : req.user._id});

})


server1.get('/sign_out/:token',middle_auth,(req,res)=>{

        var user=req.user._id

        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")

            const dbs=client.db(databasename)
    
            dbs.collection('users_auth_token').deleteMany({username : user})
    
            res.render("log_out.ejs")
            })
})


//For User communication
const socket=io(serv);

socket.on('connection',(my_socket)=>{

   console.log("Client connected successfully via socket.io");

   my_socket.emit('welcome',"Welcome to the My health App");

   my_socket.on('client_send_health_data',(uname,input_age,input_weight,input_bp_low,input_bp_high,input_hr_bmi,input_sl,input_sleep)=>{
    
    console.log(uname,input_age);
    hash = crypto.getHashes(); 
  
     
    x = uname+input_age+input_weight+input_bp_low+input_bp_high+input_hr_bmi+input_sl+input_sleep;
  
    hashpwd = crypto.createHash('sha1').update(x).digest('hex'); 
  
    console.log(hashpwd);  

    socket.emit('client_rec_health_data',hashpwd,uname,input_age,input_weight,input_bp_low,input_bp_high,input_hr_bmi,input_sl,input_sleep);
     
    

}

)
})



//Google object to utilise the functionality to access Google APIs
const {google} = require('googleapis');


// Scopes for authorization 
const SCOPES =[
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.activity.write',
    'https://www.googleapis.com/auth/fitness.blood_glucose.read',
    'https://www.googleapis.com/auth/fitness.blood_glucose.write',
    'https://www.googleapis.com/auth/fitness.blood_pressure.read',
    'https://www.googleapis.com/auth/fitness.blood_pressure.write',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.body.write',
    'https://www.googleapis.com/auth/fitness.body_temperature.read',
    'https://www.googleapis.com/auth/fitness.body_temperature.write',
    'https://www.googleapis.com/auth/fitness.location.read',
    'https://www.googleapis.com/auth/fitness.location.write',
    'https://www.googleapis.com/auth/fitness.nutrition.read',
    'https://www.googleapis.com/auth/fitness.nutrition.write',
    'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
    'https://www.googleapis.com/auth/fitness.oxygen_saturation.write',
    'https://www.googleapis.com/auth/fitness.reproductive_health.read',
    'https://www.googleapis.com/auth/fitness.reproductive_health.write'
    ]


    //Function to get the fitness data

    function get_fitness_data(oAuth2Client,res)
    {     
           //New Date 
            var start = new Date();
            
            //Set Hours in start Date
            start.setHours(0,0,0,0);
            
            //start date is from present date -2 
            start.setDate(start.getDate() - 60);

            // End date is the new Dtae 
            var end = new Date();

            end.setHours(23,59,59,999);  
            
            //End get date -1 
            end.setDate(end.getDate());
            
            var total_steps=0
            var total_dist=0
    
            //getting the fitness from the fitness api
            var fitness = google.fitness({version: 'v1', auth: oAuth2Client});
    
            var response=fitness.users.dataset.aggregate({
            userId: "me",
            requestBody: {
    
                "aggregateBy": [
    
                {
    
                    "dataTypeName": "com.google.step_count.delta",
    
                    "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
    
                },
    
                {
    
                    "dataTypeName": "com.google.weight.summary",
    
                    "dataSourceId": "derived:com.google.weight:com.google.android.gms:merge_weight"
    
                },
    
                {
    
                    "dataTypeName": "com.google.distance.delta",
    
                    "dataSourceId": "derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta"
    
                }
    
                ],
    
                "bucketByTime": { "durationMillis": 86400000 },
    
                "startTimeMillis": start.getTime(),
    
                "endTimeMillis": end.getTime()
    
                }
            });
    
            response.then((value)=>{ 
    
            var json = value.data ;
    
            
    
            for(var b = 0; b < json.bucket.length; b++) {
    
                // each bucket in our response should be a day
    
                var bucketDate = new Date(parseInt(json.bucket[b].startTimeMillis, 10));
    
                var steps = -1;
    
                var weight = -1;
    
                var distance = -1;
    
                
    
                if (json.bucket[b].dataset[0].point.length > 0) {
    
                steps = json.bucket[b].dataset[0].point[0].value[0].intVal;
    
                }
    
                
    
                if (json.bucket[b].dataset[1].point.length > 0) {
    
                weight = json.bucket[b].dataset[1].point[0].value[0].fpVal;
    
                }
    
                
    
                if (json.bucket[b].dataset[2].point.length > 0) {
    
                distance = json.bucket[b].dataset[2].point[0].value[0].fpVal;
    
                }
    
                
    
                console.log(steps == -1 ? ' ' : steps,weight == -1 ? ' ' : weight,distance == -1 ? ' ' : distance)
                total_steps+=steps
                total_dist+=distance
                                
    
            }
    
            console.log("Total steps : ",total_steps)
            console.log("Total distance : ",total_dist)
    
            res.render('activity.ejs',{step : total_steps , dist : total_dist }); 
        })
    
        
    }


//OAuth2 Client with all the credentials 
const oAuth2Client = new google.auth.OAuth2('1051292323310-g0bfvco26o9rfne4u6gflcin3uc3choc.apps.googleusercontent.com',
    '0n-9A7uPL2MstW1QS66M6CsK',
    'http://localhost:3000/google');

//setting google auth as global default
google.options({
    auth: oAuth2Client
  });
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */


/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */



server1.get('/activity/:token',middle_auth,(req,res)=>{

    var user=req.user._id

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('google_token_data').findOne({username : user},(error,rec)=>{

            if(!rec)
            {
                const authUrl = oAuth2Client.generateAuthUrl({access_type: 'offline',scope: SCOPES});           
                dbs.collection('google_token_data').insertOne({ username: user, token : '*****'})
                res.redirect(authUrl);
                     
            }
            else
            {              
                oAuth2Client.setCredentials(JSON.parse(rec.token));       
                get_fitness_data(oAuth2Client,res)  
                
            }
        });
    
    })
})

server1.get('/google',(req,res)=>{

    const code = req.query.code;
    const flag_del=0
    var ret

    oAuth2Client.getToken(code, (err, token) => {

        if (err) 
        {
            console.error('Error retrieving access token', err);
            flag_del=1

        }
            
        
        oAuth2Client.setCredentials(token);

        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")
    
            const dbs=client.db(databasename)

            if(flag_del==1)
            {
                dbs.collection('google_token_data').deleteMany({ token : '*****'})
            }
            else
            {
                dbs.collection('google_token_data').findOneAndUpdate({ token : '*****'},{ $set: { token : JSON.stringify(token)} },
                ()=>{
                    
                dbs.collection('google_token_data').findOne({ token : JSON.stringify(token)},(err,result)=>{

                    dbs.collection('users_auth_token').findOne({ username : result.username},(err,result)=>{
                        
                    res.redirect('/activity/'+result.token)
                    }
                    )}
                    )
                    

                })
                
                
               
            }

        })
    
    })

     
})

    //Function to get the fitness data

    function get_fitness_data1(res)
    {     

        var step_list=[]
        var dist_list=[]
        var x_list=[]
        var count=0

           //New Date 
            var start = new Date();
            
            //Set Hours in start Date
            start.setHours(0,0,0,0);
            
            //start date is from present date -2 
            start.setDate(start.getDate() - 60);

            // End date is the new Dtae 
            var end = new Date();

            end.setHours(23,59,59,999);  
            
            //End get date -1 
            end.setDate(end.getDate());
            
            var total_steps=0
            var total_dist=0
    
            //getting the fitness from the fitness api
            var fitness = google.fitness({version: 'v1', auth: oAuth2Client});
    
            var response=fitness.users.dataset.aggregate({
            userId: "me",
            requestBody: {
    
                "aggregateBy": [
    
                {
    
                    "dataTypeName": "com.google.step_count.delta",
    
                    "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
    
                },
    
                {
    
                    "dataTypeName": "com.google.weight.summary",
    
                    "dataSourceId": "derived:com.google.weight:com.google.android.gms:merge_weight"
    
                },
    
                {
    
                    "dataTypeName": "com.google.distance.delta",
    
                    "dataSourceId": "derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta"
    
                }
    
                ],
    
                "bucketByTime": { "durationMillis": 86400000 },
    
                "startTimeMillis": start.getTime(),
    
                "endTimeMillis": end.getTime()
    
                }
            });
    
            response.then((value)=>{ 
    
            var json = value.data ;
    
            
    
            for(var b = 0; b < json.bucket.length; b++) {
    
                // each bucket in our response should be a day
    
                var bucketDate = new Date(parseInt(json.bucket[b].startTimeMillis, 10));
    
                var steps = -1;
    
                var weight = -1;
    
                var distance = -1;
    
                
    
                if (json.bucket[b].dataset[0].point.length > 0) {
    
                steps = json.bucket[b].dataset[0].point[0].value[0].intVal;

                step_list.push(steps)
                x_list.push(count+1)

    
                }
    
                
    
                if (json.bucket[b].dataset[1].point.length > 0) {
    
                weight = json.bucket[b].dataset[1].point[0].value[0].fpVal;
    
                }
    
                
    
                if (json.bucket[b].dataset[2].point.length > 0) {
    
                distance = json.bucket[b].dataset[2].point[0].value[0].fpVal;

                dist_list.push(distance)
    
                }
    
                
    
                console.log(steps == -1 ? ' ' : steps,weight == -1 ? ' ' : weight,distance == -1 ? ' ' : distance)
                total_steps+=steps
                total_dist+=distance
                count+=1             
    
            }
    
            console.log("Total steps : ",total_steps)
            console.log("Total distance : ",total_dist)
    
            res.send({step : step_list , dist : dist_list , x: x_list}); 
        })
    
        
    }


server1.get('/googledata/:token',middle_auth,(req,res)=>{

    get_fitness_data1(res)
    

})

server1.get('/biodata/:token',middle_auth,(req,res)=>{

    var user=req.user._id

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('bio_data').findOne({username : user},(error,rec)=>{

            if(!rec)
            {
                res.render('bio.ejs',{name:"NA",age:0,weight:0,height:0,sex:'NA'})
                     
            }
            else
            {              
                res.render('bio.ejs',rec) 
                
            }
        });
    
    })
    

})


server1.get('/update_page/:token',middle_auth,(req,res)=>{

    res.render('update.ejs')

})

server1.post('/update_page/:token',middle_auth,(req,res)=>{

    var user=req.user._id

    var data=req.body

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('bio_data').update({username : user},{username : user , name:data.name , age:data.age , weight:data.weight , height:data.height , sex : data.sex},{upsert:true})
    
    
    })

    res.send({status : 'ok'})

})

server1.get('/news/:token',middle_auth,(req,res)=>{

    res.render('news.ejs')

})

server1.get('/health_/:token',middle_auth,(req,res)=>{

    var user=req.user._id

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        //dbs.collection('health_data').find({username : user}, { data : { $slice: -1 } } )

        dbs.collection('health_data').findOne({username : user} ,(error,rec)=>{

            if(!rec)
            {
                res.render('healthdata.ejs',{date: 0,bmi:0,bp_sys:0,bp_dias:0,sugar:0,cholestrol:0,uacid:0})                   
            }
            else
            {     
                
                
                console.log(rec.data.slice(-1)[0])
                res.render('healthdata.ejs',rec.data.slice(-1)[0])
            }
        });

})

})


server1.post('/health_/:token',middle_auth,(req,res)=>{

    var user=req.user._id

    var data=req.body

    var bm

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        var x=dbs.collection('bio_data').findOne({username : user})

        if(x.weight !=0 && x.height != 0)
        {
         bm=(0.453592*x.weight)/((x.height * 0.3048)*(x.height * 0.3048))
        }
        dbs.collection('health_data').update({username : user},{ $push: {data: {date:new Date(),bmi:bm ,bp_sys:data.bp_sys,bp_dias:data.bp_dias,sugar:data.sugar,cholestrol:data.cholestrol,uacid:data.uacid}}},{upsert:true})  
        

    })

    res.send({status : 'ok'})

})

server1.get('/update_health/:token',middle_auth,(req,res)=>{

    res.render('update_health.ejs')

})

server1.get('/reports/:token',middle_auth,(req,res)=>{

    res.render('reports.ejs')

})

server1.post('/reports/:token',middle_auth,(req,res)=>{
    //user is extraction sent by the middle layer
    var user=req.user._id
    //data sent by the post request
    var data=req.body   
    var query={}

    var params=data.health_params

    for(i=0 ; i < params.length ; i++)
    {
        var m='data.' 
        var y=m.concat(params[i])
        query[y]=1
    }
     
    query['data.date']=1

    console.log(query)

    //Now we connect to mongodb client in order to get the data 
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        console.log(typeof(data.enddate))
        var m=new Date(data.enddate.slice(0,10))
        m.setDate(m.getDate()-1)
        var e=Date.parse(m)
        var s=Date.parse(data.startdate.slice(0,10))

        var g=dbs.collection('health_data').find({username:user}).project(query);

        g.each(function (err, item) {
            
            if(item != null)
            {
               
               var v = item.data.filter((x) => {
                    return Date.parse((x.date).toISOString().slice(0,10)) >= s &&
                    Date.parse((x.date).toISOString().slice(0,10)) <= e;
                })
                
                console.log(v)
                res.send({result : v})
            }      
        });        
    })


})

//Chat room for my application for all users
//First create route for the users to access the chat box page after the authentication
server1.get('/chat1/:token',middle_auth,(req,res)=>{

    res.render('chat1.ejs',{username:req.user._id})

})

server1.get('/chatmessages/:token',middle_auth,(req,res)=>{

    //send all the messages in the database for further being seen by all the users on the page       
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('chat_messages').find({}).toArray(function(err, docs) {
            console.log("Found the following records");
            res.send({messages : docs});
          })
           
    })
})

//Then we create the socket over the express srever to listen
//const socket=io(serv);

//Then we open the socket over the express server to get connection from any of the client and after the connection we get/create the socket or tunnel for the individual client 
socket.on('connection',(my_socket)=>{
        
    //On getting the event message username we perform this.....
    my_socket.on('username', function(username) {

        my_socket.username = username;
        socket.emit('is_online', '🔵 <i>' + my_socket.username + ' join the chat..</i>');

    });


    //On getting the event message disconnect we perform this.....
    my_socket.on('disconnect', function(username) {

        socket.emit('is_online', '🔴 <i>' + my_socket.username + ' left the chat..</i>');

    })


    //On getting the event message chat message we perform this.....
    my_socket.on('chat_message', function(message) {

        //emit the message to all the tunnels connected to the user for being seen by them 
        socket.emit('chat_message', '<strong>' + my_socket.username + '</strong>: ' + message);

        //store the messages in the database for further being seen by all the users on the page       
        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")
    
            const dbs=client.db(databasename)
    
            dbs.collection('chat_messages').insertOne({username: my_socket.username , messages : message, datetime : new Date() })
               
        })


    });

})

//post registration for the newsletter
server1.get('/newsletter/:token/:email',middle_auth,(req,res)=>{

    var username=req.user._id

    console.log(username)

    var email=req.params.email

    //store the messages in the database for further being seen by all the users on the page       
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('newsletters').update({username : username},{username : username , email_newsletter : email},{upsert:true})
           
    })

  res.send({success : 1})


})


