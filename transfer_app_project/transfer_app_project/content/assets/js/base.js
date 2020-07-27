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
                request_refresh_inbox();
            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },

        });
    });

    $('.remove_friend_btn').on('click',function(e){
        console.log('POST: /remove_friend/' + $(this).attr('username_value'));
        $.ajax({
            type:'POST',
            url:'/remove_friend/' + $(this).attr('username_value'),
            data:{
                csrfmiddlewaretoken: window.csrf_token,
            },
            success:function(json){
                //$("div button[username_value='" + json.username + "']").remove();
                request_refresh_friend_list();
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

    $(window).resize(function() {
          $('.social_tab').css('height','100%').css('height','-=83px');
    });



    $('.social_tab').css('height','100%').css('height','-=83px');
    var toggledFriends = false;
    $('.toggle_friends').on("click", function(){
        if(toggledFriends==true){

            $('.social_tab').css('margin-right','-418px');
            toggledFriends=false;
        }
        else{

            $('.social_tab').css('margin-right','0');
            toggledFriends=true;
        }
    })

});

function fill_notifications(data) {
    notification_list = document.querySelector('.live_notify_list');
    notification_list.innerHTML = "";
    template_notification = document.querySelector('#template_notification');
    var notif_count = 0;
    for (var i = 0; i < data.unread_list.length; i++) {
        msg = data.unread_list[i];

        if(data.unread_list[i].data.type === 'NOTIFICATION'){
            notif_count++;
            list_item = template_notification.content.cloneNode(true);
            list_item.querySelector('.notification_verb').textContent = data.unread_list[i].verb;

            console.log(list_item);
            list_item.querySelector('.selectable-notification').setAttribute('notification_id', data.unread_list[i].id);
            list_item.querySelector('.username_link').setAttribute('href',data.unread_list[i].data.href);
            list_item.querySelector('.username_link').textContent = data.unread_list[i].data.username + " ";
            list_item.querySelector('.profile_img_req').setAttribute('src', data.unread_list[i].data.image_path);

            var close_btn = list_item.querySelector('.close_notification');

            var x = data;
            var y = i;
            list_item.querySelector('.accept_transfer_button').onclick = function(){
                console.log(x);
                console.log(y);
                window.location.href = x.unread_list[y].data.href;
            };

            console.log(data.unread_list[i]);
            notification_list.appendChild(list_item);
            itm = notification_list.childNodes[notification_list.childNodes.length-1];
            console.log('SOAAAAAAA')
            console.log(itm);
            document.querySelector('#notification_count').childNodes[0];
            close_btn.onclick = function(e){
                console.log('CLOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOSEEEEEEEEEEEEEE');
                if (!e)
                e = window.event;

                //IE9 & Other Browsers
                if (e.stopPropagation) {
                  e.stopPropagation();
                }
                //IE8 and Lower
                else {
                  e.cancelBubble = true;
                }
                $.ajax({
                    type:'POST',
                    url:'/clear_notification/' + data.unread_list[y].id,
                    data:{
                        csrfmiddlewaretoken: window.csrf_token,
                    },
                    success:function(json){
                        request_refresh_inbox();
                    },
                    error : function(xhr,errmsg,err) {
                        console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },

                });
            };
        }
    }
    document.querySelector('#notification_count').childNodes[0].nodeValue ="Notifications (" + notif_count + ")";
}

function fill_friend_requests(data) {
    request_refresh_friend_list();
    notification_list = document.querySelector('.live_friend_request_list');
    notification_list.innerHTML = "";
    template_notification = document.querySelector('#template_friend_request');
    var request_count = 0;
    for (var i = 0; i < data.unread_list.length; i++) {
        msg = data.unread_list[i];

        if(data.unread_list[i].data.type === 'FRIEND_REQUEST'){
            request_count++;
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
                        request_refresh_inbox();
                    },
                    error : function(xhr,errmsg,err) {
                    console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },
                });
            };
            var close_btn = list_item.querySelector('.close_friend_request');
            close_btn.onclick = function(e){
                console.log('CLOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOSEEEEEEEEEEEEEE');
                if (!e)
                e = window.event;

                //IE9 & Other Browsers
                if (e.stopPropagation) {
                  e.stopPropagation();
                }
                //IE8 and Lower
                else {
                  e.cancelBubble = true;
                }
                $.ajax({
                    type:'POST',
                    url:'/decline_friend/' + data.unread_list[y].data.username,
                    data:{
                        csrfmiddlewaretoken: window.csrf_token,
                    },
                    success:function(json){
                        request_refresh_inbox();
                    },
                    error : function(xhr,errmsg,err) {
                        console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },

                });
            };

            notification_list.appendChild(list_item);
        }
    }
    document.querySelector('#friend_request_count').childNodes[0].nodeValue ="Friend Requests (" + request_count + ")";
}

function refresh_friend_list(data){
    console.log('REFRESH FRIEND LIST')
    console.log(data)
    friendListElement = document.querySelector('#friendList');
    friendListElement.innerHTML="";
    template_notification = document.querySelector('#templateFriend');
    for(var i = 0; i < data.length; i++){
        var friend = data[0];
        new_friend = template_notification.content.cloneNode(true);
        console.log(friend);
        new_friend.querySelector(".friend_username").textContent = friend.username;
        new_friend.querySelector(".set_username_friend").setAttribute('username_friend',friend.username);
        new_friend.querySelector(".profile_img_friend").src = friend.imageurl;
        new_friend.querySelector(".set_profile_href").href = '/profile/' + friend.username;
        new_friend.querySelector(".set_start_session_href").href = '/live_transfer/' + friend.username;
        new_friend.querySelector(".set_username_value").setAttribute('username_value', friend.username);
        console.log(new_friend);
        console.log(friendListElement);
        friendListElement.appendChild(new_friend);
    }
    document.querySelector('#friend_count').textContent = "Friend List (" + data.length + ")";
    $('.remove_friend_btn').on('click',function(e){
        console.log('POST: /remove_friend/' + $(this).attr('username_value'));
        $.ajax({
            type:'POST',
            url:'/remove_friend/' + $(this).attr('username_value'),
            data:{
                csrfmiddlewaretoken: window.csrf_token,
            },
            success:function(json){
                //$("div button[username_value='" + json.username + "']").remove();
                request_refresh_friend_list();
            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },

        });
    });

    /*      <a class="dropdown-toggle inline set_text_content" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {{ friend.username }}
            </a>

            <div class="dropdown-menu" aria-labelledby="dropdownMenuLink">
                <a class="dropdown-item set_profile_href" href="{% url 'accounts:profile' friend.username %}">View profile</a>
                <a class="dropdown-item set_start_session_href" href="{% url 'transfers:start_session_user' friend.username %}">Send files...</a>
                <button style="border:0;background:inherit;margin:0;padding-left:10px;" username_value = "{{friend.username}}" class="set username_value dropdown-item remove_friend_btn">Remove Friend</button>
            </div>
    */

}

function request_refresh_friend_list(){
    //GET /inbox/notifications/api/unread_list/?max=5
    console.log('GET /friend_list/');
    $.ajax({
        type:'GET',
        url:'/friend_list/',
        data:{
        },
        success:function(data){
            refresh_friend_list(data)
        },
        error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
        },

    });
}

function request_refresh_inbox(){
    //GET /inbox/notifications/api/unread_list/?max=5
    $.ajax({
        type:'GET',
        url:'/inbox/notifications/api/unread_list/?max=5',
        data:{
            csrfmiddlewaretoken: window.csrf_token,
        },
        success:function(data){
            fill_notifications(data);
            fill_friend_requests(data);
        },
        error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
        },

    });
}
