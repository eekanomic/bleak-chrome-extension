
try{Typekit.load();}catch(e){}

$(document).ready(function() {

    var BLEAK_MSG,
        switchTimer,
        $el,
        $intro, $icon, $weather,
        splashVisible = true,
        whereVisible = false,
        forecastVisible = false,
        weatherData,
        days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
        local_weather,
        local_forecast,
        user_location;

        $.getJSON( './static/data/data.json?r='+(Math.random()*99999), _onDataLoaded);


        function _onDataLoaded(data) {

            BLEAK_MSG = data;
            start();
        }

    function start(){

        var timeSinceUpdate = 0;

        $el = $('.page');
        $intro = $('.intro');
        $icon = $('.wrapper');
        $weather = $("#weather");

//        local_weather = null;
        local_weather = JSON.parse(localStorage.getItem("bleak_weather"));
        local_forecast = JSON.parse(localStorage.getItem("bleak_forecast"));
        user_location = localStorage.getItem("bleak_location");

//        console.log(local_weather)
//        console.log(local_forecast)

        if (local_weather && local_weather.timestamp){
            var t1 = (Date.now())*.001;
            var t2 = local_weather.timestamp;
            timeSinceUpdate =((t1-t2)/60);
//            console.log(timeSinceUpdate)
        }

        if (timeSinceUpdate && timeSinceUpdate<15){
//            console.log('weather exists',timeSinceUpdate,local_weather)
            showWeather(local_weather);
            //console.log(local_forecast)
            if (local_forecast) var timer = setTimeout(showForecast,500)
        } else if (user_location){

            loadWeather(user_location);
        }
        else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(loadWeather, GeoLocationError, {
                timeout: 7000,
                enableHighAccuracy: true,
                maximumAge: 3000
            });
        }

        //Where are you
        $('form', $intro).on('submit', function(e){
            e.preventDefault();
            onSubmitWhere();
        });

        $(window).resize(onResize);
    }

    function showError(error) {
        //get backup
//        $weather = localStorage.getItem("bleak_data");
        console.log('error',error, $weather.updated);

//            if ($weather.updated) showWeather($weather);
//            else {
        $('.splash').show();
        //setTimeout(start, 10000)

        showDummy()
        return;
        //so sorry no internets
        $('.error').show();
        $el.hide();
//            }
    }

    function animate(str,icon){

        $("svg").hide();
       setSVGsize();

        $weather.show();
        $weather.html(str);
        $weather.hide();

        $el.show();

        $icon.show();
        icon.delay(0).fadeIn(2000);
        $weather.delay(100).fadeIn(2000);

        var cond = getWeatherCond(weatherData.currently, !$el.hasClass('night')),
            txtclr = !$el.hasClass('night') ? '#4A4A4A' : '#ffffff',
            bgclr;

        switch(cond) {
            case 'sunny':
                bgclr = '#E9F8FF';
                break;
            case 'precipitation':
                bgclr = '#EDECED';
                break;
            case 'other':
                bgclr = '#f5f5f5';
                break;
            case 'night':
                bgclr = '#00082A';
                break;
            default:
                bgclr = '#00082A';
        }

        if ( bgclr!='#00082A')  TweenLite.set($el,{'backgroundImage': 'linear-gradient(rgba(80,227,194,.2),'+bgclr+')'});
        else {
            $el.css({'backgroundImage':'none'});
            TweenLite.set($el,{'backgroundImage': 'linear-gradient('+bgclr+','+bgclr+')'});
        }
        TweenLite.to($weather,1,{'color':txtclr});

        //forecast
        $('h3',$weather).css({'cursor':'pointer'}).click(toggleForecast)

        //where
        $('.place',$weather).css({'cursor':'pointer'}).click(askForLocation)
    }

    /**********************
     *
     *  weather data
     *
     **********************/

    function loadWeather(location) {
        var lat,lon,loc;

        if (typeof location == "string") {
            loc = location;
            lat = lon = null;
        }
        else {
            loc = null;
            lat = location.coords.latitude;
            lon = location.coords.longitude;
        }

        $.ajax({	//create an ajax request to load_page.php
            type: "GET",
            data: {
                    lat: lat,
                    lon : lon,
                    q : loc,
                    appid : "6cbb110c72aadc5a2828472efbcb91d5",
                    units : "metric"
            } ,
            url: "http://api.openweathermap.org/data/2.5/weather",
            dataType: "json",	//expect html to be returned
            success: function(response){
               formatWeather(response);
               //get forcast
               loadForecast(weatherData.city_id);
            },
            error: function(error){
               showDummy()
            }
        });
    }

    var error_count = 0;

    function loadForecast(city){
        $.ajax({	//create an ajax request to load_page.php
            type: "GET",
            data: {
//                lat: location.coords.latitude,
//                lon : location.coords.longitude,
                    id : city,
                appid : "6cbb110c72aadc5a2828472efbcb91d5",
                units : "metric"
            } ,
            url: "http://api.openweathermap.org/data/2.5/forecast",
            dataType: "json",	//expect html to be returned
            success: function(response){

//                console.log(response.list[0].main);
                local_forecast = response;
                showForecast();
                localStorage.setItem("bleak_forecast", JSON.stringify(local_forecast));
                error_count = 0;
            },
            error: function(error){
                console.log('error',error);

                if (error_count<5) var timer = setTimeout(function(){loadForecast(weatherData.city_id)}, 100);
                error_count++;
            }
        });
    }

    function formatWeather(data){

        var sr = new Date( data.sys.sunrise *1000),
            ss = new Date( data.sys.sunset *1000),
            weather= {};

        weather.timestamp =  (Date.now())*.001;
        weather.dt = data.dt;
        weather.updated =  new Date( data.dt *1000);
        weather.code = data.weather[0].id;
        weather.temp = Math.round(data.main.temp);
        weather.humidity = data.main.humidity+"%";
        weather.currently = data.weather[0].description;
        weather.city = data.name;
        weather.city_id = data.id;
        weather.country = data.sys.country;
        weather.day = days[new Date().getDay()];
        weather.sunrise = sr.getHours() + ":" + sr.getMinutes();
        weather.sunset = ss.getHours() + ":" + ss.getMinutes();

        //console.log('OpenWeather', weather)

        showWeather(weather);
    }

    function GeoLocationError(error){
        $('.splash').fadeOut(600, function(){
            $('.splash').hide();
            $intro.fadeIn(600);
        });
    }

    /**********************
     *
     * display weather
     *
     **********************/

     function showWeather(weather) {

        if(splashVisible){
            $('.splash').fadeOut(500);
            splashVisible = false;
        }

        if ($intro){
            $intro.fadeOut(500);
            $intro=null;
            whereVisible = false;
        }
        else{
            $icon.fadeOut(600);
            $weather.fadeOut(600);
        }

        forecastVisible = false;

        localStorage.setItem("bleak_weather", JSON.stringify(weather));
         weatherData = weather;
        var w = weather;
        var icon = $('.'+ w.code, $icon);
//        var icon = $('.sunrise', $icon);
        var index = !getDaytime() && icon[1] ?1:0;

        //night/day
        $el.toggleClass('night',!getDaytime());

//        console.log(w.updated)
        //var u = String(w.updated).slice(16,21);
        var h =new Date(w.updated).getHours()>0 ? new Date(w.updated).getHours() : "00",
            m =new Date(w.updated).getMinutes()>9 ? new Date(w.updated).getMinutes() : "0"+String(new Date(w.updated).getMinutes());


        var _html = '<p>today is <span class="teal">'+ w.day+'</span></p>'
        _html += '<h3>'+w.temp+'&deg;'+'</h3>';
//        _html += '<p>'+w.high+'&deg; / '+w.low+'&deg;</p>';
        _html += '<p>'+ w.currently+'</p>';
        _html += '<p class="place">'+w.city+', '+w.country+'</p>';
        _html += '<p>Last updated: '+ h +':'+m+'</p>';
        _html += '<p class="msg">'+getMsg(w.temp, w.currently, getDaytime())+'</p>';

//        console.log(w)

        var that = this;
        var animID =setTimeout(function(){
            animate(_html,icon.eq(index));
        },10);
    }

    function showForecast(){

         var i,
             f = local_forecast.list,
             d = new Date(f[0].dt_txt).getDay(),
             fdays = [[]],
             dayCount = 0;

        fdays[0].day = days[d];
        fdays[0].temp = [f[0].main.temp];
        fdays[0].desc = f[0].weather[0].description;
        fdays[0].id = f[0].weather[0].id;

        for (i=1;i< f.length;i++){
             d = new Date(f[i].dt_txt).getDay();
//            console.log(days[d]!=fdays[dayCount])
             if (days[d]!==fdays[dayCount].day) {
                 fdays.push([]);
                 dayCount++;
                 fdays[dayCount].day = days[d];
                 fdays[dayCount].temp = [f[i].main.temp];
                 fdays[dayCount].desc = f[i].weather[0].description;
                 fdays[dayCount].id = f[i].weather[0].id;
             }
             else {
                 fdays[dayCount].temp.push(f[i].main.temp);
                if (fdays[dayCount].temp.length==5) {
                    fdays[dayCount].desc =f[i].weather[0].description;
                    fdays[dayCount].id =f[i].weather[0].id;
                }
             }
        }

         //set min max
        for (i=0;i<fdays.length;i++){
            fdays[i].max = Math.round(arrayMax(fdays[i].temp));
            fdays[i].min= Math.round(arrayMin(fdays[i].temp));

            fdays[i].day = fdays[i].day.slice(0,3);
        }


        if (fdays.length==5){
            fdays.splice(0,0,[]);
            fdays[0].day ='today';
            fdays[0].temp=[weatherData.temp];
            fdays[0].desc ="&nbsp;";
            fdays[0].id = weatherData.code;
            fdays[0].max = weatherData.temp;
            fdays[0].min = weatherData.temp;
        }
        else {
            fdays[0].day ="today"
        }


        var icon,
            $forecast = $('.forecast'),
            words = BLEAK_MSG[BLEAK_MSG.length-1].forecast;

        $forecast.empty();
        $forecast.append($('<div>', {class: 'close'}));
        $forecast.toggleClass('night',!getDaytime());


        for (i=0;i<fdays.length;i++){
            var c = i ? 'day col'+i : 'today day col'+i;
            $forecast.append($('<div>', {class: c}));
            icon = $('.'+ fdays[i].id, $icon)[0].outerHTML;
            $('.col'+i,$forecast).append(icon);
            $('.col'+i,$forecast).append("<div class='spcr'><div class='line'></div></div>");
            if (!i) $('.col'+i,$forecast).append("<p class='highlow'>"+ fdays[i].max +"</p>");
            else $('.col'+i,$forecast).append("<p class='highlow'>"+ fdays[i].max +"/"+ fdays[i].min +"</p>");
            $('.col'+i,$forecast).append("<p class='desc'>"+ fdays[i].desc +"</p>");
            $('.col'+i,$forecast).append("<p class='bleak'>"+ words[Math.round((words.length-1)*Math.random())] +"</p>");
            $('.col'+i,$forecast).append("<p class='weekday'>"+ fdays[i].day +"</p>");
        }

        $('svg',$forecast).css({display:'inline-block', height: 115,marginTop:0,'opacity':1});


        $('.close',$forecast).click(toggleForecast);
        $('.dimmer').click(toggleForecast);

        $forecast.css({'opacity':0}).toggleClass('visible', false);
        $forecast.hide();
//        console.log(fdays, f)

    }

    function toggleForecast(){

        if (!local_forecast) return;

        var $forecast = $('.forecast'),
            $dim = $('.dimmer');

        if (!$forecast.hasClass('visible')){
            var clr = $forecast.hasClass('night') ? '#00082A' : '#fff';
            $forecast.css({'background':clr}).show();

            $('.close',$forecast).show();
            $('svg',$forecast).css({display:'inline-block'});

            TweenLite.set($forecast,{'opacity':0});
            TweenLite.to($forecast,.4,{'opacity':1});
            $forecast.toggleClass('visible', true);

            $dim.show();
            TweenLite.set($dim,{'opacity':0});
            TweenLite.to($dim,.4,{'opacity':1});


            //animate in
            $('.day',$forecast).each(function(i){
                $(this).css({'opacity':0, paddingLeft:20});
                TweenLite.to($(this),.6,{'opacity':1, paddingLeft:0, delay:(i *.1)});
            });

        }
        else{
            $forecast.fadeOut(400,function(){
                $forecast.hide();
                $forecast.toggleClass('visible', false);
                setSVGsize();

                TweenLite.to($dim,.4,{'opacity':0, onComplete: function(){$dim.hide()}});
            });
        }


    }

    function showDummy(){
        if(splashVisible){
            $('.splash').fadeOut(500);
            splashVisible = false;
        }

        if ($intro){
            $intro.fadeOut(500);
            $intro=null;
            whereVisible = false;
        }
        else{
            $icon.fadeOut(600);
            $weather.fadeOut(600);
        }

        forecastVisible = false;


        //var w = weatherData;
        var icon = $('.climacon_cloudDrizzleSun', $icon);
        var index = 0;

        var t = new Date();
        var d = t.getDay();
        var u = t.getHours()+":"+ t.getMinutes();

        var _html = '<p>today is <span class="teal">'+days[d]+'</span></p>'
        _html += '<h3>???</h3>';
        _html += '<p>probably pretty close to yesterday</p>';
        _html += '<p>99 problems</p>';
        _html += '<p>here, now</p>';
        _html += '<p>Last updated: '+u+'</p>';
        _html += '<p class="msg">Sometimes You just can\'t get what you want</p>';

//        console.log(w)

        var animID =setTimeout(function(){
            animate(_html,icon.eq(index));
        },1000);

    }

    /**********************
     *
     *  user input
     *
     **********************/

    function onSubmitWhere() {
        user_location =  $('input',$intro).val();

        if (!user_location || user_location=='undefined'){
          console.log('nothin')
           // localStorage.removeItem("bleak_location");
           // start();
            return;
        }
        $intro.fadeOut(600);
        localStorage.setItem("bleak_location", user_location);
        loadWeather(user_location);
    }

    function askForLocation(){
        whereVisible = true;
        $intro = $('.intro');

        $('.error').hide();
        $el.show();

        if ($icon) $icon.fadeOut(400);
        if ($weather) $weather.fadeOut(400);

        $intro.delay(200).fadeIn(400,function(){
            $('input',$intro).focus()
        });

//        $intro.show();
        $('input',$intro).val('').focus();

        if ($el.hasClass('night')) {
            $('p',$intro).css({color:'#fff'})
            $('input',$intro).css({borderColor:'#fff'})

        }
        else {
            $('p',$intro).css({color:'#000'})
            $('input',$intro).css({borderColor:'#000'})
        }
    }

    /**********************
     *
     *  weather checks
     *
     **********************/

    function getDaytime(){

        var t = new Date(),
            time_mins = (t.getHours() *60) + t.getMinutes(),
            sunrise_arr = weatherData.sunrise.split(':'),
            sunrise_mins = (parseInt(sunrise_arr[0]) *60) + parseInt(sunrise_arr[1]),
            sunset_arr = weatherData.sunset.split(':'),
            sunset_mins = (parseInt(sunset_arr[0]) *60) + parseInt(sunset_arr[1]);

        return (time_mins >= sunrise_mins && time_mins < sunset_mins);
    }

    function getMsg(temp,current,daytime){
        var txt = "Like you inside, miserable.",
            msgs = BLEAK_MSG,
            cond = getWeatherCond(current,daytime);

        for (var p in msgs){
            if (temp >= msgs[p].low && temp<msgs[p].high){
                var r = Math.floor(msgs[p][cond].length * Math.random());
                if (msgs[p][cond][r]!='undefined') return msgs[p][cond][r];
            }
        }

        return txt;
    }

    function getWeatherCond(current,daytime){

        var cond = "other";

        current = String(current).toLowerCase();

        if (String(current).indexOf('sunny')>-1) cond="sunny";
        else if (String(current).indexOf('rain')>-1
            || String(current).indexOf('snow')>-1
            || String(current).indexOf('showers')>-1
            || String(current).indexOf('storm')>-1
            || String(current).indexOf('hail')>-1
            || String(current).indexOf('sleet')>-1
            || String(current).indexOf('hurricane')>-1
            || String(current).indexOf('drizzle')>-1
            ) cond="precipitation";

        //night check
        if (!daytime) cond="night";

        return cond;
    }

    function setSVGsize(){
        var wh = $(window).innerHeight(),
            h = wh*.5,
            t= wh*.225;

        $(".wrapper svg").css({marginTop:t,'height':h});
    }

    function arrayMin(arr) {
        var len = arr.length, min = Infinity;
        while (len--) {
            if (arr[len] < min) {
                min = arr[len];
            }
        }
        return min;
    };

    function arrayMax(arr) {
        var len = arr.length, max = -Infinity;
        while (len--) {
            if (arr[len] > max) {
                max = arr[len];
            }
        }
        return max;
    };



    function onResize(){
        setSVGsize();
    }

});