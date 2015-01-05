app

.factory("Version"
	, [       "$http"
	, function($http) {

	function Version() {
		var $scope = this;
		$scope.version = "0";
		if ($scope.version == "0") {
			$http.get("package.json").then(function(data) {
				if (data && data.data && data.data.version) {
					$scope.version = data.data.version + "-dev";
				}
			});
		}
		return $scope;
	}

	Version.prototype.toString = function() {
		var $scope = this;
		return $scope.version;
	};

	return new Version();
}])

;
