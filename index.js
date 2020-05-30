/*const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))*/

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
const assert = require('assert');
const PORT = process.env.PORT || 3000
const public_directory=path.join(__dirname,'public');//current directory myhealth and on that public folder attached
console.log(public_directory)
const server1=express();//express server created

//built in public directory inside the express server
server1.use(express.static(public_directory))
//server1.engine('html', ejs.renderFile)
server1.set('view engine','ejs')
server1.set('views',path.join(__dirname,"public/views"))

//starting server1 listen
const serv=server1.listen(PORT,()=>{

    console.log("I have started listening ")
})



//const server2=http.createServer(serv);//http server out of express

server1.use(express.json())//to convert every json post to object form for easy access of post data

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
            
            const token = jsw.sign({ _id: un }, 'thisismyfirstapplication', { expiresIn: '600000ms' })
            
            dbs.collection('users_auth_token').deleteMany({username : req.body.username }).then(()=>{
            dbs.collection('users_auth_token').insertOne({username : req.body.username , token : token})})
            
            
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
    //console.log(token)
    
    const decoded_user = jsw.verify(token, 'thisismyfirstapplication')
    console.log(1)
    //console.log(req.cookies["auth"+decoded_user])
    //console.log(decoded_user)
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
           //console.log("Next")
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
    res.cookie(('auth'+req.user._id),req.token).render('ui.ejs',{username : req.user._id});

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
            
            const token = jsw.sign({ _id: req.body.un }, 'thisismyfirstapplication', { expiresIn: '600000ms' })
            //res.send(path.join(__dirname,"public","ui.html"))
            //res.json({ auth_token : token})
            

            dbs.collection('users_auth_token').insertOne({username : req.body.username , token : token}).then(()=>{
                dbs.collection('users_auth_token').insertOne({username : req.body.username , token : token})})   

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
            
            res.clearCookie(('auth'+req.user._id)).render("log_out.ejs")
            //res.render("log_out.ejs")
            })
})


//For User communication
const socket=io(serv);

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

    function get_fitness_data(oAuth2Client,res,user)
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
            }).catch(()=>{ 
                
                console.log("error")
                res.render('activity.ejs',{username: user,step : 'Not Found' , dist : 'Not Found' });
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
            
            console.log(user)
            res.render('activity.ejs',{username: user,step : total_steps , dist : total_dist }); 
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

var google_username

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
                /*dbs.collection('google_token_data').insertOne({ username: user, token : '*****'},(err,x)=>{

                    res.redirect(authUrl);
                })*/

                google_username=req.user._id
                res.redirect(authUrl);
                     
            }
            else
            {              
                oAuth2Client.setCredentials(JSON.parse(rec.token));    
                console.log(JSON.parse(rec.token))   
                get_fitness_data(oAuth2Client,res,user)  
                
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
          
        if(token.refresh_token)
        {
            console.log("Refresh Token:")
            console.log(token.refresh_token)
        }
        

            console.log("Access Token :")
            console.log(token.access_token)
        
        
        oAuth2Client.setCredentials(token);

        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")
    
            const dbs=client.db(databasename)

            if(flag_del==1)
            {
                //dbs.collection('google_token_data').deleteMany({ token : '*****'})
            }
            else
            {
                

                    dbs.collection('users_auth_token').findOne({ username : google_username},(err,result_ut)=>{

                        dbs.collection('google_token_data').update({username : google_username},{ username : google_username,token : JSON.stringify(token)},{upsert:true},(err,result_au)=>{

                                         res.redirect('/activity/'+result_ut.token)
                    })
                             
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
        var x_list_step=[]
        var x_list_dist=[]

        var count_step=0
        var count_dist=0

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
                x_list_step.push(count_step+1)

    
                }
                else
                {
                    step_list.push(0)
                    x_list_step.push(count_step+1)
                }
    
                
    
                if (json.bucket[b].dataset[1].point.length > 0) {
    
                weight = json.bucket[b].dataset[1].point[0].value[0].fpVal;
    
                }
               
                
    
                if (json.bucket[b].dataset[2].point.length > 0) {
    
                distance = json.bucket[b].dataset[2].point[0].value[0].fpVal;

                dist_list.push(distance)
    
                }
                else
                {
                    dist_list.push(0)

                }
    
                
    
                console.log(steps == -1 ? ' ' : steps,weight == -1 ? ' ' : weight,distance == -1 ? ' ' : distance)
                total_steps+=steps
                total_dist+=distance
                count_step+=1             
    
            }
    
            console.log("Total steps : ",total_steps)
            console.log("Total distance : ",total_dist)
    
            res.send({step : step_list , dist : dist_list , x: x_list_step}); 
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
                res.render('bio.ejs',{name:"",age:0,weight:0,height:0,sex:''})
                     
            }
            else
            {              
                res.render('bio.ejs',{username:user,name:rec.name,age:rec.age,weight:rec.weight,height:rec.height,sex:rec.sex}) 
                
            }
        });
    
    })
    

})


server1.get('/update_page/:token',middle_auth,(req,res)=>{

    res.render('update.ejs',{username: req.user._id})

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

    res.render('news.ejs',{username: req.user._id})

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
                res.render('healthdata.ejs',{username : user,date: 0,bmi:0,bp_sys:0,bp_dias:0,sugar:0,cholestrol:0,uacid:0})                   
            }
            else
            {     
                
                var received=rec.data.slice(-1)[0]
                received["username"]=user
                console.log(rec.data.slice(-1)[0])
                res.render('healthdata.ejs',received)
            }
        });

})

})

function isNumeric(num){
    num = "" + num; //coerce num to be a string
    return !isNaN(num) && !isNaN(parseFloat(num));
}

server1.post('/health_/:token',middle_auth,(req,res)=>{

    var user=req.user._id
    var flag_errors=0
    var errors={}
    var data=req.body
    //Here will be the verification of data
    //If Data is valid then we can insert that data inside our database
    //First check that whether all fields have no data then error 
    // This will be handled by the client side script
    //so always string is coming
    if((data.bp_sys.length) != 0)
    {
        if(!isNumeric(data.bp_sys) )
        {
                errors[bp_sys]="Please enter a valid Number for BP"
                flag_errors=1
        }
        else if(parseInt(data.bp_sys) > 250  || parseInt(data.bp_sys) < 50 )
        {
                errors[bp_sys]+="Please enter the Systolic BP within range"
                flag_errors=1
        }
    }
    else
    {
        data.bp_sys="-1"

    }

    if((data.bp_dias.length) != 0)
    {
        if(!isNumeric(data.bp_dias) )
        {
                errors[bp_dias]="Please enter a valid Number for BP diastolic"
                flag_errors=1
        }
        else if(parseInt(data.bp_dias) < 30  || parseInt(data.bp_dias) > 150 )
        {
                errors[bp_dias]+="Please enter the Diastolic BP within range"
                flag_errors=1
        }
    }
    else
    {
        data.bp_dias="-1"

    }

    if((data.sugar.length) != 0)
    {
        if(!isNumeric(data.sugar) )
        {
                errors[sugar]="Please enter a valid Number for Sugar Value"
                flag_errors=1
        }
        else if(parseFloat(data.sugar) < 30  || parseFloat(data.sugar) > 500 )
        {
                errors[sugar]+="Please enter the Sugar value within range"
                flag_errors=1
        }
    }
    else
    {
        data.sugar="-1"

    }

    if((data.cholestrol.length) != 0)
    {
        if(!isNumeric(data.cholestrol) )
        {
                errors[cholestrol]="Please enter a valid Number for Cholestrol Value"
                flag_errors=1
        }
        else if(parseInt(data.cholestrol) < 10  || parseInt(data.cholestrol) > 700 )
        {
                errors[cholestrol]+="Please enter the Sugar value within range"
                flag_errors=1
        }
    }
    else
    {
        data.cholestrol="-1"

    }

    if((data.uacid.length) != 0)
    {
        if(!isNumeric(data.uacid) )
        {
                errors[uacid]="Please enter a valid Number for Uric Acid Value"
                flag_errors=1
        }
        else if(parseInt(data.uacid) < 2  || parseInt(data.uacid) > 10 )
        {
                errors[uacid]+="Please enter the Uric Acid value within range"
                flag_errors=1
        }
    }
    else
    {
        data.uacid="-1"

    }

    var u_avg_bp_sys,u_avg_bp_dias,u_avg_cholestrol,u_avg_sugar,u_avg_uacid,u_count_bp_dias,u_count_bp_sys,u_count_cholestrol,u_count_sugar,u_count_uacid

    var avg_bp_dias,avg_bp_sys,avg_cholestrol,avg_uacid,avg_sugar,count_bp_dias,count_bp_sys,count_sugar,count_uacid,count_cholestrol

    var new_u_count_bp_dias,new_u_count_bp_sys,new_u_count_cholestrol,new_u_count_uacid,new_u_count_sugar

    var new_count_sugar,new_count_uacid,new_count_cholestrol,new_count_bp_dias,new_count_bp_sys

    var new_avg_sugar,new_avg_bp_dias,new_avg_bp_sys,new_avg_cholestrol,new_avg_uacid

    var new_u_avg_bp_dias,new_u_avg_bp_sys,new_u_avg_cholestrol,new_u_avg_uacid,new_u_avg_sugar

    var bm=0

    if(! flag_errors)
    {

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('bio_data').findOne({username : user},(error,x)=>{ 

            console.log(x.height)
            console.log(parseFloat(x.height))

        if(parseFloat(x.weight) !=0 && parseFloat(x.height) != 0)
        {
            //bm=parseFloat(x.weight)+2.0
            //var height_inches=(parseFloat(x.height)-Math.floor(parseFloat(x.height)))+Math.floor(parseFloat(x.height))*12
            bm=(703 * parseFloat(x.weight))/(parseFloat(x.height) * parseFloat(x.height))
            
        }  
    
        dbs.collection('health_data').update({username : user},{ $push: {data: {date:new Date(),bmi:bm.toFixed(2) ,bp_sys:data.bp_sys,bp_dias:data.bp_dias,sugar:data.sugar,cholestrol:data.cholestrol,uacid:data.uacid}}},{upsert:true})
    
    })

    
    


    //Now based upon the Data inserted in the health record of the user , we will fill the data in the statistics records for comparison purpose

    //Pull the data out of the average statistics for the user
    //assume that we have average and count of bp_sys,bp_dias,sugar,uacid,cholestrol 
    dbs.collection('stat_data').findOne({stat_name : 'count'},(error,data1)=>{ 

        if(!data1)
        {
            avg_bp_dias=0
            avg_bp_sys=0
            avg_cholestrol=0
            avg_sugar=0
            avg_uacid=0

            count_uacid=0
            count_bp_dias=0
            count_bp_sys=0
            count_cholestrol=0
            count_sugar=0
        }
        else
        {
            count_uacid=parseFloat(data1.count_uacid)
            count_bp_dias=parseFloat(data1.count_bp_dias)
            count_bp_sys=parseFloat(data1.count_bp_sys)
            count_cholestrol=parseFloat(data1.count_cholestrol)
            count_sugar=parseFloat(data1.count_sugar)
            
            console.log("sugar")
            console.log(count_sugar)

            dbs.collection('stat_data').findOne({stat_name : 'average'},(error,data2)=>{

            avg_bp_dias=parseFloat(data2.avg_bp_dias)
            avg_bp_sys=parseFloat(data2.avg_bp_sys)
            avg_cholestrol=parseFloat(data2.avg_cholestrol)
            avg_sugar=parseFloat(data2.avg_sugar)
            avg_uacid=parseFloat(data2.avg_uacid)
            
         })
        }
        
        //We have to find the user stat data also in order to update its average the same way
        dbs.collection('stat_user_data').findOne({username : req.user._id},(error,data3)=>{ 

            if(!data3)
            {
                u_avg_bp_dias=0
                u_avg_bp_sys=0
                u_avg_cholestrol=0
                u_avg_sugar=0
                u_avg_uacid=0
    
                u_count_uacid=0
                u_count_bp_dias=0
                u_count_bp_sys=0
                u_count_cholestrol=0
                u_count_sugar=0
            }
            else
            {
                u_count_uacid=parseFloat(data3.count_uacid)
                u_count_bp_dias=parseFloat(data3.count_bp_dias)
                u_count_bp_sys=parseFloat(data3.count_bp_sys)
                u_count_cholestrol=parseFloat(data3.count_cholestrol)
                u_count_sugar=parseFloat(data3.count_sugar)
    
                u_avg_bp_dias=parseFloat(data3.avg_bp_dias)
                u_avg_bp_sys=parseFloat(data3.avg_bp_sys)
                u_avg_cholestrol=parseFloat(data3.avg_cholestrol)
                u_avg_sugar=parseFloat(data3.avg_sugar)
                u_avg_uacid=parseFloat(data3.avg_uacid)
                        
            }
    
         //Calculations for the first parameter bp_sys
    if(data.bp_sys != "-1")
    {
        new_avg_bp_sys=(avg_bp_sys*count_bp_sys + parseFloat(data.bp_sys))/(count_bp_sys+1)
        new_count_bp_sys=(count_bp_sys+1)
        new_u_avg_bp_sys=(u_avg_bp_sys*u_count_bp_sys + parseFloat(data.bp_sys))/(u_count_bp_sys+1)
        new_u_count_bp_sys=(u_count_bp_sys+1)

    }
    else{
        new_avg_bp_sys=avg_bp_sys
        new_count_bp_sys=(count_bp_sys)
        new_u_avg_bp_sys=u_avg_bp_sys
        new_u_count_bp_sys=(u_count_bp_sys)
    }
    //Calculations for the second parameter bp_dias
    if(data.bp_dias != "-1")
    {
        new_avg_bp_dias=(avg_bp_dias*count_bp_dias + parseFloat(data.bp_dias))/(count_bp_dias+1)
        new_count_bp_dias=(count_bp_dias+1)
        new_u_avg_bp_dias=(u_avg_bp_dias*u_count_bp_dias + parseFloat(data.bp_dias))/(u_count_bp_dias+1)
        new_u_count_bp_dias=(u_count_bp_dias+1)
    }
    else{
        new_avg_bp_dias=avg_bp_dias
        new_count_bp_dias=(count_bp_dias)
        new_u_avg_bp_dias=u_avg_bp_dias
        new_u_count_bp_dias=(u_count_bp_dias)
    }

    //Calculations for the third parameter sugar
    if(data.sugar != "-1")
    {
        new_avg_sugar=(avg_sugar*count_sugar + parseFloat(data.sugar))/(count_sugar+1)
        new_count_sugar=(count_sugar+1)
        new_u_avg_sugar=(u_avg_sugar*u_count_sugar + parseFloat(data.sugar))/(u_count_sugar+1)
        new_u_count_sugar=(u_count_sugar+1)

    }
    else{
        new_avg_sugar=avg_sugar
        new_count_sugar=(count_sugar)
        new_u_avg_sugar=u_avg_sugar
        new_u_count_sugar=(u_count_sugar)
    }

    //Calculations for the fourth parameter cholestrol
    if(data.cholestrol != "-1")
    {
        new_avg_cholestrol=(avg_cholestrol * count_cholestrol + parseFloat(data.cholestrol))/(count_cholestrol+1)
        new_count_cholestrol=(count_cholestrol+1)
        new_u_avg_cholestrol=(u_avg_cholestrol*u_count_cholestrol + parseFloat(data.cholestrol))/(u_count_cholestrol+1)
        new_u_count_cholestrol=(u_count_cholestrol+1)
    }
    else{
        new_avg_cholestrol=avg_cholestrol
        new_count_cholestrol=count_cholestrol
        new_u_avg_cholestrol=u_avg_cholestrol
        new_u_count_cholestrol=(u_count_cholestrol)
    }

    //Calculations for the fifth parameter uacid
    if(data.uacid != "-1")
    {
        new_avg_uacid=(avg_uacid * count_uacid + parseFloat(data.uacid))/(count_uacid+1)
        new_count_uacid=(count_uacid+1)
        new_u_avg_uacid=(u_avg_uacid*u_count_uacid + parseFloat(data.uacid))/(u_count_uacid+1)
        new_u_count_uacid=(u_count_uacid+1)
    }
    else{
        new_avg_uacid=avg_uacid
        new_count_uacid=count_uacid
        new_u_avg_uacid=u_avg_uacid
        new_u_count_uacid=(u_count_uacid)
    }

    //Then we need to update the collection of one record of average statistics and user statistics
    dbs.collection('stat_data').update({stat_name : 'average'},{stat_name : 'average',avg_bp_sys:new_avg_bp_sys,avg_bp_dias:new_avg_bp_dias,avg_sugar:new_avg_sugar,avg_cholestrol:new_avg_cholestrol,avg_uacid:new_avg_uacid},{upsert:true})
    dbs.collection('stat_data').update({stat_name : 'count'},{stat_name : 'count',count_bp_sys: new_count_bp_sys,count_bp_dias : new_count_bp_dias,count_cholestrol: new_count_cholestrol,count_sugar:new_count_sugar,count_uacid:new_count_uacid},{upsert:true})
    dbs.collection('stat_user_data').update({username : req.user._id},{username : req.user._id,avg_bp_sys:new_u_avg_bp_sys,avg_bp_dias:new_u_avg_bp_dias,avg_sugar:new_u_avg_sugar,avg_cholestrol:new_u_avg_cholestrol,avg_uacid:new_u_avg_uacid,count_bp_sys: new_u_count_bp_sys,count_bp_dias : new_u_count_bp_dias,count_cholestrol: new_u_count_cholestrol,count_sugar:new_u_count_sugar,count_uacid:new_u_count_uacid},{upsert:true})

            
    })
        
})

})

    //errors[success_fail]=!flag_errors
    res.send(errors)
}

else
{
    //errors[success_fail]=!flag_errors
    res.status(400).send(errors)
}

})


server1.get('/update_health/:token',middle_auth,(req,res)=>{

    res.render('update_health.ejs',{username : req.user._id})

})

server1.get('/reports/:token',middle_auth,(req,res)=>{

    res.render('reports.ejs',{username : req.user._id})

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

//To get all messages of the chat room
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

//To get the all active users from the database to be presented to every user
server1.get('/activeusers/:token',middle_auth,(req,res)=>{

    //send all the messages in the database for further being seen by all the users on the page       
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('active_chat_members').find({}).toArray(function(err, docs){ res.send({activeusers : docs});})
           
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
        socket.emit('is_online_i',my_socket.username);
        
        //just insert the joined member name in the active members list if is not there
        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")
    
            const dbs=client.db(databasename)
    
            dbs.collection('active_chat_members').update({username : username},{username : username , status : 'active'},{upsert:true})
               
        })

        //Then just call the socket - total tunnel socket for updating their side panel with list of active members 
        //socket.emit( 'update_list_dejoin', my_socket.username);

    });


    //On getting the event message disconnect we perform this.....
    my_socket.on('disconnect', function(username) {

        socket.emit('is_online', '🔴 <i>' + my_socket.username + ' left the chat..</i>');
        socket.emit('is_online_r',my_socket.username);
        
        //just delete the member name from the active members list if is not there
        mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

            if(error)
                console.log("Not Connected")
            else
                console.log("Connected")
    
            const dbs=client.db(databasename)
    
            dbs.collection('active_chat_members').deleteOne({username : my_socket.username})
               
        })
        
        //Then just call the total socket tunnel to update their side panel with list of active members 
        //socket.emit('update_list_dejoin', my_socket.username);
        
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

//bio data details for local updation of the text box
server1.get('/biodata2/:token',middle_auth,(req,res)=>{

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
                res.send({username:user,name:"",age:0,weight:0,height:0,sex:''})
                     
            }
            else
            {              
                              
                res.send({username:user,name:rec.name,age:rec.age,weight:rec.weight,height:rec.height,sex:rec.sex}) 
                
            }
        });
    
    })
    
})

//comparison data fetch for the averages of the user and the total averages across all users
server1.get('/comparedata1/:token',middle_auth,(req,res)=>{

    // we need to get data from the stat user and stat data collections

    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('stat_data').findOne({stat_name : 'average'},(error,data)=>{ 

            dbs.collection('stat_user_data').findOne({username : req.user._id},(error,udata)=>{ 

                res.send({o_data:data,u_data:udata})

            })

        })
           
    })


})

//comparison data fetch for the averages of the user and the normal range of the value for the parameter
server1.get('/comparedata2/:token',middle_auth,(req,res)=>{

    // we need to get data from the stat user and stat data collections
    mongoclient.connect(connectionurl,{useNewUrlParser : true },(error,client)=>{

        if(error)
            console.log("Not Connected")
        else
            console.log("Connected")

        const dbs=client.db(databasename)

        dbs.collection('stat_user_data').findOne({username : req.user._id},(error,udata)=>{ 

            res.send({u_data:udata})

        })

                
    })

})

server1.get('/comparison/:token',middle_auth,(req,res)=>{
        res.render('comparison.ejs',{username:req.user._id})

})
