import NavigationController from "common-ui/controllers/_NavigationController";
import widgetIndex from "widgetIndex";

window.metadata = {
    app_title : "Fireball Demo",
    views : {
        demo : {
            triggers : ["_startup_"],
            title : "Welcome",
            widgets : {
                helloWorld : {
                    index : 2,
                    widgetProperties : {
                        title : "Hello World"
                    },
                    widgetType : "TitleBar"
                }
            }
        }
    }
};

let app = new NavigationController({

    appConfig : JSON.stringify({
        appModuleName : "demo",
        projectContext : "demo"
    })
});

