/*********************************************
Data source
*********************************************/

function getDataSource(source, isasync, user) {
    if (source == "")
        throw "Source is null";

    if (!isasync)
        isasync = false;

    var list = [];

    if (source.startsWith("url:")) {
        var url = source.replace("url:", "");

        if (user) {
            $.ajaxSetup({
                async: isasync,
                headers: {
                    "Authorization": "Bearer " + user.access_token
                }
            });
        }
        else {
            $.ajaxSetup({
                async: isasync
            });
        }

        $.getJSON(url, function (data) {
            list = data;
        })
    }
    else {
        list = eval(source);
    }

    return list;
}

function findItem(array, property, filter) {
    if (array == null || array == undefined)
        return null;

    var result = null;

    $.each(array, function (index, item) {
        if (item[property] == filter) {
            result = item;
            return;
        }
    });

    return result;
}

function getGravatarUrl(email) {
    $email = trim(email);
    $email = strtolower($email);
    return "https://wwww.gravatar.com/avatar/" + $.md5($email);
}
$(window).on("load", function () {

    var body = $("body");
    var identityServerAuthority = body.attr("data-identityserver-authority");

    if (identityServerAuthority == null || identityServerAuthority == undefined || identityServerAuthority == '') {
        identityServerAuthority = "http://localhost:5000";
    }

    window.identityServerAuthority = identityServerAuthority;

    var identityServerClientId = body.attr("data-identityserver-clientId");

    if (identityServerClientId == null || identityServerClientId == undefined || identityServerClientId == '') {
        identityServerClientId = "IdentityServer.Web.AdminUI";
    }

    window.identityServerClientId = identityServerClientId;

    var identityServerResponseType = body.attr("data-identityserver-responseType");

    if (identityServerResponseType == null || identityServerResponseType == undefined || identityServerResponseType == '') {
        identityServerResponseType = "id_token token";
    }

    window.identityServerResponseType = identityServerResponseType;

    var identityServerScopes = body.attr("data-identityserver-scopes");

    if (identityServerScopes == null || identityServerScopes == undefined || identityServerScopes == '') {
        identityServerScopes = "openid profile";
    }

    window.identityServerScopes = identityServerScopes;

    var datasource = body.attr("data-userprofile-sourceurl");

    if (datasource == null || datasource == undefined || datasource == "")
        datasource = window.location.host + "/api/user";

    window.userprofiledatasourceurl = datasource;

    var pagedatasource = body.attr('data-page-source');

    window.pagedatasource = pagedatasource;

    var autosigin = body.attr("data-auto-sigin");

    if (autosigin == null || autosigin == undefined || autosigin == "")
        autosigin = "false";

    window.IsUserAutoSigin = autosigin;

    var config = {
        authority: identityServerAuthority,
        client_id: identityServerClientId,
        redirect_uri: window.location.origin + "/callback.html",
        response_type: identityServerResponseType,
        scope: identityServerScopes,
        post_logout_redirect_uri: window.location.origin + "/index.html",
    };

    window.mgr = new Oidc.UserManager(config);

    mgr.getUser().then(function (user) {
        var userprofile = null;
        var isAuthenticate = false;

        if (user) {
            window.user=user;
            $.ajax({
                url: window.location.origin + (window.pagedatasource != null && window.pagedatasource != undefined ? window.pagedatasource : window.userprofiledatasourceurl),
                type: "GET",
                async: false,
                headers: {
                    "Authorization": "Bearer " + user.access_token
                }
            }).done(function (data) {
                isAuthenticate = true;

                if (window.pagedatasource) {
                    userprofile = data.userProfile;
                    window.pageData = data;
                }
                else {
                    userprofile = data;
                }

                $(document).trigger("User.IsAuthenticated", {
                    IsAuthenticate: isAuthenticate,
                    User: user,
                    UserProfile: userprofile
                });

                }).fail(function (jqXHR, textStatus) {
                    alert(jqXHR.statusText);
            });
        }
        else {
            isAuthenticate = false;
            userprofile = null;
            if (window.IsUserAutoSigin == "true") {
                window.mgr.signinRedirect();
            }
        }
    });
})

$(document).ready(function () {
    $(document).on("User.IsAuthenticated", function (e, profile) {
        $('#splashscreen').hide();
    });
})
/*************************************************/
/*breadcrumb                                     */
/************************************************/
Slim.tag('startpoint-breadcrumb', class extends Slim {
    get template() {
        return '<ol class="breadcrumb"></ol>';
    }

    onCreated() {
        var container = $(this);

        $(document).on("User.IsAuthenticated", function (e, profile) {
            var user = profile.User;
            var datasource = container.attr('data-datasource');
            var data = getDataSource(datasource, false, user);
            if (data) {
                var ol = container[0].firstChild;
                addItem(ol, "index.html", data.home.label);

                if (data.section) {
                    addItem(ol, data.section.url, data.section.label);

                    var li = addItem(ol, data.link.url, data.link.label);
                    li.addClass("active");

                    if (data.section.items) {
                        var liItems = $(`<li class="breadcrumb-menu d-md-down-none">
                            <div class="btn-group" role="group" aria-label="Button group with nested dropdown"></div>
                            </li>`);

                        $.each(data.section.items, function (index, item) {
                            var a = $('<a class="btn btn-secondary" href="' + item.url + '"><i class="' + item.icon + '"> &nbsp;' + item.label + '</i></a>');
                            a.appendTo(liItems);
                        });

                        liItems.appendTo(ol);
                    }
                }
            }
        });

    }
})

function addItem(container, url, label) {
    var li = $('<li class="breadcrumb-item"></li>');
    var a = $('<a href="' + url + '">' + label + '</a>');
    a.appendTo(li);
    li.appendTo(container);
    return li;
}
/*************************************************/
/*Nav-items                                      */
/************************************************/
Slim.tag('startpoint-navitems', class extends Slim {
    onBeforeCreated() {
        this.datasource = this.getAttribute("data-datasource");

        this.navitem_linkclass = this.getAttribute("data-link-class");
        this.navitem_linkItemClass = this.getAttribute("data-listitem-class");
        this.navitem_containerId = this.getAttribute("data-parentid");
        this.navitem_linkUrl = this.getAttribute("data-linkUrl");
        this.navitem_linkTitle = this.getAttribute("data-linkTitle");

        if (this.navitem_linkclass == "")
            this.navitem_linkclass = "nav-link";

        if (this.navitem_linkItemClass == "")
            this.navitem_linkItemClass = "nav-item px-3";

        if (this.datasource == "")
            this.datasource = "url:api/navigation/sections";
    }

    get template() {
        return '';
    }

    onCreated() {
        var container = $(this);
        var parent = $("#" + this.navitem_containerId);
        var linkClass = this.navitem_linkclass;
        var linkItemClass = this.navitem_linkItemClass;
        var linkUrl = this.navitem_linkUrl;
        var linkTitle = this.navitem_linkTitle;

        $(document).on("User.IsAuthenticated", function (e, profile) {
            var datasource = container.attr('data-datasource');
            this.sections = getDataSource(datasource, false, profile.User);
            $.each(this.sections, function (index, section) {
                var li = $('<li class="' + linkClass + '"><a class="' + linkItemClass + '" href="' + section[linkUrl] + '">' + section[linkTitle] + '</a></li>');
                parent.append(li);
            });
        })
    }
})
/*************************************************/
/* Notifications                                 */
/************************************************/
Slim.tag('startpoint-notifications', class extends Slim {
    onBeforeCreated() {
        this.datasource = this.getAttribute("data-datasource");

        this.notifications_linkclass = this.getAttribute("data-link-class");
        this.notifications_linkItemClass = this.getAttribute("data-listitem-class");
        this.notifications_containerId = this.getAttribute("data-parentid");
        this.notifications_linkUrl = this.getAttribute("data-linkUrl");
        this.notifications_linkTitle = this.getAttribute("data-linkTitle");

        if (this.notifications_linkclass == "")
            this.notifications_linkclass = "nav-link";

        if (this.notifications_linkItemClass == "")
            this.notifications_linkItemClass = "nav-item px-3";

        if (this.datasource == "")
            this.datasource = "url:api/notifications";
    }

    get template() {
        return '';
    }

    onCreated() {
        var parent = $(this);

        var datasource = this.datasource;
        var linkClass = this.notifications_linkclass;
        var linkItemClass = this.notifications_linkItemClass;
        var linkUrl = this.notifications_linkUrl;
        var linkTitle = this.notifications_linkTitle;

        $(document).on("User.IsAuthenticated", function (e, profile) {

            var notifications = getDataSource(datasource, false, profile.user);

            $.each(notifications, function (index, notification) {
                if (notification.isEnabled || notification.visisbleIfDisabled) {
                    var icon = "";

                    if (notification.isEnabled) {
                        if (notification.tracker.iconIfEnabled != null && notification.tracker.iconIfEnabled != undefined && notification.tracker.iconIfEnabled != "") {
                            icon = '<img src="' + notification.tracker.iconIfEnabled + '"/>';
                        } else {
                            icon = '<i class="' + notification.tracker.cssClassIfEnable + '"></i>';
                        }
                    }
                    else {
                        if (notification.tracker.iconIfDisabled != null && notification.tracker.iconIfDisabled != undefined && notification.tracker.iconIfDisabled != "") {
                            icon = '<img src="' + notification.tracker.iconIfDisabled + '"/>';
                        } else {
                            icon = '<i class="' + notification.tracker.cssClassIfDisabled + '"></i>';
                        }
                    }

                    var content = icon;

                    if (notification.count != null && notification.count != undefined && notification.count > 0) {
                        content = content + '<span class="badge badge-pill badge-danger">' + notification.count + '</span>';
                    }

                    var html = '<li class="' + linkClass + '"><a class="' + linkItemClass + '"';

                    if (notification.tracker.linkUrl != null && notification.tracker.linkUrl != undefined && notification.tracker.linkUrl != "") {
                        html = html + 'href="' + notification.tracker.linkUrl + '"';
                    } else {
                        html = html + 'href="#"';
                    }

                    html = html + '>' + content + '</a></li>';

                    var li = $(html);

                    parent.prepend(li);
                }
            });

        });
    }
})
/*************************************************/
/*side bar                                       */
/************************************************/
Slim.tag('startpoint-sidebar', class extends Slim {
    onBeforeCreated() {
        this.datasource = this.getAttribute("data-datasource");
        this.sidebarclass = this.getAttribute("data-sidebar-class");
        this.navcalss = this.getAttribute("data-nav-class");
        this.ulclass = this.getAttribute("data-ul-class");
        this.liclass = this.getAttribute("data-li-class");
        this.navlinkclass = this.getAttribute("data-nav-link-class");
        this.linkdropdownclass = this.getAttribute("data-nav-link-dropdown-class");
        this.linkdropdownnavclass = this.getAttribute("data-nav-dropdown-class");
        this.linkdropdownnavitemclass = this.getAttribute("data-nav-link-dropdown-items-class");
        this.linkdropdownnavitemlinkclass = this.getAttribute("data-nav-dropdown-nav-item-class");
        this.linkdropdownnavitemlinkitemclass = this.getAttribute("data-nav-dropdown-nav-item-link-class");

        if (!this.datasource)
            this.datasource = "api/navigation/sidebar";

        if (!this.sidebarclass)
            this.sidebarclass = "sidebar";

        if (!this.navcalss)
            this.navcalss = "sidebar-nav";

        if (!this.ulclass)
            this.ulclass = "nav";

        if (!this.liclass)
            this.liclass = "nav-item";

        if (!this.navlinkclass)
            this.navlinkclass = "nav-link";

        if (!this.linkdropdownclass)
            this.linkdropdownclass = "nav-item nav-dropdown";

        if (!this.linkdropdownnavclass)
            this.linkdropdownnavclass = "nav-link nav-dropdown";

        if (!this.linkdropdownnavitemclass)
            this.linkdropdownnavitemclass = "nav-dropdown-items";

        if (!this.linkdropdownnavitemlinkclass)
            this.linkdropdownnavitemlinkclass = "nav-item";

        if (!this.linkdropdownnavitemlinkitemclass)
            this.linkdropdownnavitemlinkitemclass = "nav-link";
    }

    get template() {
        return `<div class="sidebar sidebar-menu">
            <nav class="sidebar-nav">
            </nav>
        </div>`;
    }

    onCreated() {
        var container = $(this);
        var datasource = this.datasource;
        var cssOptions = {
            sidebarclass: this.sidebarclass,
            navcalss: this.navcalss,
            ulclass: this.ulclass,
            liclass: this.liclass,
            navlinkclass: this.navlinkclass,
            linkdropdownclass: this.linkdropdownclass,
            linkdropdownnavclass: this.linkdropdownnavclass,
            linkdropdownnavitemclass: this.linkdropdownnavitemclass,
            linkdropdownnavitemlinkclass: this.linkdropdownnavitemlinkclass,
            linkdropdownnavitemlinkitemclass: this.linkdropdownnavitemlinkitemclass
        };

        $(document).on("User.IsAuthenticated", function (e, profile) {
            var user = profile.User;
            var data = getDataSource(datasource, false, user);

            var ul = $('<ul class="nav"></ul>');

            /************************/
            /*add a section         */
            /************************/
            $.each(data.sections, function (index, section) {
                addSection(cssOptions, section, ul);
            });

            ul.appendTo($('.sidebar-nav'));
        });
    };
});

function addSection(cssOptions, section, ul) {
    var li = $('<li class="nav-section"></li>');

    /************************
     * section header       *
     ************************/

    var menuid = 'menu_' + section.normalizedName;

    var a = addHref(cssOptions, section.label, section.icon, section.badgeClass, section.badgeLabel, li);
    a.attr('data-toggle', 'collapse');
    a.attr('data-target', '#' + menuid);
    a.addClass('navbar-toggle');

    /************************
     * section items        *
     ************************/

    var ulLinks = $('<ul class="nav-items collapse" id="' + menuid + '">');

    $.each(section.links, function (index, link) {
        addLink(cssOptions, section, link, ulLinks);
    })

    ulLinks.appendTo(li);

    li.appendTo(ul);
}

function addLink(cssOptions, section, link, ul) {
    var li = $('<li class="nav-item"></li>');
    var a = addHref(cssOptions, link.label, link.icon, link.badgeClass, link.badgeLabel, li);
    a.attr('href', section.normalizedName + '/' + link.normalizedName);
    li.appendTo(ul);
}

function addHref(cssOptions, label, icon, badgeCss, badgeText, li) {
    var a = $('<a></a>');

    if (icon) {
        var i = $('<i class="' + icon + '"></i>');
        i.appendTo(a);
    }

    a.append($('<span>' + label + '</span>'));

    if (badgeCss) {
        var badge = $('<span class="' + badgeCss + '"> ' + (badgeText != null && badgeText != undefined ? badgeText : "") + '</span>');
        badge.appendTo(a);
    }

    a.appendTo(li);

    return a;
}
/*************************************************/
/*Tenant-icon                                   */
/************************************************/
Slim.tag('startpoint-logo', class extends Slim {
    get template() {
        return '<a class="navbar-brand" href="#"><img src="tenant/logo" class="navbar-brand-icon" style="border:1;border-color:red" /></a>';
    }
})
/*************************************************/
/*User menu                                     */
/************************************************/
Slim.tag('startpoint-usermenu', class extends Slim {
    onBeforeCreated() {
        this.liclass = this.getAttribute("data-li-class");

        if (this.liclass == null || this.liclass == undefined || this.liclass == '') {
            this.liclass = "nav-item dropdown";
        }

        this.userlinkclass = this.getAttribute("data-user-link-class");

        if (this.userlinkclass == null || this.userlinkclass == undefined || this.userlinkclass == '') {
            this.userlinkclass = "nav-link dropdown-toggle nav-link";
        }

        this.dropdownclass = this.getAttribute("data-dropdown-menu-class");

        if (this.dropdownclass == null || this.dropdownclass == undefined || this.dropdownclass == '') {
            this.dropdownclass = "dropdown-menu dropdown-menu-right";
        }

        this.dropdownheader = this.getAttribute("data-dropdown-header-class");

        if (this.dropdownheader == null || this.dropdownheader == undefined || this.dropdownheader == '') {
            this.dropdownheader = "dropdown-header text-center";
        }

        this.dropdownitem = this.getAttribute("data-dropdown-item-class");

        if (this.dropdownitem == null || this.dropdownitem == undefined || this.dropdownitem == '') {
            this.dropdownitem = "dropdown-item";
        }
    }

    get template() {
        return '<li class="[[liclass]]"><a href="#" id="button_login"><i class="fa fa-signin"></i>&nbsp; sign-in</a></li>';
    }

    onCreated() {
        var container = $(this);
        var datasource = this.datasource;
        var dropdownclass = this.dropdownclass;
        var dropdownheader = this.dropdownheader;
        var dropdownitem = this.dropdownitem;
        var userlinkclass = this.userlinkclass;
        var liclass = this.liclass;

        $(document).on("User.IsAuthenticated", function (e, profile) {
            var user = profile.User;

            var login = findItem(profile.UserProfile.items, "key", "Name").value;
            var picture = findItem(profile.UserProfile.items, "key", "picture").value;
            var preferred_username = findItem(profile.UserProfile.items, "key", "preferred_username").value;

            var parent = $('<li class="' + liclass + '"></li>');

            parent.append('<a class="' + userlinkclass + '" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false"><img src="' + picture + '" class="img-avatar" alt="' + login + '"><span class="d-md-down-none user-prefered-name">' + preferred_username + '</span></a>');

            addUserMenu(profile.UserProfile, parent, dropdownclass, dropdownheader, dropdownitem);

            parent.replaceAll(container);
        });

    }
})


function addUserMenu(data, parent, dropdownclass, dropdownheader, dropdownitem) {

    var menu = $('<div class="' + dropdownclass + '"></div>');

    var prefered_display_name = "";
    var gravatar = "";

    $.each(data.sections, function (x, section) {
        menu.append('<div class="' + dropdownheader + '"><strong>' + section.label + '</strong></div>');
        $.each(data.items, function (i, item) {
            if (item.section == section.key && item.isVisible == true) {
                if (item.key != "preferred_username" && item.key != "picture")
                    if (item.notificationType == "extended") {
                        var profile = $.parseJSON(item.value);
                        if (profile.IsBadgeVisible) {
                            menu.append('<a class="' + dropdownitem + '" href="#">' + (profile.IconClass != null ? '<i class="' + profile.IconClass + '"></i>' : "") + profile.Label + (profile.BadgeValue != null ? ' : <span class="badge badge-default">' + profile.BadgeValue : "</span>") + '</a>');
                        }
                        else {
                            menu.append('<a class="' + dropdownitem + '" href="#">' + (profile.IconClass != null ? '<i class="' + profile.IconClass + '"></i>' : "") + profile.Label + '</a>');
                        }
                    }
                    else
                        menu.append('<a class="' + dropdownitem + '" href="#">' + item.label + ' : ' + item.value + '</a>');
            }
        });
        menu.append('<div class="divider"></div>');
    });

    menu.append('<a class="dropdown-item" href="#" id="button-logout"><i class="fa fa-lock"></i> Logout</a>');
    parent.append(menu);
}

$(document).ready(function () {
    $("#button_login").click(function (e) {
        e.preventDefault();
        mgr.signinRedirect();
        return false;
    });

    $("#button-logout").click(function (e) {
        e.preventDefault();
        mgr.signoutRedirect();
        return false;
    });
});