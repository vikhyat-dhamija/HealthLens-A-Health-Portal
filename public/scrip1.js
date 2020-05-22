const sock=io();

button=document.getElementById('submit');

input_bp=document.getElementById('bp');

input_hr=document.getElementById('hr');

render_here=document.getElementById('render').innerHTML;

mess_place=document.querySelector('#messages');

sock.on('welcome',(message)=>{

    console.log(message)

})

document.querySelector('#submit').addEventListener('click',()=>{

sock.emit('print_health',document.getElementById('bp').value,document.getElementById('hr').value)

button.disabled=true;

input_bp.value='';

input_hr.value='';

input_bp.focus();

button.disabled=false;
})

sock.on('client_print_health',(bp,hr)=>{


    const rendering = Mustache.render(render_here,{BlP:bp , Hr:hr});

    mess_place.insertAdjacentHTML('beforeend',rendering);

    

    console.log("Blood pressue:",bp,"Heart Rate:",hr)

})

//Related to Geolocation Buttons

document.querySelector('#sendloc').addEventListener('click',()=>{
     
    if(!navigator.geolocation.getCurrentPosition){

        alert("Geolation is not supported");

    }
    else{
    navigator.geolocation.getCurrentPosition((position)=>{

        sock.emit('send_location',position.coords.latitude,position.coords.longitude,(message)=>{
  
            console.log("latitude and longitudes were : ",message)

        })

    })}
    
    })

 sock.on('reclocation',(latitude,longitude)=>{
    
    console.log(latitude,longitude);

 }
 
 
 )   


