app

.factory("Config"
	, [       "$rootScope", "localStorageService"
	, function($scope,       localStorageService) {

	if ($scope.Config) {
		return $scope.Config;
	}

	var defConf = {
		apikey: "",
		url: "http://localhost",
		checkRedmineCustomFieldListInClient: true,
		defFieldVal: [
		/*
			{
				field: "",
				value: ""
			}
		*/
		],
		defCustomFieldVal: [
		/*
			{
				field: "",
				value: ""
			}
		*/
		],
		checkIssueFields: [
		/*
			"FIELD_NAME"
		*/
			"subject"
		],
		checkIssueCustomFields: [
		/*
			"FIELD_NAME"
		*/
		]
	};

	function Config() {}

	$scope.Config = new Config();

	Object.defineProperty($scope.Config, "defFieldValMap", {
		get: function() {
			var result = {};
			angular.forEach(this.defFieldVal, function(fieldVal) {
				if (fieldVal.field) {
					result[fieldVal.field] = fieldVal;
				}
			});
			angular.forEach(this.defCustomFieldVal, function(fieldVal) {
				if (fieldVal.field) {
					result[fieldVal.field] = fieldVal;
				}
			});
			return result;
		}
	});

	Config.prototype.getCheckIssueFields = function() {
		var result = angular.copy(this.checkIssueFields);
		result = result.map(function(field) {
			return field.trim();
		}).filter(function(field) {
			return !!field;
		});
		if (result.length < 1) {
			result = angular.copy(defConf.checkIssueFields);
		}
		return result;
	};

	Config.prototype.getCheckIssueCustomFields = function() {
		var result = angular.copy(this.checkIssueCustomFields);
		result = result.map(function(field) {
			return field.trim();
		}).filter(function(field) {
			return !!field;
		});
		return result;
	};

	angular.forEach(defConf, function(value, key) {
		$scope.Config[key] = angular.copy(localStorageService.get(key) || value);
		if (typeof($scope.Config[key]) !== typeof(value)) {
			switch (typeof(value)) {
			case "boolean":
				$scope.Config[key] = $scope.Config[key] == "true" ? true : false;
				break;
			case "number":
				$scope.Config[key] = +$scope.Config[key];
				break;
			}
		}
		$scope.$watch("Config." + key, function() {
			if (angular.equals($scope.Config[key], value)) {
				localStorageService.remove(key);
			} else {
				localStorageService.set(key, $scope.Config[key]);
			}
		}, true);
	});

	$scope.Config.defConf = defConf;

	return $scope.Config;
}])

;
