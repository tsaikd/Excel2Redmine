app

.factory("Config"
	, [       "$rootScope", "localStorageService"
	, function($scope,       localStorageService) {

	if ($scope.Config) {
		return $scope.Config;
	}

	var defConf = {
		apikey: "",
		url: "http://localhost"
	};

	function Config() {}

	$scope.Config = new Config();

	angular.forEach(defConf, function(value, key) {
		$scope.Config[key] = localStorageService.get(key) || value;
		$scope.$watch("Config." + key, function() {
			if ($scope.Config[key] === value) {
				localStorageService.remove(key);
			} else {
				localStorageService.set(key, $scope.Config[key]);
			}
		});
	});

	return $scope.Config;
}])

;
