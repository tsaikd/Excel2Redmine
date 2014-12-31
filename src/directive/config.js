app

.controller("configCtrl"
	, [       "$scope", "$state", "$stateParams", "Config"
	, function($scope,   $state,   $stateParams,   Config) {

	$scope.Config = Config;

	angular.forEach(["apikey", "url"], function(key) {
		if ($stateParams[key]) {
			Config[key] = $stateParams[key];
		}
	});

	if ($stateParams["redirect"]) {
		$state.go($stateParams["redirect"]);
	}

}])

;
