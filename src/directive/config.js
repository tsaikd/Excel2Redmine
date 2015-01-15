app

.controller("configCtrl"
	, [       "$scope", "$state", "$stateParams", "Config"
	, function($scope,   $state,   $stateParams,   Config) {

	$scope.Config = Config;

	function ensureArrayNotEmpty(arrCheck, elem) {
		if (arrCheck.length < 1) {
			arrCheck.push(elem);
		}
	}

	ensureArrayNotEmpty(Config.defFieldVal, {});
	ensureArrayNotEmpty(Config.defCustomFieldVal, {});
	ensureArrayNotEmpty(Config.checkIssueFields, "");
	ensureArrayNotEmpty(Config.checkIssueCustomFields, "");

	angular.forEach(Config.defConf, function(value, key) {
		if ($stateParams[key]) {
			if ($stateParams[key].match(/^\[.*\]$/)) {
				Config[key] = JSON.parse($stateParams[key]);
			} else {
				Config[key] = $stateParams[key];
			}
		}
	});

	$scope.addFieldVal = function($event, fieldVals, idx, elem) {
		fieldVals.splice(idx+1, 0, elem);
	};

	$scope.delFieldVal = function($event, fieldVals, idx, elem) {
		fieldVals.splice(idx, 1);
		ensureArrayNotEmpty(fieldVals, elem);
	};

	if ($stateParams["redirect"]) {
		$state.go($stateParams["redirect"]);
	}

}])

;
