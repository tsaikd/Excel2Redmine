app

.config([     "$stateProvider", "$urlRouterProvider"
	, function($stateProvider,   $urlRouterProvider) {

	$urlRouterProvider.otherwise("/");

	$stateProvider
		.state("index", {
			url: "/",
			templateUrl: "src/directive/index.html",
			controller: "indexCtrl"
		})
		.state("config", {
			url: "/config?url&apikey&redirect",
			templateUrl: "src/directive/config.html",
			controller: "configCtrl"
		})
	;

}])

;
