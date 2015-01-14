app

.controller("configCtrl"
	, [       "$scope", "$state", "$stateParams", "Config"
	, function($scope,   $state,   $stateParams,   Config) {

	$scope.Config = Config;

	if (Config.defFieldVal.length < 1) {
		Config.defFieldVal.push({});
	}
	if (Config.defCustomFieldVal.length < 1) {
		Config.defCustomFieldVal.push({});
	}

	angular.forEach(Config.defConf, function(value, key) {
		if ($stateParams[key]) {
			if ($stateParams[key].match(/^\[.*\]$/)) {
				Config[key] = JSON.parse($stateParams[key]);
			} else {
				Config[key] = $stateParams[key];
			}
		}
	});

	$scope.delFieldVal = function($event, fieldVals, idx) {
		fieldVals.splice(idx, 1);
		if (fieldVals.length < 1) {
			fieldVals.push({});
		}
	};

	$scope.addFieldVal = function($event, fieldVals) {
		fieldVals.push({});
	};

	if ($stateParams["redirect"]) {
		$state.go($stateParams["redirect"]);
	}

}])

;
