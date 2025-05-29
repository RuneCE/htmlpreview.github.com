(function () {
    
    var previewForm = document.getElementById('previewform');

    // Get the URL from the query string.
    // For GitHub URLs, transform them to raw.githubusercontent.com.
    var url = location.search.substring(1)
              .replace(/\/\/github\.com/, '//raw.githubusercontent.com')
              .replace(/\/blob\//, '/');

    var replaceAssets = function () {
        var frame, a, link, links = [], script, scripts = [], i, href, src;
        
        // Do nothing for framesets because document.write() will erase things.
        if (document.querySelectorAll('frameset').length)
            return;
        
        // Process frames (iframe and frame elements).
        frame = document.querySelectorAll('iframe[src],frame[src]');
        for (i = 0; i < frame.length; ++i) {
            src = frame[i].src; // Get absolute URL
            // Check if the URL comes from GitHub, Bitbucket, or Discord.
            if (src.indexOf('//raw.githubusercontent.com') > 0 ||
                src.indexOf('//bitbucket.org') > 0 ||
                src.indexOf('discordapp.com') > 0) {
                // Rewrite the source URL so it loads using the CORS proxy.
                frame[i].src = '//' + location.hostname + location.pathname + '?' + src;
            }
        }
        
        // Process anchor links.
        a = document.querySelectorAll('a[href]');
        for (i = 0; i < a.length; ++i) {
            href = a[i].href;
            if (href.indexOf('#') > 0) {
                // For anchors, rewrite to support empty anchors.
                a[i].href = '//' + location.hostname + location.pathname + location.search + '#' + a[i].hash.substring(1);
            } else if (
                (href.indexOf('//raw.githubusercontent.com') > 0 ||
                 href.indexOf('//bitbucket.org') > 0 ||
                 href.indexOf('discordapp.com') > 0) &&
                (href.indexOf('.html') > 0 || href.indexOf('.htm') > 0)
            ) {
                // For links to other HTML pages on these hosts, rewrite URL through the proxy.
                a[i].href = '//' + location.hostname + location.pathname + '?' + href;
            }
        }
        
        // Process stylesheets.
        link = document.querySelectorAll('link[rel=stylesheet]');
        for (i = 0; i < link.length; ++i) {
            href = link[i].href;
            if (href.indexOf('//raw.githubusercontent.com') > 0 ||
                href.indexOf('//bitbucket.org') > 0 ||
                href.indexOf('discordapp.com') > 0) {
                links.push(fetchProxy(href, null, 0));
            }
        }
        Promise.all(links).then(function (res) {
            for (i = 0; i < res.length; ++i) {
                loadCSS(res[i]);
            }
        });
        
        // Process scripts. Scripts using type="text/htmlpreview" are loaded via proxy.
        script = document.querySelectorAll('script[type="text/htmlpreview"]');
        for (i = 0; i < script.length; ++i) {
            src = script[i].src;
            if (src.indexOf('//raw.githubusercontent.com') > 0 ||
                src.indexOf('//bitbucket.org') > 0 ||
                src.indexOf('discordapp.com') > 0) {
                scripts.push(fetchProxy(src, null, 0));
            } else {
                script[i].removeAttribute('type');
                scripts.push(script[i].innerHTML);
            }
        }
        Promise.all(scripts).then(function (res) {
            for (i = 0; i < res.length; ++i) {
                loadJS(res[i]);
            }
            // Dispatch a fake DOMContentLoaded event after scripts are loaded.
            document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
        });
    };

    var loadHTML = function (data) {
        if (data) {
            // Inject a <base> tag in the <head> so that relative URLs work,
            // and replace script tags to use a temporary type.
            data = data.replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
                       .replace(/<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi, '<script type="text/htmlpreview"$1');
            setTimeout(function () {
                document.open();
                document.write(data);
                document.close();
                replaceAssets();
            }, 10);
        }
    };

    var loadCSS = function (data) {
        if (data) {
            var style = document.createElement('style');
            style.innerHTML = data;
            document.head.appendChild(style);
        }
    };

    var loadJS = function (data) {
        if (data) {
            var script = document.createElement('script');
            script.innerHTML = data;
            document.body.appendChild(script);
        }
    };

    // This function fetches data from a URL using a proxy if needed.
    var fetchProxy = function (url, options, i) {
        var proxy = [
            '', // try fetching without a proxy first.
            'https://api.codetabs.com/v1/proxy/?quest=' // second option using CodeTabs proxy.
        ];
        return fetch(proxy[i] + url, options).then(function (res) {
            if (!res.ok)
                throw new Error('Cannot load ' + url + ': ' + res.status + ' ' + res.statusText);
            return res.text();
        }).catch(function (error) {
            if (i === proxy.length - 1)
                throw error;
            return fetchProxy(url, options, i + 1);
        });
    };

    // If a valid URL is provided and it’s not already on our domain, fetch and load it;
    // otherwise, show the preview form (for error messages, etc.).
    if (url && url.indexOf(location.hostname) < 0)
        fetchProxy(url, null, 0).then(loadHTML).catch(function (error) {
            console.error(error);
            previewForm.style.display = 'block';
            previewForm.innerText = error;
        });
    else
        previewForm.style.display = 'block';

})();
