
$(document).ready(function () {

    //PARTICLES SETUP
particlesJS('particles-js',
{
  "particles": {
    "number": {
      "value": 65,
      "density": {
        "enable": true,
        "value_area": 800,
      },
    },
    "color": {
      "value": "#ffffff",
    },
    "shape": {
      "type": "edge",
      "stroke": {
        "width": 0,
        "color": "#000000",
      },
      "polygon": {
        "nb_sides": 5,
      },
    },
    "opacity": {
      "value": 0.9,
      "random": false,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false,
      },
    },
    "size": {
      "value": 5,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false,
      },
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#ffffff",
      "opacity": 0.4,
      "width": 2,
    },
    "move": {
      "enable": true,
      "speed": 3,
      "direction": "bottom",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200,
      },
    },
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab",
      },
      "onclick": {
        "enable": false,
        "mode": "push",
      },
      "resize": true,
    },
    "modes": {
      "grab": {
        "distance": 150,
        "line_linked": {
          "opacity": 1,
        },
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3,
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4,
      },
      "push": {
        "particles_nb": 4,
      },
      "remove": {
        "particles_nb": 2,
      },
    },
  },
  "retina_detect": true,
}
, function() {
    console.log('callback - particles.js config loaded');
});
//-----------


    $("#sidebar").mCustomScrollbar({
        theme: "minimal"
    });

    $('#sidebarCollapse').on('click', function () {
        $('#sidebar, #content').toggleClass('active');
        $('.collapse.in').toggleClass('in');
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
    });

      $("#listSearch").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $("#friendList li").filter(function() {
          $(this).toggle($(this).attr('username_friend').toLowerCase().indexOf(value) > -1)
        });
      });


    $('.button_request_yes').on('click',function(e){
        $.ajax({
            type:'POST',
            url:'accept_friend/' + $(this).attr('username_btn'),
            data:{
                csrfmiddlewaretoken: window.csrf_token,
            },
            success:function(json){
                $("li[username_req='" + json.username + "']").remove();
            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },

        });
    });

     $('.clear_btn').on('click',function(e){
        $.ajax({
            type:'POST',
            url:'clear_notifications',
            data:{
                csrfmiddlewaretoken: window.csrf_token,
            },
            success:function(json){
                $("li[username_req='" + json.username + "']").remove();

            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },

        });
    });

    $('.remove_friend_btn').on("click", function(){
       $.ajax({
            type:'POST',
            url:'/remove_friend/' + $(this).attr('username_value'),
            data:{
                csrfmiddlewaretoken: window.csrf_token,
            },
            success:function(json){
                $("li[username_req='" + json.username + "']").remove();

            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },

        });
    });
});

function fill_notifications(data) {
    notification_list = document.querySelector('.live_notify_list');
    notification_list.innerHTML = "";
    template_notification = document.querySelector('#template_notification');
    for (var i = 0; i < data.unread_list.length; i++) {
        msg = data.unread_list[i];

        if(data.unread_list[i].data.type === 'NOTIFICATION'){
            list_item = template_notification.content.cloneNode(true);
            list_item.querySelector('.notification_verb').textContent = data.unread_list[i].verb;

            list_item.querySelector('.username_link').setAttribute('href',data.unread_list[i].data.href);
            list_item.querySelector('.username_link').textContent = data.unread_list[i].data.username + " ";
            list_item.querySelector('.profile_img_req').setAttribute('src', data.unread_list[i].data.image_path);
            var x = data;
            var y = i;
            list_item.querySelector('.accept_transfer_button').onclick = function(){
                console.log(x);
                console.log(y);
                window.location.href = x.unread_list[y].data.href;
            };
            notification_list.appendChild(list_item);
        }
    }
}

function fill_friend_requests(data) {
    notification_list = document.querySelector('.live_friend_request_list');
    notification_list.innerHTML = "";
    template_notification = document.querySelector('#template_friend_request');
    for (var i = 0; i < data.unread_list.length; i++) {
        msg = data.unread_list[i];

        if(data.unread_list[i].data.type === 'FRIEND_REQUEST'){
            list_item = template_notification.content.cloneNode(true);
            list_item.querySelector('.request_verb').textContent = data.unread_list[i].verb;
            list_item.querySelector('.username_link').setAttribute('href',data.unread_list[i].data.href);
            list_item.querySelector('.username_link').textContent = data.unread_list[i].data.username + " ";
            list_item.querySelector('.profile_img_req').setAttribute('src', data.unread_list[i].data.image_path);
            var x = data;
            var y = i;
            list_item.querySelector('.accept_friend_button').onclick = function(){
                $.ajax({
                    type:'POST',
                    url: x.unread_list[y].data.href,
                    data:{
                        csrfmiddlewaretoken: window.csrf_token,
                    },
                    success:function(json){
                        refresh_friend_list(json);
                    },
                    error : function(xhr,errmsg,err) {
                    console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },
                });
            };
            notification_list.appendChild(list_item);
        }
    }
}

function refresh_friend_list(data){
    console.log('REFRESH FRIEND LIST')
    friendListElement = document.querySelector('#friendList');
    template_notification = document.querySelector('#template_friend');
    for(friend in data.friendList){
        new_friend = template_notification.content.cloneNode(true);

        new_friend.querySelector(".friend_username").textContent = friend.

        friendListElement.appendChild(new_friend);
    }

}
