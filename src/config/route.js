app

.config([     "$stateProvider", "$urlRouterProvider"
	, function($stateProvider,   $urlRouterProvider) {

	$urlRouterProvider.otherwise("/");

	var configParams = [
		"url",
		"apikey",
		"checkRedmineCustomFieldListInClient",
		"defFieldVal",
		"defCustomFieldVal",
		"redirect"
	];

	$stateProvider
		.state("index", {
			url: "/",
			templateUrl: "src/directive/index.html",
			controller: "indexCtrl"
		})
		.state("config", {
			url: "/config?" + configParams.join("&"),
			templateUrl: "src/directive/config.html",
			controller: "configCtrl"
		})
	;

}])

;
